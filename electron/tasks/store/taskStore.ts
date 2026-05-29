import type { TaskTemplate } from '../../../src/shared/tasks'

export type CreateTaskInput<TConfig = unknown> = {
  name: string
  type: TaskTemplate<TConfig>['type']
  config: TConfig
}

export type UpdateTaskInput<TConfig = unknown, TState = unknown> = Partial<
  Pick<TaskTemplate<TConfig, TState>, 'name' | 'config' | 'state' | 'permissions'>
>

export type TaskStore = {
  listTasks(): Promise<TaskTemplate[]>
  createTask(input: CreateTaskInput): Promise<TaskTemplate>
  updateTask(id: string, input: UpdateTaskInput): Promise<TaskTemplate>
  deleteTask(id: string): Promise<void>
}

export function createTaskStore(): TaskStore {
  throw new Error('Task store persistence is not implemented yet.')
}
