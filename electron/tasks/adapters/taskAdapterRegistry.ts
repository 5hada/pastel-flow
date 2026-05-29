import type { TaskType } from '../../../src/shared/tasks'
import type { TaskAdapter } from './taskAdapter'

export type TaskAdapterRegistry = {
  getAdapter(type: TaskType): TaskAdapter
}

export function createTaskAdapterRegistry(
  adapters: TaskAdapter[],
): TaskAdapterRegistry {
  const adaptersByType = new Map<TaskType, TaskAdapter>()

  for (const adapter of adapters) {
    adaptersByType.set(adapter.type, adapter)
  }

  return {
    getAdapter(type) {
      const adapter = adaptersByType.get(type)

      if (!adapter) {
        throw new Error(`No task adapter registered for type: ${type}`)
      }

      return adapter
    },
  }
}
