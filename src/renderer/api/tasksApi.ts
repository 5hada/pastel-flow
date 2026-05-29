import type {
  BrowserTabGroupConfig,
  DevicePolicy,
  TaskState,
  TaskTemplate,
  TaskType,
} from '../../shared/tasks'

export type CreateTaskInput<TConfig = unknown> = {
  name: string
  type: TaskType
  config: TConfig
  permissions?: DevicePolicy
  state?: TaskState
}

export type UpdateTaskInput<TConfig = unknown> = Partial<{
  name: string
  config: TConfig
  permissions: DevicePolicy
  state: TaskState
}>

export type CreateBrowserTabGroupTaskInput =
  CreateTaskInput<BrowserTabGroupConfig>

export type TasksApi = {
  list(): Promise<TaskTemplate[]>
  create<TConfig = unknown>(
    input: CreateTaskInput<TConfig>,
  ): Promise<TaskTemplate<TConfig>>
  update<TConfig = unknown>(
    id: string,
    input: UpdateTaskInput<TConfig>,
  ): Promise<TaskTemplate<TConfig>>
  delete(id: string): Promise<void>
}

export type PastelFlowApi = {
  tasks: TasksApi
}
