import type {
  DayOfWeek,
  WorkflowEdge,
  WorkflowEdgeTransform,
  WorkflowGraph,
  WorkflowRunPolicy,
  WorkflowSchedule,
  WorkflowScheduleMode,
  WorkflowState,
  WorkflowNode,
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

export function normalizeWorkflowGraph(value: unknown): WorkflowGraph | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const nodes = Array.isArray(value.nodes)
    ? value.nodes.flatMap(normalizeWorkflowNode)
    : []
  const edges = Array.isArray(value.edges)
    ? value.edges.flatMap(normalizeWorkflowEdge)
    : []

  if (nodes.length === 0 && edges.length === 0) {
    return undefined
  }

  return {
    nodes,
    edges,
    viewport: normalizeWorkflowViewport(value.viewport),
  }
}

function normalizeWorkflowNode(value: unknown): WorkflowNode[] {
  if (!isRecord(value) || !isNonEmptyString(value.id) || !isNonEmptyString(value.actionId)) {
    return []
  }

  return [
    {
      id: value.id.trim(),
      actionId: value.actionId.trim(),
      label: optionalString(value.label),
      position: normalizeWorkflowNodePosition(value.position),
      configOverrides: isRecord(value.configOverrides)
        ? value.configOverrides
        : undefined,
      enabled: value.enabled !== false,
    },
  ]
}

function normalizeWorkflowEdge(value: unknown): WorkflowEdge[] {
  if (!isRecord(value) || !isNonEmptyString(value.id)) {
    return []
  }

  const from = normalizeWorkflowPortRef(value.from)
  const to = normalizeWorkflowPortRef(value.to)
  if (!from || !to) {
    return []
  }

  return [
    {
      id: value.id.trim(),
      from,
      to,
      transform: normalizeWorkflowEdgeTransform(value.transform),
      enabled: value.enabled !== false,
    },
  ]
}

function normalizeWorkflowPortRef(value: unknown): WorkflowEdge['from'] | undefined {
  if (!isRecord(value) || !isNonEmptyString(value.nodeId) || !isNonEmptyString(value.portId)) {
    return undefined
  }

  return {
    nodeId: value.nodeId.trim(),
    portId: value.portId.trim(),
    path: optionalString(value.path),
  }
}

function normalizeWorkflowEdgeTransform(
  value: unknown,
): WorkflowEdge['transform'] {
  if (!isRecord(value) || !isWorkflowEdgeTransformMode(value.mode)) {
    return undefined
  }

  return {
    mode: value.mode,
    config: isRecord(value.config) ? value.config : undefined,
  }
}

function normalizeWorkflowNodePosition(value: unknown): WorkflowNode['position'] {
  if (!isRecord(value)) {
    return { x: 0, y: 0 }
  }

  return {
    x: normalizeFiniteNumber(value.x, 0),
    y: normalizeFiniteNumber(value.y, 0),
  }
}

function normalizeWorkflowViewport(
  value: unknown,
): WorkflowGraph['viewport'] {
  if (!isRecord(value)) {
    return undefined
  }

  return {
    x: normalizeFiniteNumber(value.x, 0),
    y: normalizeFiniteNumber(value.y, 0),
    zoom: normalizeFiniteNumber(value.zoom, 1),
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

function isWorkflowEdgeTransformMode(
  value: unknown,
): value is WorkflowEdgeTransform['mode'] {
  return (
    value === 'none' ||
    value === 'auto' ||
    value === 'json_path' ||
    value === 'template'
  )
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

function normalizeFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
