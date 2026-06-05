export type RunStatus = 'idle' | 'running' | 'succeeded' | 'failed'

export type WorkflowRunStatus =
  | 'pending_confirmation'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'skipped'

export type ActionRunStatus = 'running' | 'succeeded' | 'failed' | 'cancelled' | 'skipped'

export type WorkflowRunActorType =
  | 'user'
  | 'schedule'
  | 'browser_extension'
  | 'external_bridge'

export type WorkflowRunTriggerSource = 'manual' | 'schedule' | 'browser_extension' | 'external_bridge'

export type WorkflowRun = {
  id: string
  workflowId: string
  actorType: WorkflowRunActorType
  actorId?: string
  triggerSource: WorkflowRunTriggerSource
  status: WorkflowRunStatus
  startedAt?: string
  endedAt?: string
  summary?: string
  error?: string
  workflowSnapshot?: unknown
  createdAt: string
  updatedAt: string
}

export type CreateWorkflowRunInput = {
  workflowId: string
  actorType: WorkflowRunActorType
  actorId?: string
  triggerSource: WorkflowRunTriggerSource
  status?: WorkflowRunStatus
  startedAt?: string
  summary?: string
  workflowSnapshot?: unknown
}

export type UpdateWorkflowRunInput = Partial<
  Pick<
    WorkflowRun,
    'status' | 'startedAt' | 'endedAt' | 'summary' | 'error' | 'workflowSnapshot'
  >
>

export type ActionRun = {
  id: string
  runId: string
  workflowId: string
  actionRefId: string
  actionId: string
  order: number
  status: ActionRunStatus
  startedAt?: string
  endedAt?: string
  inputSummary?: unknown
  outputSummary?: unknown
  error?: string
  createdAt: string
  updatedAt: string
}

export type CreateActionRunInput = {
  runId: string
  workflowId: string
  actionRefId: string
  actionId: string
  order: number
  status?: ActionRunStatus
  startedAt?: string
  inputSummary?: unknown
}

export type UpdateActionRunInput = Partial<
  Pick<
    ActionRun,
    'status' | 'startedAt' | 'endedAt' | 'inputSummary' | 'outputSummary' | 'error'
  >
>

export type WorkflowRunEvent = {
  id: string
  runId?: string
  workflowId: string
  actionRunId?: string
  deviceId: string
  status: RunStatus
  message?: string
  createdAt: string
}

export type CreateWorkflowRunEventInput = {
  runId?: string
  workflowId: string
  actionRunId?: string
  legacyTaskId?: string
  deviceId: string
  status: RunStatus
  message?: string
}
