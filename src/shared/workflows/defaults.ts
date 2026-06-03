import type {
    WorkflowState,
    WorkflowSchedule,
    WorkflowScheduleMode,
    DayOfWeek
} from "./types"


export const defaultWorkflowState: WorkflowState = {
  status: 'idle'
}


export const defaultWorkflowSchedule: WorkflowSchedule = {
  enabled: false,
  mode: 'interval',
  intervalMinutes: 60,
}

export function normalizeWorkflowSchedule(
  schedule: Partial<WorkflowSchedule> | null | undefined,
): WorkflowSchedule | undefined {
  if (!schedule) {
    return undefined
  }

  return {
    enabled: schedule.enabled === true,
    mode: isWorkflowScheduleMode(schedule.mode) ? schedule.mode : 'interval',
    intervalMinutes: normalizeScheduleInterval(schedule.intervalMinutes),
    timeOfDay: normalizeTimeOfDay(schedule.timeOfDay),
    daysOfWeek: normalizeDaysOfWeek(schedule.daysOfWeek),
    nextRunAt:
      typeof schedule.nextRunAt === 'string' && schedule.nextRunAt.trim()
        ? schedule.nextRunAt
        : undefined,
    lastTriggeredAt:
      typeof schedule.lastTriggeredAt === 'string' &&
      schedule.lastTriggeredAt.trim()
        ? schedule.lastTriggeredAt
        : undefined,
  }
}

function normalizeScheduleInterval(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return defaultWorkflowSchedule.intervalMinutes
  }

  return Math.min(Math.max(Math.round(value), 1), 10080)
}

function normalizeTimeOfDay(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmedValue = value.trim()
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(trimmedValue)
    ? trimmedValue
    : undefined
}

function normalizeDaysOfWeek(value: unknown): DayOfWeek[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const days = value
    .map((day) => (typeof day === 'number' ? Math.round(day) : -1))
    .filter((day): day is DayOfWeek => day >= 0 && day <= 6)

  return days.length > 0 ? [...new Set(days)] : undefined
}

function isWorkflowScheduleMode(value: unknown): value is WorkflowScheduleMode {
  return value === 'interval' || value === 'daily' || value === 'weekly'
}