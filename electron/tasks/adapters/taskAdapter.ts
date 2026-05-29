import type { AppSettings } from '../../../src/shared/settings'
import type { TaskTemplate, TaskType } from '../../../src/shared/tasks'

export type TaskRunContext<TConfig = unknown, TState = unknown> = {
  task: TaskTemplate<TConfig, TState>
  deviceId: string
  dataDir: string
  appSettings: AppSettings
  updateState(state: Partial<TState>): Promise<void>
}

export type TaskRunResult<TState = unknown> = {
  state: TState
  message?: string
}

export type TaskAdapter<TConfig = unknown, TState = unknown> = {
  type: TaskType
  validateConfig(config: TConfig): Promise<void> | void
  run(
    context: TaskRunContext<TConfig, TState>,
  ): Promise<TaskRunResult<TState>>
  stop?(taskId: string): Promise<void>
  getState?(taskId: string): Promise<TState>
}
