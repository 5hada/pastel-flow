import { type ChildProcess, spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import type {
  BrowserTabGroupConfig,
  TaskState,
} from '../../../src/shared/tasks'
import { normalizeBrowserTabGroupConfig } from '../../../src/shared/tasks'
import { findBrowserExecutable } from './browserExecutableFinder'
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
  async run({ dataDir, task, updateState }) {
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
    const browserExecutable = await findBrowserExecutable(config.browserKind)
    const browserProcess = await launchBrowser(browserExecutable.path, [
      `--user-data-dir=${localProfilePath}`,
      '--no-first-run',
      '--new-window',
      ...config.initialUrls,
    ])
    browserProcess.once('exit', (code, signal) => {
      void updateState(
        getBrowserExitState(browserExecutable.displayName, code, signal),
      )
    })

    return {
      state: {
        ...task.state,
        status: 'running',
        lastRunAt: new Date().toISOString(),
        lastError: undefined,
        localProfilePath,
      },
      message: `${browserExecutable.displayName}을 전용 프로필로 실행했습니다.`,
    }
  },
}

async function launchBrowser(
  executablePath: string,
  args: string[],
): Promise<ChildProcess> {
  const browserProcess = spawn(executablePath, args, {
    detached: true,
    stdio: 'ignore',
  })

  await new Promise<void>((resolve, reject) => {
    browserProcess.once('error', reject)
    browserProcess.once('spawn', resolve)
  })

  browserProcess.unref()
  return browserProcess
}

function getBrowserExitState(
  displayName: string,
  code: number | null,
  signal: NodeJS.Signals | null,
): Partial<TaskState> {
  if (signal) {
    return {
      status: 'failed',
      lastError: `${displayName} 프로세스가 ${signal} 신호로 종료되었습니다.`,
    }
  }

  if (code === null || code === 0) {
    return {
      status: 'idle',
      lastError: undefined,
    }
  }

  return {
    status: 'failed',
    lastError: `${displayName} 프로세스가 오류 코드 ${code}로 종료되었습니다.`,
  }
}
