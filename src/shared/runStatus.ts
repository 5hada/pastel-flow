export type RunStatus = 'idle' | 'running' | 'succeeded' | 'failed'

export type WorkflowRunEvent = {
  id: string
  workflowId: string
  actionRunId?: string
  deviceId: string
  status: RunStatus
  message?: string
  createdAt: string
}

export type CreateWorkflowRunEventInput = {
  workflowId: string
  actionRunId?: string
  legacyTaskId?: string
  deviceId: string
  status: RunStatus
  message?: string
}
