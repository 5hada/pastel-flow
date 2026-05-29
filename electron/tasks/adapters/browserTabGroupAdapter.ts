import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import type {
  BrowserTabGroupConfig,
  TaskState,
} from '../../../src/shared/tasks'
import { normalizeBrowserTabGroupConfig } from '../../../src/shared/tasks'
import type { TaskAdapter } from './taskAdapter'

export const browserTabGroupAdapter: TaskAdapter<
  BrowserTabGroupConfig,
  TaskState
> = {
  type: 'browser_tab_group',
  validateConfig(config) {
    const normalizedConfig = normalizeBrowserTabGroupConfig(config)

    if (!normalizedConfig.profileId.trim()) {
      throw new Error('Browser tab group tasks require a profileId.')
    }
  },
  async run({ dataDir, task }) {
    const config = normalizeBrowserTabGroupConfig(task.config)

    if (config.runMode !== 'dedicated_profile') {
      throw new Error(
        `${config.runMode} 실행 방식은 아직 지원하지 않습니다.`,
      )
    }

    const localProfilePath = path.join(
      dataDir,
      'browser-profiles',
      config.profileId,
    )

    await mkdir(localProfilePath, { recursive: true })

    return {
      state: {
        ...task.state,
        status: 'running',
        lastRunAt: new Date().toISOString(),
        lastError: undefined,
        localProfilePath,
      },
      message: '브라우저 프로필 디렉터리를 준비했습니다.',
    }
  },
}
