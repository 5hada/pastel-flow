import type { ActionRuntimeState } from '../../../shared/actions'
import {
  BrowserTabGroupConfig,
  normalizeBrowserTabGroupConfig
} from '../../../shared/browsers'
import { openDefaultBrowserUrls } from '../../browsers/browserProcessLauncher'
import {
  assertExistingBrowserProfile,
  readBrowserActionState,
  startOrAttachBrowserActionGroup,
  stopBrowserActionGroup,
} from '../../browsers/browserSessionManager'
import { findBrowserExecutable } from '../../browsers/browserExecutableFinder'
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

    if (
      normalizedConfig.runMode !== 'extension_controlled' &&
      normalizedConfig.profileSource === 'existing_profile'
    ) {
      throw new Error('기존 브라우저 프로필은 확장 프로그램 제어 실행에서만 사용할 수 있습니다.')
    }

    if (
      normalizedConfig.profileSource === 'existing_profile' &&
      !normalizedConfig.existingProfilePath
    ) {
      throw new Error('기존 브라우저 프로필 경로를 입력해야 합니다.')
    }

    await assertExistingBrowserProfile(normalizedConfig)
  },
  async run({ action, dataDir, appSettings, updateConfig, updateState }) {
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

    const browserExecutable = await findBrowserExecutable(
      config.browserKind,
      appSettings.browserExecutablePaths,
    )
    const runResult = await startOrAttachBrowserActionGroup(action.id, config, {
      dataDir,
      executable: browserExecutable,
      async onActionSnapshot(actionId, nextConfig, nextState) {
        if (actionId !== action.id) {
          return
        }

        await updateConfig(nextConfig)
        await updateState(nextState)
      },
    }).catch(async (error) => {
      if (!isExistingProfileRemoteDebuggingError(error, config)) {
        throw error
      }

      await openDefaultBrowserUrls(config.initialUrls)
      return {
        localProfilePath: config.existingProfilePath,
        message:
          '기존 프로필이 이미 실행 중이라 확장 제어 대신 기본 브라우저로 URL을 열었습니다.',
        sessionId: 'default-browser-fallback',
      }
    })

    return {
      state:
        runResult.sessionId === 'default-browser-fallback'
          ? createIdleFallbackState()
          : createRunningState(),
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

function createIdleFallbackState(
): ActionRuntimeState {
  return {
    status: 'idle',
    endedAt: new Date().toISOString(),
    lastError: undefined
  }
}

function createRunningState(
): ActionRuntimeState {
  return {
    status: 'running',
    startedAt: new Date().toISOString(),
    lastError: undefined
  }
}

function isExistingProfileRemoteDebuggingError(
  error: unknown,
  config: BrowserTabGroupConfig,
): config is BrowserTabGroupConfig & { existingProfilePath: string } {
  return (
    config.profileSource === 'existing_profile' &&
    Boolean(config.existingProfilePath) &&
    error instanceof Error &&
    error.message.includes('브라우저 원격 디버깅 포트가 열리지 않았습니다.')
  )
}
