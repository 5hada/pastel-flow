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
} from './browserNativeBridgeBroker'
import type { BrowserBridgeEvent } from './browserBridgeSchemas'

export type BrowserActionGroupRunResult = {
  message: string
  runtimeId: string
}

export type BrowserActionGroupStopResult = {
  config: BrowserTabGroupConfig
  state: Partial<ActionRuntimeState>
  message: string
}

type RunningBrowserActionGroup = {
  actionConfigs: Map<string, BrowserTabGroupConfig>
  actionIds: Set<string>
  actionSnapshotHandlers: Map<
    string,
    (config: BrowserTabGroupConfig, state: Partial<ActionRuntimeState>) => Promise<void>
  >
  bridge: BrowserActionGroupBridge
  runtimeId: string
}

type InstalledBrowserBridge = {
  bridge: BrowserActionGroupBridge
  dispose(): void
}

type BrowserActionGroupRuntimeOptions = {
  dataDir: string
  onActionSnapshot(
    actionId: string,
    config: BrowserTabGroupConfig,
    state: Partial<ActionRuntimeState>,
  ): Promise<void>
}

const installedBridgesByDataDir = new Map<string, Promise<InstalledBrowserBridge>>()
const actionGroupsByActionId = new Map<string, RunningBrowserActionGroup>()

export async function startOrAttachBrowserActionGroup(
  actionId: string,
  config: BrowserTabGroupConfig,
  options: BrowserActionGroupRuntimeOptions,
): Promise<BrowserActionGroupRunResult> {
  const installedBridge = await getInstalledBrowserBridge(options.dataDir)
  const actionGroup = createActionGroupRuntime(
    options.dataDir,
    installedBridge.bridge,
  )

  attachAction(actionGroup, actionId, config, options.onActionSnapshot)
  await actionGroup.bridge.checkHealth()
  await actionGroup.bridge.ensureGroup(config.browserGroupId, config.initialUrls)

  return {
    runtimeId: actionGroup.runtimeId,
    message: '압축해제된 Pastel Flow 확장 프로그램으로 브라우저 Action 그룹을 열었습니다.',
  }
}

export async function stopBrowserActionGroup(
  actionId: string,
): Promise<BrowserActionGroupStopResult> {
  const actionGroup = actionGroupsByActionId.get(actionId)
  const config = actionGroup?.actionConfigs.get(actionId)

  if (!actionGroup || !config) {
    throw new Error('관리 중인 브라우저 Action 그룹을 찾지 못했습니다.')
  }

  const snapshot = await actionGroup.bridge.closeGroup(config.browserGroupId)
  detachAction(actionGroup, actionId)

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
  return actionGroupsByActionId.has(actionId)
    ? {
        status: 'running',
        lastError: undefined,
      }
    : undefined
}

export async function initializeBrowserActionGroupRuntime(
  dataDir: string,
): Promise<void> {
  await getInstalledBrowserBridge(dataDir)
}

export function disposeBrowserActionGroupRuntime(): void {
  actionGroupsByActionId.clear()
  installedBridgesByDataDir.forEach((bridgePromise) => {
    void bridgePromise
      .then((installedBridge) => {
        installedBridge.dispose()
      })
      .catch(() => undefined)
  })
  installedBridgesByDataDir.clear()
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
  const unsubscribeDisconnect = broker.onClientDisconnected(() => {
    void markDisconnectedActionGroups(bridge)
  })
  const unsubscribeEvent = broker.onEvent((event) => {
    void handleBrowserBridgeEvent(bridge, event)
  })

  return {
    bridge,
    dispose() {
      unsubscribeDisconnect()
      unsubscribeEvent()
      bridge.dispose()
      broker.dispose()
    },
  }
}

async function handleBrowserBridgeEvent(
  bridge: BrowserActionGroupBridge,
  event: BrowserBridgeEvent,
): Promise<void> {
  switch (event.type) {
    case 'managedGroupClosed':
      await markClosedActionGroups(
        bridge,
        event.browserGroupId,
        event.snapshot
          ? {
              urls: event.snapshot.tabs.map((tab) => tab.url).filter(Boolean),
              tabGroupSnapshot: event.snapshot,
            }
          : { urls: [] },
      )
      return
  }
}

function createActionGroupRuntime(
  dataDir: string,
  bridge: BrowserActionGroupBridge,
): RunningBrowserActionGroup {
  return {
    actionConfigs: new Map(),
    actionIds: new Set(),
    actionSnapshotHandlers: new Map(),
    bridge,
    runtimeId: `installed-extension:${dataDir}`,
  }
}

function attachAction(
  actionGroup: RunningBrowserActionGroup,
  actionId: string,
  config: BrowserTabGroupConfig,
  onActionSnapshot: BrowserActionGroupRuntimeOptions['onActionSnapshot'],
): void {
  actionGroup.actionIds.add(actionId)
  actionGroup.actionConfigs.set(actionId, config)
  actionGroup.actionSnapshotHandlers.set(actionId, (nextConfig, state) =>
    onActionSnapshot(actionId, nextConfig, state),
  )
  actionGroup.bridge.trackGroup(config.browserGroupId)
  actionGroupsByActionId.set(actionId, actionGroup)
}

function detachAction(
  actionGroup: RunningBrowserActionGroup,
  actionId: string,
): void {
  const config = actionGroup.actionConfigs.get(actionId)
  actionGroup.actionIds.delete(actionId)
  actionGroup.actionConfigs.delete(actionId)
  actionGroup.actionSnapshotHandlers.delete(actionId)
  actionGroupsByActionId.delete(actionId)

  if (config) {
    actionGroup.bridge.untrackGroup(config.browserGroupId)
  }
}

async function markDisconnectedActionGroups(
  bridge: BrowserActionGroupBridge,
): Promise<void> {
  const disconnectedActionGroups = [
    ...new Set(
      [...actionGroupsByActionId.values()].filter(
        (actionGroup) => actionGroup.bridge === bridge,
      ),
    ),
  ]

  await Promise.all(
    disconnectedActionGroups.flatMap((actionGroup) =>
      [...actionGroup.actionConfigs.entries()].map(async ([actionId, config]) => {
        await actionGroup.actionSnapshotHandlers.get(actionId)?.(config, {
          status: 'idle',
          endedAt: new Date().toISOString(),
          lastError: undefined,
          lastMessage:
            '브라우저 확장 연결이 끊겨 브라우저 Action 그룹 제어를 중지했습니다.',
        })
        detachAction(actionGroup, actionId)
      }),
    ),
  )
}

async function markClosedActionGroups(
  bridge: BrowserActionGroupBridge,
  browserGroupId: string,
  snapshot: BrowserStateSnapshot,
): Promise<void> {
  const closedActionGroups = [
    ...new Set(
      [...actionGroupsByActionId.values()].filter(
        (actionGroup) => actionGroup.bridge === bridge,
      ),
    ),
  ]

  await Promise.all(
    closedActionGroups.flatMap((actionGroup) =>
      [...actionGroup.actionConfigs.entries()]
        .filter(([, config]) => config.browserGroupId === browserGroupId)
        .map(async ([actionId, config]) => {
          const nextConfig = applySnapshotToConfig(config, snapshot)
          await actionGroup.actionSnapshotHandlers.get(actionId)?.(nextConfig, {
            status: 'idle',
            endedAt: new Date().toISOString(),
            lastError: undefined,
            lastMessage:
              '브라우저에서 탭 그룹이 닫혀 브라우저 Action 그룹 제어를 중지했습니다.',
          })
          detachAction(actionGroup, actionId)
        }),
    ),
  )
}

function applySnapshotToConfig(
  config: BrowserTabGroupConfig,
  snapshot: BrowserStateSnapshot,
): BrowserTabGroupConfig {
  if (!config.dynamicTemplateUpdates) {
    return config
  }

  return {
    ...config,
    initialUrls: snapshot.urls.length > 0 ? snapshot.urls : config.initialUrls,
    tabGroupSnapshot: snapshot.tabGroupSnapshot,
  }
}
