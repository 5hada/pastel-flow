import type { ActionRuntimeState } from '../../../shared/actions'
import {
  BrowserTabGroupConfig,
  normalizeBrowserTabGroupConfig
} from '../../../shared/browsers'
import { openDefaultBrowserUrls } from '../../browsers/browserProcessLauncher'
import {
  readBrowserActionState,
  startOrAttachBrowserActionGroup,
  stopBrowserActionGroup,
} from '../../browsers/browserSessionManager'
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

    if (config.runMode === 'default_browser_deeplink') {
      await openDefaultBrowserUrls(config.initialUrls)

      return {
        state: {
          ...action,
          status: 'idle',
          lastRunAt: new Date().toISOString(),
          lastError: undefined,
        },
        message: '기본 브라우저로 초기 URL을 열었습니다.',
      }
    }
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
