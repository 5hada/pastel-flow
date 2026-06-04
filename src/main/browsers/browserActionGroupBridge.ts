import type {
  BrowserTabGroupStateSnapshot,
} from '../../shared/browsers'
import {
  browserTabGroupStateSnapshotSchema,
  type BrowserBridgeCommand,
} from './browserBridgeSchemas'
import {
  createBrowserBridgeTransport,
  type BrowserBridgeTransport,
} from './browserBridgeTransport'
import type { BrowserNativeBridgeBroker } from './browserNativeBridgeBroker'
import { ensureBrowserNativeMessagingHostAssets } from './browserNativeMessagingHost'
import { normalizeTemplateUrls } from './browserUrlFilters'

export type BrowserStateSnapshot = {
  urls: string[]
  tabGroupSnapshot?: BrowserTabGroupStateSnapshot
}

export type BrowserActionGroupBridge = {
  closeGroup(browserGroupId: string): Promise<void>
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
  const interval = setInterval(() => {
    trackedGroupIds.forEach((browserGroupId) => {
      void capture(browserGroupId).catch(() => undefined)
    })
  }, 1000)

  return {
    closeGroup(browserGroupId) {
      return dispatchBridgeCommand(transport, {
        type: 'closeGroup',
        browserGroupId,
      }).then(() => undefined)
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
      clearInterval(interval)
      transport.dispose()
      trackedGroupIds.clear()
      latestSnapshots.clear()
    },
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
