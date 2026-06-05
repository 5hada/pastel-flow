import type { ActionRuntimeState } from '../../../shared/actions'
import {
  BrowserTabGroupConfig,
  normalizeBrowserTabGroupConfig
} from '../../../shared/browsers'
import {
  readBrowserActionState,
  startOrAttachBrowserActionGroup,
  stopBrowserActionGroup,
} from '../../browsers/browserActionGroupRuntime'
import type { ActionAdapter } from './actionAdapter'

export const browserAdapter: ActionAdapter<
  BrowserTabGroupConfig,
  ActionRuntimeState
> = {
  type: 'browser_action',
  async validateConfig(config) {
    const normalizedConfig = normalizeBrowserTabGroupConfig(config)

    if (!normalizedConfig.profileId.trim()) {
      throw new Error('Browser tab group tasks require a profileId.')
    }
  },
  async run({ action, dataDir, updateConfig, updateState }) {
    const config = normalizeBrowserTabGroupConfig(action.config)

    const runResult = await startOrAttachBrowserActionGroup(action.id, config, {
      dataDir,
      async onActionSnapshot(actionId, nextConfig, nextState) {
        if (actionId !== action.id) {
          return
        }

        await updateConfig(nextConfig)
        await updateState(nextState)
      },
    })

    return {
      state: createRunningState(),
      message: runResult.message,
    }
  },
  async stop(actionId) {
    return stopBrowserActionGroup(actionId)
  },
  async getState(actionId) {
    return readBrowserActionState(actionId) ?? { status: 'idle' }
  },
}

function createRunningState(
): ActionRuntimeState {
  return {
    status: 'running',
    startedAt: new Date().toISOString(),
    lastError: undefined
  }
}
