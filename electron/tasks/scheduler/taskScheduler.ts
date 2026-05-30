import {
  canExecuteWorkflowOnDevice,
  normalizeTaskSchedule,
  type TaskSchedule,
} from '../../../src/shared/tasks'
import type { AppSettingsStore } from '../../settings/store/appSettingsStore'
import type { DeviceStore } from '../../devices/store/deviceStore'
import type { TaskStore } from '../store/taskStore'
import type { WorkflowRunner } from '../../workflows/runner/workflowRunner'

export type TaskScheduler = {
  start(): void
  stop(): void
}

export type TaskSchedulerOptions = {
  appSettingsStore: AppSettingsStore
  deviceStore: DeviceStore
  workflowRunner: WorkflowRunner
  taskStore: TaskStore
}

export function createTaskScheduler({
  appSettingsStore,
  deviceStore,
  taskStore,
  workflowRunner,
}: TaskSchedulerOptions): TaskScheduler {
  let interval: NodeJS.Timeout | null = null
  let isTicking = false

  async function tick(): Promise<void> {
    if (isTicking) {
      return
    }

    isTicking = true
    try {
      const [workflows, currentDevice, appSettingsSnapshot] = await Promise.all([
        taskStore.listWorkflows(),
        deviceStore.getCurrentDevice(),
        appSettingsStore.getSnapshot(),
      ])
      const now = new Date()

      for (const workflow of workflows) {
        const schedule = normalizeTaskSchedule(workflow.schedule)

        if (
          !schedule?.enabled ||
          workflow.state.status === 'running' ||
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

        if (!workflow.legacyTaskId) {
          continue
        }

        await taskStore.updateTask(workflow.legacyTaskId, {
          schedule: {
            ...schedule,
            lastTriggeredAt: now.toISOString(),
            nextRunAt: getNextRunAt(now, schedule),
          },
        })
        void workflowRunner.runWorkflow(workflow.id)
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

function getNextRunAt(date: Date, schedule: TaskSchedule): string {
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
