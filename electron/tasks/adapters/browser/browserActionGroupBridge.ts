import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type {
  BrowserTabGroupStateSnapshot,
} from '../../../../src/shared/tasks'
import {
  evaluateDevToolsExpression,
  readDevToolsTargets,
} from './devToolsClient'
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

export async function ensureBrowserExtensionBridge(
  dataDir: string,
): Promise<string> {
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

export function startBrowserActionGroupBridge(
  port: number,
): BrowserActionGroupBridge {
  const trackedGroupIds = new Set<string>()
  const latestSnapshots = new Map<string, BrowserStateSnapshot>()
  const capture = async (browserGroupId: string) => {
    const snapshot = await readBrowserStateSnapshot(port, browserGroupId)
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
      return dispatchBridgeCommand(port, {
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
      await dispatchBridgeCommand(port, {
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
      trackedGroupIds.clear()
      latestSnapshots.clear()
    },
  }
}

const extensionManifest = {
  manifest_version: 3,
  name: 'Pastel Flow Tab Group Bridge',
  version: '0.2.0',
  description: 'Controls browser tab groups for Pastel Flow Actions.',
  permissions: ['tabs', 'tabGroups', 'storage'],
  background: {
    service_worker: 'background.js',
  },
}

const extensionBackground = `
const GROUP_TITLE_PREFIX = 'Pastel Flow · '
const STORAGE_KEY = 'pastelFlowManagedGroups'

chrome.runtime.onInstalled.addListener(() => undefined)
chrome.runtime.onStartup.addListener(() => undefined)
chrome.tabs.onCreated.addListener(() => undefined)
chrome.tabs.onUpdated.addListener(() => undefined)
chrome.tabs.onRemoved.addListener(() => undefined)
chrome.tabGroups.onCreated.addListener(() => undefined)
chrome.tabGroups.onUpdated.addListener(() => undefined)
chrome.tabGroups.onRemoved.addListener(() => undefined)

function getGroupTitle(browserGroupId) {
  return GROUP_TITLE_PREFIX + browserGroupId
}

function queryTabGroups(queryInfo) {
  return new Promise((resolve) => chrome.tabGroups.query(queryInfo, resolve))
}

function queryTabs(queryInfo) {
  return new Promise((resolve) => chrome.tabs.query(queryInfo, resolve))
}

function createTab(url) {
  return new Promise((resolve) => {
    chrome.tabs.create({ url, active: false }, (tab) => resolve(tab))
  })
}

function groupTabs(tabIds) {
  return new Promise((resolve) => chrome.tabs.group({ tabIds }, resolve))
}

function updateGroup(groupId, updateProperties) {
  return new Promise((resolve) => {
    chrome.tabGroups.update(groupId, updateProperties, resolve)
  })
}

function removeTabs(tabIds) {
  return new Promise((resolve) => chrome.tabs.remove(tabIds, resolve))
}

function getStorageValue(key) {
  return new Promise((resolve) => chrome.storage.local.get(key, resolve))
}

function setStorageValue(value) {
  return new Promise((resolve) => chrome.storage.local.set(value, resolve))
}

async function readManagedGroups() {
  const stored = await getStorageValue(STORAGE_KEY)
  const groups = stored[STORAGE_KEY]
  return groups && typeof groups === 'object' ? groups : {}
}

async function writeManagedGroup(browserGroupId, metadata) {
  const groups = await readManagedGroups()
  await setStorageValue({
    [STORAGE_KEY]: {
      ...groups,
      [browserGroupId]: {
        ...metadata,
        browserGroupId,
        updatedAt: new Date().toISOString(),
      },
    },
  })
}

async function deleteManagedGroup(browserGroupId) {
  const groups = await readManagedGroups()
  const nextGroups = { ...groups }
  delete nextGroups[browserGroupId]
  await setStorageValue({ [STORAGE_KEY]: nextGroups })
}

async function findGroupById(groupId) {
  if (typeof groupId !== 'number') {
    return undefined
  }

  const groups = await queryTabGroups({})
  return groups.find((group) => group.id === groupId)
}

async function findGroupByTitle(browserGroupId) {
  const title = getGroupTitle(browserGroupId)
  const groups = await queryTabGroups({})
  return groups.find((group) => group.title === title)
}

async function findManagedGroup(browserGroupId) {
  const managedGroups = await readManagedGroups()
  const metadata = managedGroups[browserGroupId]
  const storedGroup = await findGroupById(metadata && metadata.groupId)

  if (storedGroup) {
    return storedGroup
  }

  const titledGroup = await findGroupByTitle(browserGroupId)
  if (titledGroup) {
    await writeManagedGroup(browserGroupId, {
      groupId: titledGroup.id,
      windowId: titledGroup.windowId,
      title: titledGroup.title,
    })
  }

  return titledGroup
}

async function snapshotGroup(browserGroupId) {
  const managedGroup = await findManagedGroup(browserGroupId)
  const groups = managedGroup ? [managedGroup] : []
  const groupIds = new Set(groups.map((group) => group.id))
  const tabs = (await queryTabs({})).filter((tab) => groupIds.has(tab.groupId))

  return {
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
  }
}

async function ensureGroup(browserGroupId, initialUrls) {
  const existingGroup = await findManagedGroup(browserGroupId)
  if (existingGroup) {
    await writeManagedGroup(browserGroupId, {
      groupId: existingGroup.id,
      windowId: existingGroup.windowId,
      title: existingGroup.title,
    })
    return { groupId: existingGroup.id, existing: true }
  }

  const tabs = await Promise.all(initialUrls.map(createTab))
  const tabIds = tabs
    .map((tab) => tab.id)
    .filter((tabId) => typeof tabId === 'number')

  if (tabIds.length === 0) {
    return { groupId: undefined, existing: false }
  }

  const groupId = await groupTabs(tabIds)
  await updateGroup(groupId, {
    title: getGroupTitle(browserGroupId),
    color: 'blue',
  })
  const createdGroup = await findGroupById(groupId)
  await writeManagedGroup(browserGroupId, {
    groupId,
    windowId: createdGroup && createdGroup.windowId,
    title: getGroupTitle(browserGroupId),
    tabIds,
  })

  return { groupId, existing: false }
}

async function closeGroup(browserGroupId) {
  const snapshot = await snapshotGroup(browserGroupId)
  const tabIds = snapshot.tabs
    .map((tab) => tab.id)
    .filter((tabId) => typeof tabId === 'number')

  if (tabIds.length === 0) {
    return { closed: 0 }
  }

  await removeTabs(tabIds)
  await deleteManagedGroup(browserGroupId)
  return { closed: tabIds.length }
}

globalThis.pastelFlowBridge = {
  async handle(command) {
    switch (command.type) {
      case 'ping':
        return { ok: true, version: '0.3.0' }
      case 'ensureGroup':
        return ensureGroup(command.browserGroupId, command.initialUrls || [])
      case 'snapshotGroup':
        return snapshotGroup(command.browserGroupId)
      case 'closeGroup':
        return closeGroup(command.browserGroupId)
      default:
        throw new Error('Unknown Pastel Flow bridge command: ' + command.type)
    }
  },
}
`

type BrowserBridgeCommand =
  | {
      type: 'ping'
    }
  | {
      type: 'ensureGroup'
      browserGroupId: string
      initialUrls: string[]
    }
  | {
      type: 'snapshotGroup' | 'closeGroup'
      browserGroupId: string
    }

async function readBrowserStateSnapshot(
  port: number,
  browserGroupId: string,
): Promise<BrowserStateSnapshot> {
  const value = await dispatchBridgeCommand(port, {
    type: 'snapshotGroup',
    browserGroupId,
  })

  const tabGroupSnapshot = isBrowserTabGroupStateSnapshot(value)
    ? value
    : undefined

  return {
    urls: tabGroupSnapshot
      ? normalizeTemplateUrls(tabGroupSnapshot.tabs.map((tab) => tab.url))
      : [],
    tabGroupSnapshot,
  }
}

async function dispatchBridgeCommand(
  port: number,
  command: BrowserBridgeCommand,
): Promise<unknown> {
  const extensionTarget = await waitForExtensionTarget(port)

  return evaluateDevToolsExpression(
    extensionTarget.webSocketDebuggerUrl,
    `globalThis.pastelFlowBridge.handle(${JSON.stringify(command)})`,
  )
}

async function waitForExtensionTarget(port: number) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < 5000) {
    const targets = await readDevToolsTargets(port)
    const extensionTarget = targets.find(
      (target) =>
        target.type === 'service_worker' &&
        target.url?.endsWith('/background.js') &&
        target.webSocketDebuggerUrl,
    )

    if (extensionTarget?.webSocketDebuggerUrl) {
      return extensionTarget as typeof extensionTarget & {
        webSocketDebuggerUrl: string
      }
    }

    await delay(150)
  }

  throw new Error('브라우저 Action 그룹을 제어할 확장 브리지를 찾지 못했습니다.')
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
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
    Array.isArray(snapshot.groups)
  )
}
