import type { TaskState, TaskTemplate } from '../../../src/shared/tasks'
import type { TaskAdapterRegistry } from '../adapters/taskAdapterRegistry'
import type { AppSettingsStore } from '../../settings/store/appSettingsStore'
import type { TaskStore } from '../store/taskStore'

export type TaskRunner = {
  runTask(id: string): Promise<TaskTemplate>
}

export type TaskRunnerOptions = {
  taskStore: TaskStore
  appSettingsStore: AppSettingsStore
  adapterRegistry: TaskAdapterRegistry
  dataDir: string
  deviceId: string
  onTaskUpdated?(task: TaskTemplate): void
}

export function createTaskRunner({
  taskStore,
  appSettingsStore,
  adapterRegistry,
  dataDir,
  deviceId,
  onTaskUpdated,
}: TaskRunnerOptions): TaskRunner {
  return {
    async runTask(id) {
      const task = await taskStore.getTask(id)
      const adapter = adapterRegistry.getAdapter(task.type)
      let resolveRunStateSaved: () => void = () => undefined
      const runStateSaved = new Promise<void>((resolve) => {
        resolveRunStateSaved = resolve
      })

      try {
        await adapter.validateConfig(task.config)
        const appSettingsSnapshot = await appSettingsStore.getSnapshot()
        const result = await adapter.run({
          task,
          deviceId,
          dataDir,
          appSettings: appSettingsSnapshot.settings,
          async updateState(state) {
            await runStateSaved
            const currentTask = await taskStore.getTask(task.id)
            const updatedTask = await taskStore.updateTask(task.id, {
              state: {
                ...currentTask.state,
                ...(state as Partial<TaskState>),
              },
            })
            onTaskUpdated?.(updatedTask)
          },
        })
        const resultState = result.state as Partial<TaskState>

        const updatedTask = await taskStore.updateTask(task.id, {
          state: {
            ...task.state,
            ...resultState,
          },
        })
        resolveRunStateSaved()
        onTaskUpdated?.(updatedTask)

        return updatedTask
      } catch (error) {
        const updatedTask = await taskStore.updateTask(task.id, {
          state: {
            ...task.state,
            status: 'failed',
            lastError: getErrorMessage(error),
          },
        })
        resolveRunStateSaved()
        onTaskUpdated?.(updatedTask)

        return updatedTask
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
