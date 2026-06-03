import { type ChildProcess } from 'node:child_process'
import { constants } from 'node:fs'
import { access, mkdir } from 'node:fs/promises'
import { createServer } from 'node:net'
import path from 'node:path'
import type { BrowserTabGroupConfig } from '../../shared/browsers'
import { ActionRuntimeState } from '../../shared/actions'
import type { BrowserExecutable } from './browserExecutableFinder'
import {
  ensureBrowserExtensionBridge,
  startBrowserActionGroupBridge,
  type BrowserActionGroupBridge,
  type BrowserStateSnapshot,
} from './browserActionGroupBridge'
import { launchBrowserProcess } from './browserProcessLauncher'
import { readDevToolsTargets } from './devToolsClient'

export type BrowserSessionRunResult = {
  localProfilePath: string
  message: string
  sessionId: string
}

export type BrowserSessionStopResult = {
  config: BrowserTabGroupConfig
  state: Partial<ActionRuntimeState>
  message: string
}

type RunningBrowserSession = {
  actionConfigs: Map<string, BrowserTabGroupConfig>
  actionIds: Set<string>
  actionSnapshotHandlers: Map<
    string,
    (config: BrowserTabGroupConfig, state: Partial<ActionRuntimeState>) => Promise<void>
  >
  bridge: BrowserActionGroupBridge
  debugPort: number
  process: ChildProcess
  processExited: boolean
  profileKey: string
  profilePath: string
  sessionId: string
}

type BrowserSessionManagerOptions = {
  dataDir: string
  executable: BrowserExecutable
  onActionSnapshot(
    actionId: string,
    config: BrowserTabGroupConfig,
    state: Partial<ActionRuntimeState>,
  ): Promise<void>
}

const sessionsByProfileKey = new Map<string, RunningBrowserSession>()
const profileKeysByActionId = new Map<string, string>()

export async function startOrAttachBrowserActionGroup(
  actionId: string,
  config: BrowserTabGroupConfig,
  options: BrowserSessionManagerOptions,
): Promise<BrowserSessionRunResult> {
  const localProfilePath = getBrowserProfilePath(options.dataDir, config)
  const profileKey = getBrowserProfileKey(localProfilePath)
  const existingSession = sessionsByProfileKey.get(profileKey)

  if (existingSession && !existingSession.processExited) {
    attachAction(existingSession, actionId, config, options.onActionSnapshot)
    await existingSession.bridge.ensureGroup(
      config.browserGroupId,
      config.initialUrls,
    )

    return {
      localProfilePath,
      sessionId: existingSession.sessionId,
      message: '같은 브라우저 프로필의 기존 세션에 Action 그룹을 추가했습니다.',
    }
  }

  sessionsByProfileKey.delete(profileKey)
  const session = await launchManagedBrowserSession(
    actionId,
    config,
    localProfilePath,
    profileKey,
    options,
  )

  return {
    localProfilePath,
    sessionId: session.sessionId,
    message: `${options.executable.displayName}에 Action 그룹을 열었습니다.`,
  }
}

export async function stopBrowserActionGroup(
  actionId: string,
): Promise<BrowserSessionStopResult> {
  const session = getSessionByActionId(actionId)
  const config = session?.actionConfigs.get(actionId)

  if (!session || !config) {
    throw new Error('관리 중인 브라우저 Action 그룹을 찾지 못했습니다.')
  }

  const snapshot = await captureBestEffort(session, config.browserGroupId)
  await session.bridge.closeGroup(config.browserGroupId)
  detachAction(session, actionId)

  return {
    config: applySnapshotToConfig(config, snapshot),
    state: {
      status: 'idle',
      lastError: undefined,
    },
    message: '브라우저 Action 그룹을 닫았습니다.',
  }
}

export function readBrowserActionState(
  actionId: string,
):ActionRuntimeState | undefined {
  const session = getSessionByActionId(actionId)
  const config = session?.actionConfigs.get(actionId)

  if (!session || !config) {
    return undefined
  }

  return {
    status: session.processExited ? 'idle' : 'running',
    lastError: undefined
  }
}

export function getBrowserProfilePath(
  dataDir: string,
  config: BrowserTabGroupConfig,
): string {
  if (isExistingProfile(config)) {
    return config.existingProfilePath
  }

  return path.join(dataDir, 'browser-profiles', config.profileId)
}

export function getBrowserProfileKey(profilePath: string): string {
  return path.resolve(profilePath).toLowerCase()
}

export async function assertExistingBrowserProfile(
  config: BrowserTabGroupConfig,
): Promise<void> {
  if (!isExistingProfile(config)) {
    return
  }

  try {
    await access(config.existingProfilePath, constants.F_OK)
  } catch {
    throw new Error('기존 브라우저 프로필 경로를 찾지 못했습니다.')
  }
}

async function launchManagedBrowserSession(
  actionId: string,
  config: BrowserTabGroupConfig,
  localProfilePath: string,
  profileKey: string,
  options: BrowserSessionManagerOptions,
): Promise<RunningBrowserSession> {
  const extensionBridgePath = await ensureBrowserExtensionBridge(options.dataDir)
  const remoteDebuggingPort = await getAvailablePort()

  if (!isExistingProfile(config)) {
    await mkdir(localProfilePath, { recursive: true })
  }

  const browserProcess = await launchBrowserProcess(options.executable.path, [
    ...getBrowserProfileArgs(localProfilePath, config),
    '--no-first-run',
    '--new-window',
    'about:blank',
    `--remote-debugging-port=${remoteDebuggingPort}`,
    `--disable-extensions-except=${extensionBridgePath}`,
    `--load-extension=${extensionBridgePath}`,
  ])
  await waitForRemoteDebuggingPort(remoteDebuggingPort, localProfilePath)
  const bridge = startBrowserActionGroupBridge(remoteDebuggingPort)
  const session: RunningBrowserSession = {
    actionConfigs: new Map(),
    actionIds: new Set(),
    actionSnapshotHandlers: new Map(),
    bridge,
    debugPort: remoteDebuggingPort,
    process: browserProcess,
    processExited: false,
    profileKey,
    profilePath: localProfilePath,
    sessionId: `${profileKey}:${remoteDebuggingPort}`,
  }

  attachAction(session, actionId, config, options.onActionSnapshot)
  sessionsByProfileKey.set(profileKey, session)

  browserProcess.once('exit', () => {
    session.processExited = true
    void captureSessionBeforeDispose(session).finally(() => {
      session.bridge.dispose()
      session.actionIds.forEach((currentActionId) => {
        profileKeysByActionId.delete(currentActionId)
      })
      sessionsByProfileKey.delete(profileKey)
    })
  })

  await bridge.ensureGroup(config.browserGroupId, config.initialUrls)
  return session
}

function attachAction(
  session: RunningBrowserSession,
  actionId: string,
  config: BrowserTabGroupConfig,
  onActionSnapshot: BrowserSessionManagerOptions['onActionSnapshot'],
): void {
  session.actionIds.add(actionId)
  session.actionConfigs.set(actionId, config)
  session.actionSnapshotHandlers.set(actionId, (nextConfig, state) =>
    onActionSnapshot(actionId, nextConfig, state),
  )
  session.bridge.trackGroup(config.browserGroupId)
  profileKeysByActionId.set(actionId, session.profileKey)
}

function detachAction(session: RunningBrowserSession, actionId: string): void {
  const config = session.actionConfigs.get(actionId)
  session.actionIds.delete(actionId)
  session.actionConfigs.delete(actionId)
  session.actionSnapshotHandlers.delete(actionId)
  profileKeysByActionId.delete(actionId)

  if (config) {
    session.bridge.untrackGroup(config.browserGroupId)
  }

  if (session.actionIds.size === 0) {
    session.bridge.dispose()
    sessionsByProfileKey.delete(session.profileKey)
  }
}

function getSessionByActionId(
  actionId: string,
): RunningBrowserSession | undefined {
  const profileKey = profileKeysByActionId.get(actionId)
  return profileKey ? sessionsByProfileKey.get(profileKey) : undefined
}

async function captureSessionBeforeDispose(
  session: RunningBrowserSession,
): Promise<void> {
  await Promise.all(
    [...session.actionConfigs.entries()].map(async ([actionId, config]) => {
      const snapshot = await captureBestEffort(session, config.browserGroupId)
      const nextConfig = applySnapshotToConfig(config, snapshot)
      await session.actionSnapshotHandlers.get(actionId)?.(nextConfig, {
        status: 'idle',
        lastError: undefined,
      })
      return snapshot
    }),
  )
}

async function captureBestEffort(
  session: RunningBrowserSession,
  browserGroupId: string,
): Promise<BrowserStateSnapshot> {
  return (
    (await session.bridge.captureGroup(browserGroupId).catch(() => undefined)) ??
    session.bridge.readLatest(browserGroupId) ?? { urls: [] }
  )
}

function applySnapshotToConfig(
  config: BrowserTabGroupConfig,
  snapshot: BrowserStateSnapshot,
): BrowserTabGroupConfig {
  return {
    ...config,
    initialUrls: snapshot.urls.length > 0 ? snapshot.urls : config.initialUrls,
    tabGroupSnapshot: snapshot.tabGroupSnapshot,
  }
}

function getBrowserProfileArgs(
  profilePath: string,
  config: BrowserTabGroupConfig,
): string[] {
  return isExistingProfile(config)
    ? [
        `--user-data-dir=${path.dirname(profilePath)}`,
        `--profile-directory=${path.basename(profilePath)}`,
      ]
    : [`--user-data-dir=${profilePath}`]
}

function isExistingProfile(
  config: BrowserTabGroupConfig,
): config is BrowserTabGroupConfig & { existingProfilePath: string } {
  return (
    config.runMode === 'extension_controlled' &&
    config.profileSource === 'existing_profile' &&
    Boolean(config.existingProfilePath)
  )
}

async function getAvailablePort(): Promise<number> {
  const server = createServer()

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })

  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })

  if (!port) {
    throw new Error('브라우저 원격 디버깅 포트를 할당하지 못했습니다.')
  }

  return port
}

async function waitForRemoteDebuggingPort(
  port: number,
  profilePath: string,
): Promise<void> {
  const startedAt = Date.now()

  while (Date.now() - startedAt < 10000) {
    const targets = await readDevToolsTargets(port)
    if (targets.length > 0) {
      return
    }

    await delay(200)
  }

  throw new Error(
    [
      '브라우저 원격 디버깅 포트가 열리지 않았습니다.',
      `remoteDebuggingPort=${port}`,
      `profilePath=${profilePath}`,
      '이미 실행 중인 같은 프로필의 브라우저가 있으면 Chrome이 새 실행 인자를 무시할 수 있습니다.',
    ].join('\n'),
  )
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}
