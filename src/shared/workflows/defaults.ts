import type {
  DayOfWeek,
  WorkflowRunPolicy,
  WorkflowSchedule,
  WorkflowScheduleMode,
  WorkflowState,
} from './types'
import type { WorkflowRunActorType } from '../runStatus'

export const defaultWorkflowState: WorkflowState = {
  status: 'idle',
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

export function normalizeWorkflowRunPolicy(
  runPolicy: Partial<WorkflowRunPolicy> | null | undefined,
): WorkflowRunPolicy | undefined {
  if (!runPolicy) {
    return undefined
  }

  const allowedActors = normalizeWorkflowRunActors(runPolicy.allowedActors)
  const allowedExternalClientIds = normalizeStringList(
    runPolicy.allowedExternalClientIds,
  )
  const maxRunsPerHour = normalizeMaxRunsPerHour(runPolicy.maxRunsPerHour)
  const normalized: WorkflowRunPolicy = {
    allowedActors,
    allowedExternalClientIds,
    requiresConfirmation:
      runPolicy.requiresConfirmation === true ? true : undefined,
    maxRunsPerHour,
    allowSchedule:
      runPolicy.allowSchedule === false ? false : undefined,
  }

  return Object.values(normalized).some((value) => value !== undefined)
    ? normalized
    : undefined
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

function normalizeWorkflowRunActors(
  value: unknown,
): WorkflowRunActorType[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const actors = value.filter(isWorkflowRunActorType)
  return actors.length > 0 ? [...new Set(actors)] : undefined
}

function isWorkflowRunActorType(value: unknown): value is WorkflowRunActorType {
  return (
    value === 'user' ||
    value === 'schedule' ||
    value === 'browser_extension' ||
    value === 'external_bridge'
  )
}

function normalizeStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const items = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)

  return items.length > 0 ? [...new Set(items)] : undefined
}

function normalizeMaxRunsPerHour(value: unknown): number | undefined {
  const numericValue = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numericValue)) {
    return undefined
  }

  const normalizedValue = Math.floor(numericValue)
  return normalizedValue > 0 ? Math.min(normalizedValue, 10_000) : undefined
}
