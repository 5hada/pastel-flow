import { randomUUID } from 'node:crypto'
import {
  getLegacyWorkflowId,
  type TaskState,
  type TaskTemplate,
} from '../../../src/shared/tasks'
import type { TaskAdapterRegistry } from '../adapters/taskAdapterRegistry'
import type { AppSettingsStore } from '../../settings/store/appSettingsStore'
import type { TaskRunEventStore } from '../store/taskRunEventStore'
import type { TaskStore } from '../store/taskStore'

export type TaskRunner = {
  runTask(id: string): Promise<TaskTemplate>
  stopTask(id: string): Promise<TaskTemplate>
}

export type TaskRunnerOptions = {
  taskStore: TaskStore
  taskRunEventStore: TaskRunEventStore
  appSettingsStore: AppSettingsStore
  adapterRegistry: TaskAdapterRegistry
  dataDir: string
  deviceId: string
  onTaskUpdated?(task: TaskTemplate): void
}

export function createTaskRunner({
  taskStore,
  taskRunEventStore,
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
      const workflowId = getLegacyWorkflowId(task.id)
      const actionRunId = randomUUID()
      let resolveRunStateSaved: () => void = () => undefined
      const runStateSaved = new Promise<void>((resolve) => {
        resolveRunStateSaved = resolve
      })

      try {
        await taskRunEventStore.appendEvent({
          taskId: task.id,
          workflowId,
          actionRunId,
          legacyTaskId: task.id,
          deviceId,
          status: 'running',
          message: '작업 실행을 시작했습니다.',
        })
        await adapter.validateConfig(task.config)
        const appSettingsSnapshot = await appSettingsStore.getSnapshot()
        const result = await adapter.run({
          task,
          deviceId,
          dataDir,
          appSettings: appSettingsSnapshot.settings,
          async updateConfig(config) {
            await runStateSaved
            const updatedTask = await taskStore.updateTask(task.id, {
              config,
            })
            await taskRunEventStore.appendEvent({
              taskId: task.id,
              workflowId,
              actionRunId,
              legacyTaskId: task.id,
              deviceId,
              status: updatedTask.state.status,
              message: '브라우저 탭 변경사항을 템플릿에 반영했습니다.',
            })
            onTaskUpdated?.(updatedTask)
          },
          async updateState(state) {
            await runStateSaved
            const currentTask = await taskStore.getTask(task.id)
            const updatedTask = await taskStore.updateTask(task.id, {
              state: {
                ...currentTask.state,
                ...(state as Partial<TaskState>),
              },
            })
            await taskRunEventStore.appendEvent({
              taskId: task.id,
              workflowId,
              actionRunId,
              legacyTaskId: task.id,
              deviceId,
              status: updatedTask.state.status,
              message: updatedTask.state.lastError ?? '작업 상태가 변경되었습니다.',
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
        await taskRunEventStore.appendEvent({
          taskId: task.id,
          workflowId,
          actionRunId,
          legacyTaskId: task.id,
          deviceId,
          status: updatedTask.state.status,
          message: result.message ?? '작업 실행 요청을 처리했습니다.',
        })
        resolveRunStateSaved()
        onTaskUpdated?.(updatedTask)

        return updatedTask
      } catch (error) {
        const message = getErrorMessage(error)
        const updatedTask = await taskStore.updateTask(task.id, {
          state: {
            ...task.state,
            status: 'failed',
            lastError: message,
          },
        })
        await taskRunEventStore.appendEvent({
          taskId: task.id,
          workflowId,
          actionRunId,
          legacyTaskId: task.id,
          deviceId,
          status: 'failed',
          message,
        })
        resolveRunStateSaved()
        onTaskUpdated?.(updatedTask)

        return updatedTask
      }
    },
    async stopTask(id) {
      const task = await taskStore.getTask(id)
      const adapter = adapterRegistry.getAdapter(task.type)
      const workflowId = getLegacyWorkflowId(task.id)

      if (!adapter.stop) {
        throw new Error('이 작업 타입은 중지를 지원하지 않습니다.')
      }

      try {
        await adapter.stop(task.id)
        const updatedTask = await taskStore.updateTask(task.id, {
          state: {
            ...task.state,
            status: 'idle',
            lastError: undefined,
          },
        })
        await taskRunEventStore.appendEvent({
          taskId: task.id,
          workflowId,
          legacyTaskId: task.id,
          deviceId,
          status: 'idle',
          message: '작업 중지를 요청했습니다.',
        })
        onTaskUpdated?.(updatedTask)

        return updatedTask
      } catch (error) {
        const message = getErrorMessage(error)
        const updatedTask = await taskStore.updateTask(task.id, {
          state: {
            ...task.state,
            status: 'failed',
            lastError: message,
          },
        })
        await taskRunEventStore.appendEvent({
          taskId: task.id,
          workflowId,
          legacyTaskId: task.id,
          deviceId,
          status: 'failed',
          message,
        })
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
