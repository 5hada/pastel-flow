import type {
  BrowserTabGroupStateSnapshot,
} from '../../shared/browsers'
import {
  browserTabGroupStateSnapshotSchema,
  browserBridgeHealthResultSchema,
  type BrowserBridgeCommand,
} from './browserBridgeSchemas'
import {
  createBrowserBridgeTransport,
  type BrowserBridgeTransport,
} from './browserBridgeTransport'
import type { BrowserNativeBridgeBroker } from './browserNativeBridgeBroker'
import { ensureBrowserNativeMessagingHostAssets } from './browserNativeMessagingHost'
import { normalizeTemplateUrls } from './browserUrlFilters'
import { checkBrowserExtensionCompatibility } from './browserExtensionCompatibility'

export type BrowserStateSnapshot = {
  urls: string[]
  tabGroupSnapshot?: BrowserTabGroupStateSnapshot
}

export type BrowserActionGroupBridge = {
  checkHealth(): Promise<void>
  closeGroup(browserGroupId: string): Promise<BrowserStateSnapshot>
  ensureGroup(browserGroupId: string, initialUrls: string[]): Promise<void>
  captureGroup(browserGroupId: string): Promise<BrowserStateSnapshot>
  readLatest(browserGroupId: string): BrowserStateSnapshot | undefined
  trackGroup(browserGroupId: string): void
  untrackGroup(browserGroupId: string): void
  dispose(): void
}

export async function ensureInstalledBrowserExtensionBridge(
  dataDir: string,
  broker: BrowserNativeBridgeBroker,
): Promise<void> {
  await ensureBrowserNativeMessagingHostAssets(dataDir, broker.connection)
}

export function startBrowserActionGroupBridge(
  broker: BrowserNativeBridgeBroker,
): BrowserActionGroupBridge {
  const trackedGroupIds = new Set<string>()
  const latestSnapshots = new Map<string, BrowserStateSnapshot>()
  const transport = createBrowserBridgeTransport(broker)
  const capture = async (browserGroupId: string) => {
    const snapshot = await readBrowserStateSnapshot(transport, browserGroupId)
    if (snapshot.urls.length > 0 || snapshot.tabGroupSnapshot) {
      latestSnapshots.set(browserGroupId, snapshot)
    }
    return snapshot
  }

  return {
    async checkHealth() {
      const result = await dispatchBridgeCommand(transport, {
        type: 'health',
      })
      const health = browserBridgeHealthResultSchema.parse(result)
      const compatibility = checkBrowserExtensionCompatibility(health.version)
      if (!compatibility.compatible) {
        throw new Error(compatibility.reason)
      }
    },
    async closeGroup(browserGroupId) {
      const value = await dispatchBridgeCommand(transport, {
        type: 'closeGroup',
        browserGroupId,
      })
      const snapshot = parseCloseGroupSnapshot(value)
      if (snapshot) {
        latestSnapshots.set(browserGroupId, snapshot)
        return snapshot
      }

      return latestSnapshots.get(browserGroupId) ?? { urls: [] }
    },
    async ensureGroup(browserGroupId, initialUrls) {
      const targetUrls = normalizeTemplateUrls(initialUrls)
      if (targetUrls.length === 0) {
        return
      }

      trackedGroupIds.add(browserGroupId)
      await dispatchBridgeCommand(transport, {
        type: 'ensureGroup',
        browserGroupId,
        initialUrls: targetUrls,
      })
      await capture(browserGroupId).catch(() => undefined)
    },
    captureGroup(browserGroupId) {
      trackedGroupIds.add(browserGroupId)
      return capture(browserGroupId)
    },
    readLatest(browserGroupId) {
      return latestSnapshots.get(browserGroupId)
    },
    trackGroup(browserGroupId) {
      trackedGroupIds.add(browserGroupId)
    },
    untrackGroup(browserGroupId) {
      trackedGroupIds.delete(browserGroupId)
      latestSnapshots.delete(browserGroupId)
    },
    dispose() {
      transport.dispose()
      trackedGroupIds.clear()
      latestSnapshots.clear()
    },
  }
}

function parseCloseGroupSnapshot(value: unknown): BrowserStateSnapshot | undefined {
  const candidate = value as { snapshot?: unknown }
  const parsedSnapshot = browserTabGroupStateSnapshotSchema.safeParse(
    candidate?.snapshot,
  )
  if (!parsedSnapshot.success) {
    return undefined
  }

  return {
    urls: normalizeTemplateUrls(parsedSnapshot.data.tabs.map((tab) => tab.url)),
    tabGroupSnapshot: parsedSnapshot.data,
  }
}

async function readBrowserStateSnapshot(
  transport: BrowserBridgeTransport,
  browserGroupId: string,
): Promise<BrowserStateSnapshot> {
  const value = await dispatchBridgeCommand(transport, {
    type: 'snapshotGroup',
    browserGroupId,
  })

  const parsedSnapshot = browserTabGroupStateSnapshotSchema.safeParse(value)
  const tabGroupSnapshot = parsedSnapshot.success
    ? parsedSnapshot.data
    : undefined

  return {
    urls: tabGroupSnapshot
      ? normalizeTemplateUrls(tabGroupSnapshot.tabs.map((tab) => tab.url))
      : [],
    tabGroupSnapshot,
  }
}

async function dispatchBridgeCommand(
  transport: BrowserBridgeTransport,
  command: BrowserBridgeCommand,
): Promise<unknown> {
  return transport.dispatch(command)
}
