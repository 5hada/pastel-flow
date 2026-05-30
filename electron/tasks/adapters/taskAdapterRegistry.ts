import type { ActionType, TaskType } from '../../../src/shared/tasks'
import type { TaskAdapter } from './taskAdapter'

export type TaskAdapterRegistry = {
  getAdapter(type: TaskType | ActionType): TaskAdapter
}

export function createTaskAdapterRegistry(
  adapters: TaskAdapter[],
): TaskAdapterRegistry {
  const adaptersByType = new Map<TaskType | ActionType, TaskAdapter>()

  for (const adapter of adapters) {
    adaptersByType.set(adapter.type, adapter)
    adaptersByType.set(getActionType(adapter.type), adapter)
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

function getActionType(taskType: TaskType): ActionType {
  switch (taskType) {
    case 'browser_tab_group':
      return 'browser_action'
    case 'crawler':
      return 'crawler_action'
    case 'discord_bot':
      return 'discord_dry_run_action'
    case 'notion_sync':
      return 'notion_dry_run_action'
    case 'trading_bot':
      return 'trading_dry_run_action'
  }
}
