import type {
  BrowserTabGroupConfig,
  TaskState,
} from '../../../src/shared/tasks'
import type { TaskAdapter } from './taskAdapter'

export const browserTabGroupAdapter: TaskAdapter<
  BrowserTabGroupConfig,
  TaskState
> = {
  type: 'browser_tab_group',
  validateConfig(config) {
    if (!config.profileId.trim()) {
      throw new Error('Browser tab group tasks require a profileId.')
    }
  },
  async run() {
    throw new Error('Browser tab group execution is not implemented yet.')
  },
}
