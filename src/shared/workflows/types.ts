import type { ActionRuntimeState } from '../actions'
import type { DevicePolicy } from '../devices'
import type { RunStatus } from '../runStatus'

export type WorkflowScheduleMode = 'interval' | 'daily' | 'weekly'

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type WorkflowSchedule = {
  enabled: boolean
  mode: WorkflowScheduleMode
  intervalMinutes: number
  timeOfDay?: string
  daysOfWeek?: DayOfWeek[]
  nextRunAt?: string
  lastTriggeredAt?: string
}

export type WorkflowActionRef = {
  id: string
  actionId: string
  order: number
  inputMapping?: WorkflowInputMapping
  retryPolicy?: WorkflowActionRetryPolicy
  enabled: boolean
}

export type WorkflowActionRetryPolicy = {
  retryCount: number
  retryDelaySeconds: number
}

export type WorkflowInputMapping = Record<
  string,
  WorkflowInputMappingSource
>

export type WorkflowInputMappingSource = {
  actionRefId: string
  outputKey?: string
  path?: string
}

export type WorkflowDefinition = {
  id: string
  name: string
  actionRefs: WorkflowActionRef[]
  permissions: DevicePolicy
  schedule?: WorkflowSchedule
  state: WorkflowState
  createdAt: string
  updatedAt: string
}

export type WorkflowState = {
  status: RunStatus
  actionStates?: Record<string, ActionRuntimeState>
  startedAt?: string
  endedAt?: string
  lastError?: string
  lastMessage?: string
}
