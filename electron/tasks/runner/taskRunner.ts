import type { TaskState, TaskTemplate } from '../../../src/shared/tasks'
import type { TaskAdapterRegistry } from '../adapters/taskAdapterRegistry'
import type { TaskStore } from '../store/taskStore'

export type TaskRunner = {
  runTask(id: string): Promise<TaskTemplate>
}

export type TaskRunnerOptions = {
  taskStore: TaskStore
  adapterRegistry: TaskAdapterRegistry
  dataDir: string
  deviceId: string
}

export function createTaskRunner({
  taskStore,
  adapterRegistry,
  dataDir,
  deviceId,
}: TaskRunnerOptions): TaskRunner {
  return {
    async runTask(id) {
      const task = await taskStore.getTask(id)
      const adapter = adapterRegistry.getAdapter(task.type)

      try {
        await adapter.validateConfig(task.config)
        const result = await adapter.run({
          task,
          deviceId,
          dataDir,
        })
        const resultState = result.state as Partial<TaskState>

        return taskStore.updateTask(task.id, {
          state: {
            ...task.state,
            ...resultState,
          },
        })
      } catch (error) {
        return taskStore.updateTask(task.id, {
          state: {
            ...task.state,
            status: 'failed',
            lastError: getErrorMessage(error),
          },
        })
      }
    },
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return '알 수 없는 실행 오류가 발생했습니다.'
}
