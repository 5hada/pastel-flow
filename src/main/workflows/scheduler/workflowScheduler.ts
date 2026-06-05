import {
  normalizeWorkflowSchedule,
  type WorkflowSchedule
} from '../../../shared/workflows'
import { canExecuteWorkflowOnDevice } from '../../../shared/devices/'
import type { AppSettingsStore } from '../../settings/store/appSettingsStore'
import type { DeviceStore } from '../../devices/store/deviceStore'
import type { WorkflowStore } from '../store/workflowStore'
import type { WorkflowRunner } from '../workflowRunner'

export type WorkflowScheduler = {
  start(): void
  stop(): void
}

export type WorkflowSchedulerOptions = {
  appSettingsStore: AppSettingsStore
  deviceStore: DeviceStore
  workflowRunner: WorkflowRunner
  workflowStore: WorkflowStore
}

export function createWorkflowScheduler({
  appSettingsStore,
  deviceStore,
  workflowStore,
  workflowRunner,
}: WorkflowSchedulerOptions): WorkflowScheduler {
  let interval: NodeJS.Timeout | null = null
  let isTicking = false

  async function tick(): Promise<void> {
    if (isTicking) {
      return
    }

    isTicking = true
    try {
      const [workflows, currentDevice, appSettingsSnapshot] = await Promise.all([
        workflowStore.listWorkflows(),
        deviceStore.getCurrentDevice(),
        appSettingsStore.getSnapshot(),
      ])
      const now = new Date()

      for (const workflow of workflows) {
        const schedule = normalizeWorkflowSchedule(workflow.schedule)

        if (
          !schedule?.enabled ||
          !canExecuteWorkflowOnDevice(
            workflow,
            currentDevice,
            appSettingsSnapshot.settings.linkedDevices,
          )
        ) {
          continue
        }

        const nextRunAt = schedule.nextRunAt
          ? new Date(schedule.nextRunAt)
          : new Date(workflow.updatedAt)

        if (Number.isNaN(nextRunAt.getTime()) || nextRunAt > now) {
          continue
        }

        await workflowStore.updateWorkflow(workflow.id, {
          schedule: {
            ...schedule,
            lastTriggeredAt: now.toISOString(),
            nextRunAt: getNextRunAt(now, schedule),
          },
        })
        void workflowRunner.runWorkflow(workflow.id, {
          actorType: 'schedule',
          actorId: currentDevice.id,
          triggerSource: 'schedule',
        })
      }
    } finally {
      isTicking = false
    }
  }

  return {
    start() {
      if (interval) {
        return
      }

      interval = setInterval(() => {
        void tick()
      }, 60_000)
      void tick()
    },
    stop() {
      if (!interval) {
        return
      }

      clearInterval(interval)
      interval = null
    },
  }
}

function getNextRunAt(date: Date, schedule: WorkflowSchedule): string {
  switch (schedule.mode) {
    case 'daily':
      return getNextWallClockRunAt(date, schedule.timeOfDay, [0, 1, 2, 3, 4, 5, 6])
    case 'weekly':
      return getNextWallClockRunAt(date, schedule.timeOfDay, schedule.daysOfWeek)
    case 'interval':
      return new Date(
        date.getTime() + schedule.intervalMinutes * 60_000,
      ).toISOString()
  }
}

function getNextWallClockRunAt(
  date: Date,
  timeOfDay = '09:00',
  daysOfWeek: number[] | undefined,
): string {
  const allowedDays =
    daysOfWeek && daysOfWeek.length > 0
      ? new Set(daysOfWeek)
      : new Set([date.getDay()])
  const [hour, minute] = timeOfDay.split(':').map(Number)

  for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
    const candidate = new Date(date)
    candidate.setDate(date.getDate() + dayOffset)
    candidate.setHours(hour, minute, 0, 0)

    if (candidate <= date || !allowedDays.has(candidate.getDay())) {
      continue
    }

    return candidate.toISOString()
  }

  return new Date(date.getTime() + 24 * 60 * 60_000).toISOString()
}
