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
  async run({ appSettings, dataDir, task, updateConfig, updateState }) {
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
    const browserExecutable = await findBrowserExecutable(
      config.browserKind,
      appSettings.browserExecutablePaths,
    )
    const remoteDebuggingPort = config.dynamicTemplateUpdates
      ? getRemoteDebuggingPort(task.id)
      : null
    const browserProcess = await launchBrowser(browserExecutable.path, [
      `--user-data-dir=${localProfilePath}`,
      '--no-first-run',
      '--new-window',
      ...(remoteDebuggingPort
        ? [`--remote-debugging-port=${remoteDebuggingPort}`]
        : []),
      ...config.initialUrls,
    ])
    const tabUrlSnapshotter = remoteDebuggingPort
      ? startTabUrlSnapshotter(remoteDebuggingPort)
      : null
    browserProcess.once('exit', (code, signal) => {
      void (async () => {
        const openUrls = tabUrlSnapshotter?.stop() ?? []
        const nextState = getBrowserExitState(
          browserExecutable.displayName,
          code,
          signal,
        )

        if (openUrls.length > 0 && nextState.status !== 'failed') {
          await updateConfig({
            ...config,
            initialUrls: openUrls,
          })
        }

        await updateState(nextState)
      })()
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

type DevToolsTarget = {
  type?: string
  url?: string
}

type TabUrlSnapshotter = {
  stop(): string[]
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

function getRemoteDebuggingPort(taskId: string): number {
  const hash = [...taskId].reduce(
    (currentHash, character) =>
      (currentHash * 31 + character.charCodeAt(0)) % 1000,
    0,
  )

  return 9200 + hash
}

function startTabUrlSnapshotter(port: number): TabUrlSnapshotter {
  let latestUrls: string[] = []
  const interval = setInterval(() => {
    void readOpenTabUrls(port).then((urls) => {
      if (urls.length > 0) {
        latestUrls = urls
      }
    })
  }, 2000)

  return {
    stop() {
      clearInterval(interval)
      return latestUrls
    },
  }
}

async function readOpenTabUrls(port: number): Promise<string[]> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/list`)

    if (!response.ok) {
      return []
    }

    const targets = (await response.json()) as DevToolsTarget[]
    return dedupe(
      targets
        .filter((target) => target.type === 'page')
        .map((target) => target.url?.trim() ?? '')
        .filter(isTemplateUrl),
    )
  } catch {
    return []
  }
}

function isTemplateUrl(value: string): boolean {
  return (
    Boolean(value) &&
    !value.startsWith('devtools://') &&
    !value.startsWith('chrome://') &&
    !value.startsWith('edge://') &&
    value !== 'about:blank'
  )
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)]
}
