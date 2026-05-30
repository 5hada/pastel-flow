export type TaskRunEventStatus = 'running' | 'idle' | 'failed'

export type TaskRunEvent = {
  id: string
  taskId: string
  workflowId?: string
  actionRunId?: string
  legacyTaskId?: string
  deviceId: string
  status: TaskRunEventStatus
  message?: string
  createdAt: string
}

export type CreateTaskRunEventInput = {
  taskId: string
  workflowId?: string
  actionRunId?: string
  legacyTaskId?: string
  deviceId: string
  status: TaskRunEventStatus
  message?: string
}
