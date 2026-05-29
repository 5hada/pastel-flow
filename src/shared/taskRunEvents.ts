export type TaskRunEventStatus = 'running' | 'idle' | 'failed'

export type TaskRunEvent = {
  id: string
  taskId: string
  deviceId: string
  status: TaskRunEventStatus
  message?: string
  createdAt: string
}

export type CreateTaskRunEventInput = {
  taskId: string
  deviceId: string
  status: TaskRunEventStatus
  message?: string
}
