import type { TaskTemplate } from '../../shared/tasks'

export type TasksApi = {
  list(): Promise<TaskTemplate[]>
  create(input: unknown): Promise<TaskTemplate>
  update(id: string, input: unknown): Promise<TaskTemplate>
  delete(id: string): Promise<void>
}

export type PastelFlowApi = {
  tasks: TasksApi
}
