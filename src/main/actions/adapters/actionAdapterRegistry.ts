import type { ActionType } from '../../../shared/actions'
import type { ActionAdapter } from './actionAdapter'

export type ActionAdapterRegistry = {
  getAdapter(type: ActionType): ActionAdapter
}

export function createActionAdapterRegistry(
  adapters: ActionAdapter[],
): ActionAdapterRegistry {
  const adaptersByType = new Map<ActionType, ActionAdapter>()

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
