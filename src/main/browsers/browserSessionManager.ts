import type { BrowserTabGroupConfig } from '../../shared/browsers'
import { ActionRuntimeState } from '../../shared/actions'
import {
  ensureInstalledBrowserExtensionBridge,
  startBrowserActionGroupBridge,
  type BrowserActionGroupBridge,
  type BrowserStateSnapshot,
} from './browserActionGroupBridge'
import {
  createBrowserNativeBridgeBroker,
  type BrowserNativeBridgeBroker,
} from './browserNativeBridgeBroker'

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
  dataDir: string
  sessionId: string
}

type InstalledBrowserBridge = {
  bridge: BrowserActionGroupBridge
  broker: BrowserNativeBridgeBroker
}

type BrowserSessionManagerOptions = {
  dataDir: string
  onActionSnapshot(
    actionId: string,
    config: BrowserTabGroupConfig,
    state: Partial<ActionRuntimeState>,
  ): Promise<void>
}

const installedBridgesByDataDir = new Map<string, Promise<InstalledBrowserBridge>>()
const sessionsByActionId = new Map<string, RunningBrowserSession>()

export async function startOrAttachBrowserActionGroup(
  actionId: string,
  config: BrowserTabGroupConfig,
  options: BrowserSessionManagerOptions,
): Promise<BrowserSessionRunResult> {
  const installedBridge = await getInstalledBrowserBridge(options.dataDir)
  const session = getOrCreateSession(options.dataDir, installedBridge.bridge)

  attachAction(session, actionId, config, options.onActionSnapshot)
  await session.bridge.ensureGroup(config.browserGroupId, config.initialUrls)

  return {
    localProfilePath: '',
    sessionId: session.sessionId,
    message: '설치된 Pastel Flow 확장 프로그램으로 브라우저 Action 그룹을 열었습니다.',
  }
}

export async function stopBrowserActionGroup(
  actionId: string,
): Promise<BrowserSessionStopResult> {
  const session = sessionsByActionId.get(actionId)
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
): ActionRuntimeState | undefined {
  return sessionsByActionId.has(actionId)
    ? {
        status: 'running',
        lastError: undefined,
      }
    : undefined
}

async function getInstalledBrowserBridge(
  dataDir: string,
): Promise<InstalledBrowserBridge> {
  const existingBridge = installedBridgesByDataDir.get(dataDir)
  if (existingBridge) {
    return existingBridge
  }

  const bridgePromise = createInstalledBrowserBridge(dataDir)
  installedBridgesByDataDir.set(dataDir, bridgePromise)
  return bridgePromise
}

async function createInstalledBrowserBridge(
  dataDir: string,
): Promise<InstalledBrowserBridge> {
  const broker = await createBrowserNativeBridgeBroker()
  await ensureInstalledBrowserExtensionBridge(dataDir, broker)
  const bridge = startBrowserActionGroupBridge(broker)

  return {
    bridge,
    broker,
  }
}

function getOrCreateSession(
  dataDir: string,
  bridge: BrowserActionGroupBridge,
): RunningBrowserSession {
  return {
    actionConfigs: new Map(),
    actionIds: new Set(),
    actionSnapshotHandlers: new Map(),
    bridge,
    dataDir,
    sessionId: `installed-extension:${dataDir}`,
  }
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
  sessionsByActionId.set(actionId, session)
}

function detachAction(session: RunningBrowserSession, actionId: string): void {
  const config = session.actionConfigs.get(actionId)
  session.actionIds.delete(actionId)
  session.actionConfigs.delete(actionId)
  session.actionSnapshotHandlers.delete(actionId)
  sessionsByActionId.delete(actionId)

  if (config) {
    session.bridge.untrackGroup(config.browserGroupId)
  }
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
