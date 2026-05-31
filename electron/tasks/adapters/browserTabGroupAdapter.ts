import type {
  BrowserTabGroupConfig,
  TaskState,
} from '../../../src/shared/tasks'
import { normalizeBrowserTabGroupConfig } from '../../../src/shared/tasks'
import { openDefaultBrowserUrls } from './browser/browserProcessLauncher'
import {
  assertExistingBrowserProfile,
  readBrowserActionState,
  startOrAttachBrowserActionGroup,
  stopBrowserActionGroup,
} from './browser/browserSessionManager'
import { findBrowserExecutable } from './browserExecutableFinder'
import type { TaskAdapter } from './taskAdapter'

export const browserTabGroupAdapter: TaskAdapter<
  BrowserTabGroupConfig,
  TaskState
> = {
  type: 'browser_tab_group',
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
  async run({ appSettings, dataDir, task, updateConfig, updateState }) {
    const config = normalizeBrowserTabGroupConfig(task.config)

    if (config.runMode === 'default_browser_deeplink') {
      await openDefaultBrowserUrls(config.initialUrls)

      return {
        state: {
          ...task.state,
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
    const runResult = await startOrAttachBrowserActionGroup(task.id, config, {
      dataDir,
      executable: browserExecutable,
      async onActionSnapshot(actionId, nextConfig, nextState) {
        if (actionId !== task.id) {
          return
        }

        await updateConfig(nextConfig)
        await updateState(nextState)
      },
    })

    return {
      state: createRunningState(task.state, runResult.localProfilePath),
      message: runResult.message,
    }
  },
  async stop(taskId) {
    return stopBrowserActionGroup(taskId)
  },
  async getState(taskId) {
    return readBrowserActionState(taskId) ?? { status: 'idle' }
  },
}

function createRunningState(
  currentState: TaskState,
  localProfilePath: string,
): TaskState {
  return {
    ...currentState,
    status: 'running',
    lastRunAt: new Date().toISOString(),
    lastError: undefined,
    localProfilePath,
  }
}
