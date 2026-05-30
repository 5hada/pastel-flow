import { type ChildProcess, spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createConnection } from 'node:net'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type {
  BrowserTabGroupConfig,
  BrowserTabGroupStateSnapshot,
  TaskState,
} from '../../../src/shared/tasks'
import { normalizeBrowserTabGroupConfig } from '../../../src/shared/tasks'
import { findBrowserExecutable } from './browserExecutableFinder'
import type { TaskAdapter } from './taskAdapter'

const runningBrowserProcesses = new Map<string, ChildProcess>()

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

    const isExistingProfile =
      config.runMode === 'extension_controlled' &&
      config.profileSource === 'existing_profile' &&
      config.existingProfilePath

    const localProfilePath = getBrowserProfilePath(dataDir, config)

    if (!isExistingProfile) {
      await mkdir(localProfilePath, { recursive: true })
    }

    const browserExecutable = await findBrowserExecutable(
      config.browserKind,
      appSettings.browserExecutablePaths,
    )
    const shouldLoadExtensionBridge = config.runMode === 'extension_controlled'
    const extensionBridgePath = shouldLoadExtensionBridge
      ? await ensureBrowserExtensionBridge(dataDir)
      : null
    const remoteDebuggingPort =
      config.dynamicTemplateUpdates || shouldLoadExtensionBridge
      ? getRemoteDebuggingPort(task.id)
      : null
    const browserArgs = isExistingProfile
      ? [
        `--user-data-dir=${path.dirname(config.existingProfilePath!)}`,
        `--profile-directory=${path.basename(config.existingProfilePath!)}`,
        ]
      : [`--user-data-dir=${localProfilePath}`]
    const browserProcess = await launchBrowser(browserExecutable.path, [
      ...browserArgs,
      '--no-first-run',
      '--new-window',
      ...(remoteDebuggingPort
        ? [`--remote-debugging-port=${remoteDebuggingPort}`]
        : []),
      ...(extensionBridgePath
        ? [
            `--disable-extensions-except=${extensionBridgePath}`,
            `--load-extension=${extensionBridgePath}`,
          ]
        : []),
      ...config.initialUrls,
    ])
    runningBrowserProcesses.set(task.id, browserProcess)
    const browserStateSnapshotter = remoteDebuggingPort
      ? startBrowserStateSnapshotter(
          remoteDebuggingPort,
          shouldLoadExtensionBridge,
        )
      : null
    browserProcess.once('exit', (code, signal) => {
      void (async () => {
        runningBrowserProcesses.delete(task.id)
        const snapshot = browserStateSnapshotter?.stop()
        const openUrls = snapshot?.urls ?? []
        const nextState = getBrowserExitState(
          browserExecutable.displayName,
          code,
          signal,
        )

        if (
          (openUrls.length > 0 || snapshot?.tabGroupSnapshot) &&
          nextState.status !== 'failed'
        ) {
          await updateConfig({
            ...config,
            initialUrls: openUrls.length > 0 ? openUrls : config.initialUrls,
            tabGroupSnapshot: snapshot?.tabGroupSnapshot,
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
      message: `${browserExecutable.displayName}을 ${getRunModeLabel(
        config.runMode,
      )}로 실행했습니다.`,
    }
  },
  async stop(taskId) {
    const browserProcess = runningBrowserProcesses.get(taskId)

    if (!browserProcess || browserProcess.killed) {
      throw new Error('실행 중인 브라우저 프로세스를 찾지 못했습니다.')
    }

    browserProcess.kill()
    runningBrowserProcesses.delete(taskId)
  },
}

function getBrowserProfilePath(
  dataDir: string,
  config: BrowserTabGroupConfig,
): string {
  if (
    config.runMode === 'extension_controlled' &&
    config.profileSource === 'existing_profile' &&
    config.existingProfilePath
  ) {
    return config.existingProfilePath
  }

  return path.join(dataDir, 'browser-profiles', config.profileId)
}

type DevToolsTarget = {
  type?: string
  url?: string
  webSocketDebuggerUrl?: string
}

type BrowserStateSnapshot = {
  urls: string[]
  tabGroupSnapshot?: BrowserTabGroupStateSnapshot
}

type BrowserStateSnapshotter = {
  stop(): BrowserStateSnapshot
}

const extensionManifest = {
  manifest_version: 3,
  name: 'Pastel Flow Tab Group Bridge',
  version: '0.1.0',
  description: 'Captures browser tab and tab group metadata for Pastel Flow.',
  permissions: ['tabs', 'tabGroups'],
  background: {
    service_worker: 'background.js',
  },
}

const extensionBackground = `
chrome.runtime.onInstalled.addListener(() => undefined)
chrome.runtime.onStartup.addListener(() => undefined)
chrome.tabs.onCreated.addListener(() => undefined)
chrome.tabs.onUpdated.addListener(() => undefined)
chrome.tabs.onRemoved.addListener(() => undefined)
chrome.tabGroups.onCreated.addListener(() => undefined)
chrome.tabGroups.onUpdated.addListener(() => undefined)
chrome.tabGroups.onRemoved.addListener(() => undefined)
`

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

async function openDefaultBrowserUrls(urls: string[]): Promise<void> {
  const targetUrls = urls.filter(isTemplateUrl)

  if (targetUrls.length === 0) {
    throw new Error('기본 브라우저 연결 실행에는 하나 이상의 URL이 필요합니다.')
  }

  await Promise.all(targetUrls.map(openDefaultBrowserUrl))
}

async function openDefaultBrowserUrl(url: string): Promise<void> {
  const command =
    process.platform === 'win32'
      ? 'cmd'
      : process.platform === 'darwin'
        ? 'open'
        : 'xdg-open'
  const args =
    process.platform === 'win32'
      ? ['/c', 'start', '', url]
      : [url]
  const browserProcess = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  })

  await new Promise<void>((resolve, reject) => {
    browserProcess.once('error', reject)
    browserProcess.once('spawn', resolve)
  })

  browserProcess.unref()
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

function getRunModeLabel(runMode: BrowserTabGroupConfig['runMode']): string {
  switch (runMode) {
    case 'dedicated_profile':
      return '전용 프로필'
    case 'extension_controlled':
      return '확장 프로그램 제어'
    case 'default_browser_deeplink':
      return '기본 브라우저 연결'
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

async function ensureBrowserExtensionBridge(dataDir: string): Promise<string> {
  const extensionDirectory = path.join(dataDir, 'browser-extension-bridge')

  await mkdir(extensionDirectory, { recursive: true })
  await Promise.all([
    writeFile(
      path.join(extensionDirectory, 'manifest.json'),
      `${JSON.stringify(extensionManifest, null, 2)}\n`,
      'utf8',
    ),
    writeFile(
      path.join(extensionDirectory, 'background.js'),
      extensionBackground.trimStart(),
      'utf8',
    ),
  ])

  return extensionDirectory
}

function startBrowserStateSnapshotter(
  port: number,
  shouldReadTabGroups: boolean,
): BrowserStateSnapshotter {
  let latestSnapshot: BrowserStateSnapshot = { urls: [] }
  const interval = setInterval(() => {
    void readBrowserStateSnapshot(port, shouldReadTabGroups).then((snapshot) => {
      if (snapshot.urls.length > 0 || snapshot.tabGroupSnapshot) {
        latestSnapshot = snapshot
      }
    })
  }, 2000)

  return {
    stop() {
      clearInterval(interval)
      return latestSnapshot
    },
  }
}

async function readBrowserStateSnapshot(
  port: number,
  shouldReadTabGroups: boolean,
): Promise<BrowserStateSnapshot> {
  const urls = await readOpenTabUrls(port)
  const tabGroupSnapshot = shouldReadTabGroups
    ? await readExtensionTabGroupSnapshot(port)
    : undefined

  return {
    urls: tabGroupSnapshot
      ? dedupe(tabGroupSnapshot.tabs.map((tab) => tab.url).filter(isTemplateUrl))
      : urls,
    tabGroupSnapshot,
  }
}

async function readOpenTabUrls(port: number): Promise<string[]> {
  const targets = await readDevToolsTargets(port)
  return dedupe(
    targets
      .filter((target) => target.type === 'page')
      .map((target) => target.url?.trim() ?? '')
      .filter(isTemplateUrl),
  )
}

async function readExtensionTabGroupSnapshot(
  port: number,
): Promise<BrowserTabGroupStateSnapshot | undefined> {
  const targets = await readDevToolsTargets(port)
  const extensionTarget = targets.find(
    (target) =>
      target.type === 'service_worker' &&
      target.url?.endsWith('/background.js') &&
      target.webSocketDebuggerUrl,
  )

  if (!extensionTarget?.webSocketDebuggerUrl) {
    return undefined
  }

  const value = await evaluateDevToolsExpression(
    extensionTarget.webSocketDebuggerUrl,
    tabGroupSnapshotExpression,
  )

  return isBrowserTabGroupStateSnapshot(value) ? value : undefined
}

async function readDevToolsTargets(port: number): Promise<DevToolsTarget[]> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/list`)

    if (!response.ok) {
      return []
    }

    return (await response.json()) as DevToolsTarget[]
  } catch {
    return []
  }
}

const tabGroupSnapshotExpression = `
new Promise((resolve) => {
  chrome.tabs.query({}, (tabs) => {
    chrome.tabGroups.query({}, (groups) => {
      resolve({
        capturedAt: new Date().toISOString(),
        tabs: tabs.map((tab) => ({
          id: tab.id,
          windowId: tab.windowId,
          index: tab.index,
          url: tab.url || '',
          title: tab.title || undefined,
          groupId: tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE ? undefined : tab.groupId,
          active: Boolean(tab.active),
          pinned: Boolean(tab.pinned),
        })),
        groups: groups.map((group) => ({
          id: group.id,
          windowId: group.windowId,
          title: group.title || undefined,
          color: group.color,
          collapsed: Boolean(group.collapsed),
        })),
      })
    })
  })
})
`

async function evaluateDevToolsExpression(
  webSocketUrl: string,
  expression: string,
): Promise<unknown> {
  const client = await connectDevToolsWebSocket(webSocketUrl)

  try {
    const response = await client.request({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        awaitPromise: true,
        expression,
        returnByValue: true,
      },
    })

    return response.result?.result?.value
  } finally {
    client.close()
  }
}

type DevToolsWebSocketClient = {
  request(message: DevToolsRequest): Promise<DevToolsResponse>
  close(): void
}

type DevToolsRequest = {
  id: number
  method: string
  params?: Record<string, unknown>
}

type DevToolsResponse = {
  id?: number
  result?: {
    result?: {
      value?: unknown
    }
  }
}

async function connectDevToolsWebSocket(
  webSocketUrl: string,
): Promise<DevToolsWebSocketClient> {
  const url = new URL(webSocketUrl)
  const socket = createConnection({
    host: url.hostname,
    port: Number(url.port),
  })
  const acceptKey = cryptoRandomBase64(16)
  let readBuffer: Buffer<ArrayBufferLike> = Buffer.alloc(0)

  await new Promise<void>((resolve, reject) => {
    socket.once('error', reject)
    socket.once('connect', () => {
      socket.write(
        [
          `GET ${url.pathname}${url.search} HTTP/1.1`,
          `Host: ${url.host}`,
          'Upgrade: websocket',
          'Connection: Upgrade',
          `Sec-WebSocket-Key: ${acceptKey}`,
          'Sec-WebSocket-Version: 13',
          '\r\n',
        ].join('\r\n'),
      )
    })
    socket.once('data', (chunk) => {
      readBuffer = Buffer.concat([readBuffer, chunk])
      const headerEnd = readBuffer.indexOf('\r\n\r\n')

      if (headerEnd === -1) {
        reject(new Error('DevTools WebSocket handshake failed.'))
        return
      }

      const header = readBuffer.subarray(0, headerEnd).toString('utf8')
      if (!header.includes(' 101 ')) {
        reject(new Error('DevTools WebSocket upgrade was rejected.'))
        return
      }

      readBuffer = readBuffer.subarray(headerEnd + 4)
      resolve()
    })
  })

  return {
    request(message) {
      socket.write(encodeWebSocketFrame(JSON.stringify(message)))

      return new Promise((resolve, reject) => {
        const handleData = (chunk: Buffer) => {
          readBuffer = Buffer.concat([readBuffer, chunk])
          const decodedFrame = decodeWebSocketFrame(readBuffer)

          if (!decodedFrame) {
            return
          }

          readBuffer = decodedFrame.remaining
          socket.off('error', reject)
          socket.off('data', handleData)
          resolve(JSON.parse(decodedFrame.payload.toString('utf8')))
        }

        socket.on('data', handleData)
        socket.once('error', reject)
      })
    },
    close() {
      socket.end()
    },
  }
}

function encodeWebSocketFrame(payloadText: string): Buffer {
  const payload = Buffer.from(payloadText)
  const mask = randomBytes(4)
  const headerLength = payload.length < 126 ? 6 : 8
  const frame = Buffer.alloc(headerLength + payload.length)

  frame[0] = 0x81
  if (payload.length < 126) {
    frame[1] = 0x80 | payload.length
    mask.copy(frame, 2)
  } else {
    frame[1] = 0x80 | 126
    frame.writeUInt16BE(payload.length, 2)
    mask.copy(frame, 4)
  }

  const payloadOffset = headerLength
  for (let index = 0; index < payload.length; index += 1) {
    frame[payloadOffset + index] = payload[index] ^ mask[index % 4]
  }

  return frame
}

function decodeWebSocketFrame(
  buffer: Buffer<ArrayBufferLike>,
): {
  payload: Buffer<ArrayBufferLike>
  remaining: Buffer<ArrayBufferLike>
} | null {
  if (buffer.length < 2) {
    return null
  }

  const payloadLengthIndicator = buffer[1] & 0x7f
  const payloadOffset = payloadLengthIndicator === 126 ? 4 : 2
  const payloadLength =
    payloadLengthIndicator === 126
      ? buffer.readUInt16BE(2)
      : payloadLengthIndicator

  if (buffer.length < payloadOffset + payloadLength) {
    return null
  }

  return {
    payload: buffer.subarray(payloadOffset, payloadOffset + payloadLength),
    remaining: buffer.subarray(payloadOffset + payloadLength),
  }
}

function cryptoRandomBase64(byteLength: number): string {
  return randomBytes(byteLength).toString('base64')
}

function isBrowserTabGroupStateSnapshot(
  value: unknown,
): value is BrowserTabGroupStateSnapshot {
  if (!value || typeof value !== 'object') {
    return false
  }

  const snapshot = value as BrowserTabGroupStateSnapshot
  return (
    typeof snapshot.capturedAt === 'string' &&
    Array.isArray(snapshot.tabs) &&
    Array.isArray(snapshot.groups) &&
    snapshot.tabs.every(
      (tab) =>
        typeof tab === 'object' &&
        typeof tab.windowId === 'number' &&
        typeof tab.index === 'number' &&
        typeof tab.url === 'string' &&
        typeof tab.active === 'boolean' &&
        typeof tab.pinned === 'boolean',
    ) &&
    snapshot.groups.every(
      (group) =>
        typeof group === 'object' &&
        typeof group.id === 'number' &&
        typeof group.windowId === 'number' &&
        typeof group.color === 'string' &&
        typeof group.collapsed === 'boolean',
    )
  )
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
