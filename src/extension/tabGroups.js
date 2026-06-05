import {
  GROUP_TITLE_PREFIX,
  MANAGED_GROUPS_STORAGE_KEY,
} from './constants.js'

const groupReconciliationDelays = [250, 1200]
const pendingReconciliationTimers = new Map()
let managedGroupTrackingStarted = false
let postManagedGroupEvent = () => undefined

export async function handleCommand(command) {
  switch (command.type) {
    case 'ping':
      return {
        ok: true,
        transport: 'native-messaging',
        version: getExtensionVersion(),
      }
    case 'health':
      return {
        managedGroupCount: Object.keys(await readManagedGroups()).length,
        ok: true,
        transport: 'native-messaging',
        version: getExtensionVersion(),
      }
    case 'ensureGroup':
      return ensureGroup(command.browserGroupId, command.initialUrls || [])
    case 'snapshotGroup':
      return snapshotGroup(command.browserGroupId)
    case 'closeGroup':
      return closeGroup(command.browserGroupId)
    default:
      throw new Error(`Unknown Pastel Flow command: ${String(command.type)}`)
  }
}

export function startManagedGroupTracking(postEvent = () => undefined) {
  postManagedGroupEvent = postEvent
  if (managedGroupTrackingStarted) {
    return
  }

  managedGroupTrackingStarted = true
  chrome.tabs.onCreated.addListener(scheduleManagedGroupReconciliation)
  chrome.tabs.onUpdated.addListener(scheduleManagedGroupReconciliation)
  chrome.tabs.onRemoved.addListener(scheduleManagedGroupReconciliation)
  chrome.tabs.onAttached.addListener(scheduleManagedGroupReconciliation)
  chrome.tabs.onDetached.addListener(scheduleManagedGroupReconciliation)
  chrome.tabs.onMoved.addListener(scheduleManagedGroupReconciliation)
  chrome.tabGroups.onCreated.addListener(scheduleManagedGroupReconciliation)
  chrome.tabGroups.onUpdated.addListener(scheduleManagedGroupReconciliation)
  chrome.tabGroups.onRemoved.addListener(scheduleManagedGroupReconciliation)
}

async function ensureGroup(browserGroupId, initialUrls) {
  assertBrowserGroupId(browserGroupId)
  const existingGroup = await findManagedGroup(browserGroupId)
  if (existingGroup) {
    const snapshot = await createManagedGroupSnapshot(
      browserGroupId,
      [existingGroup],
    )
    await writeManagedGroup(browserGroupId, {
      groupId: existingGroup.id,
      snapshot,
      tabIds: snapshot.tabs
        .map((tab) => tab.id)
        .filter((tabId) => typeof tabId === 'number'),
      tabUrls: createTabUrlMap(snapshot),
      title: existingGroup.title,
      windowId: existingGroup.windowId,
    })
    return {
      existing: true,
      groupId: existingGroup.id,
    }
  }

  const urls = normalizeUrls(initialUrls)
  if (urls.length === 0) {
    return {
      existing: false,
      groupId: undefined,
    }
  }

  const tabs = await Promise.all(urls.map(createInactiveTab))
  const tabIds = tabs
    .map((tab) => tab.id)
    .filter((tabId) => typeof tabId === 'number')

  if (tabIds.length === 0) {
    return {
      existing: false,
      groupId: undefined,
    }
  }

  const groupId = await groupTabs(tabIds)
  await updateGroup(groupId, {
    color: 'blue',
    title: getGroupTitle(browserGroupId),
  })
  const group = await findGroupById(groupId)
  const initialTabUrls = Object.fromEntries(
    tabs
      .map((tab, index) =>
        typeof tab.id === 'number' ? [String(tab.id), urls[index] || ''] : undefined,
      )
      .filter((entry) => Array.isArray(entry)),
  )
  await writeManagedGroup(browserGroupId, {
    groupId,
    snapshot: await createManagedGroupSnapshot(browserGroupId, group ? [group] : [], initialTabUrls),
    tabIds,
    tabUrls: initialTabUrls,
    title: getGroupTitle(browserGroupId),
    windowId: group?.windowId,
  })

  return {
    existing: false,
    groupId,
  }
}

async function closeGroup(browserGroupId) {
  assertBrowserGroupId(browserGroupId)
  const snapshot = await captureSettledManagedGroupSnapshot(browserGroupId)
  const tabIds = snapshot.tabs
    .map((tab) => tab.id)
    .filter((tabId) => typeof tabId === 'number')

  if (tabIds.length > 0) {
    await removeTabs(tabIds)
  }

  await deleteManagedGroup(browserGroupId)

  return {
    closed: tabIds.length,
    snapshot,
  }
}

async function snapshotGroup(browserGroupId) {
  assertBrowserGroupId(browserGroupId)
  return captureManagedGroupSnapshot(browserGroupId)
}

async function captureSettledManagedGroupSnapshot(browserGroupId) {
  await reconcileManagedGroup(browserGroupId)
  await delay(400)
  return captureManagedGroupSnapshot(browserGroupId)
}

async function captureManagedGroupSnapshot(browserGroupId) {
  await reconcileManagedGroup(browserGroupId)
  const managedGroups = await readManagedGroups()
  const snapshot = managedGroups[browserGroupId]?.snapshot

  if (isManagedGroupSnapshot(snapshot)) {
    return snapshot
  }

  return createLiveManagedGroupSnapshot(browserGroupId)
}

async function createLiveManagedGroupSnapshot(browserGroupId) {
  const group = await findManagedGroup(browserGroupId)
  const groups = group ? [group] : []
  const groupIds = new Set(groups.map((currentGroup) => currentGroup.id))
  const tabs = group
    ? (await queryTabs({})).filter((tab) => groupIds.has(tab.groupId))
    : await findManagedUngroupedTabs(browserGroupId)

  if (!group && tabs.length === 0) {
    await deleteManagedGroup(browserGroupId)
  }

  return {
    capturedAt: new Date().toISOString(),
    groups: groups.map(normalizeGroupSnapshot),
    tabs: tabs.map(normalizeTabSnapshot),
  }
}

async function reconcileManagedGroups() {
  const managedGroups = await readManagedGroups()
  await Promise.all(
    Object.keys(managedGroups).map((browserGroupId) =>
      reconcileManagedGroup(browserGroupId),
    ),
  )
}

async function reconcileManagedGroup(browserGroupId) {
  const managedGroups = await readManagedGroups()
  const metadata = managedGroups[browserGroupId]
  if (!metadata) {
    return
  }

  const group = await findGroupById(metadata.groupId) ??
    await findGroupByTitle(browserGroupId)
  const groups = group ? [group] : []
  const snapshot = group
    ? await createManagedGroupSnapshot(browserGroupId, groups, metadata.tabUrls)
    : await createUngroupedManagedSnapshot(browserGroupId)

  if (snapshot.tabs.length === 0 && snapshot.groups.length === 0) {
    await deleteManagedGroup(browserGroupId)
    postManagedGroupEvent({
      browserGroupId,
      snapshot: metadata.snapshot,
      type: 'managedGroupClosed',
    })
    return
  }

  await writeManagedGroup(browserGroupId, {
    groupId: group?.id ?? metadata.groupId,
    snapshot,
    tabIds: snapshot.tabs
      .map((tab) => tab.id)
      .filter((tabId) => typeof tabId === 'number'),
    tabUrls: createTabUrlMap(snapshot),
    title: group?.title ?? metadata.title,
    windowId: group?.windowId ?? metadata.windowId,
  })
}

async function createManagedGroupSnapshot(_browserGroupId, groups, tabUrlFallbacks = {}) {
  const groupIds = new Set(groups.map((group) => group.id))
  const tabs = (await queryTabs({})).filter((tab) => groupIds.has(tab.groupId))

  return {
    capturedAt: new Date().toISOString(),
    groups: groups.map(normalizeGroupSnapshot),
    tabs: tabs.map((tab) => normalizeTabSnapshot(tab, tabUrlFallbacks[String(tab.id)])),
  }
}

async function createUngroupedManagedSnapshot(browserGroupId) {
  const managedGroups = await readManagedGroups()
  const metadata = managedGroups[browserGroupId]
  const tabs = await findManagedUngroupedTabs(browserGroupId)

  return {
    capturedAt: new Date().toISOString(),
    groups: [],
    tabs: tabs.map((tab) => normalizeTabSnapshot(tab, metadata?.tabUrls?.[String(tab.id)])),
  }
}

async function findManagedGroup(browserGroupId) {
  const managedGroups = await readManagedGroups()
  const metadata = managedGroups[browserGroupId]
  const storedGroup = await findGroupById(metadata?.groupId)

  if (storedGroup) {
    return storedGroup
  }

  const titledGroup = await findGroupByTitle(browserGroupId)
  if (titledGroup) {
    await writeManagedGroup(browserGroupId, {
      groupId: titledGroup.id,
      title: titledGroup.title,
      windowId: titledGroup.windowId,
    })
  }

  return titledGroup
}

async function findManagedUngroupedTabs(browserGroupId) {
  const managedGroups = await readManagedGroups()
  const metadata = managedGroups[browserGroupId]
  const tabIds = Array.isArray(metadata?.tabIds) ? metadata.tabIds : []
  if (tabIds.length === 0) {
    return []
  }

  const tabs = await queryTabs({})
  const tabIdSet = new Set(tabIds)
  return tabs.filter((tab) => tab.id && tabIdSet.has(tab.id))
}

async function findGroupById(groupId) {
  if (typeof groupId !== 'number') {
    return undefined
  }

  return (await queryTabGroups({})).find((group) => group.id === groupId)
}

async function findGroupByTitle(browserGroupId) {
  const title = getGroupTitle(browserGroupId)
  return (await queryTabGroups({})).find((group) => group.title === title)
}

async function readManagedGroups() {
  const stored = await chrome.storage.local.get(MANAGED_GROUPS_STORAGE_KEY)
  const groups = stored[MANAGED_GROUPS_STORAGE_KEY]
  return groups && typeof groups === 'object' ? groups : {}
}

async function writeManagedGroup(browserGroupId, metadata) {
  const groups = await readManagedGroups()
  await chrome.storage.local.set({
    [MANAGED_GROUPS_STORAGE_KEY]: {
      ...groups,
      [browserGroupId]: {
        ...metadata,
        browserGroupId,
        updatedAt: new Date().toISOString(),
      },
    },
  })
}

function scheduleManagedGroupReconciliation() {
  for (const delayMs of groupReconciliationDelays) {
    const existingTimer = pendingReconciliationTimers.get(delayMs)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    const timer = setTimeout(() => {
      pendingReconciliationTimers.delete(delayMs)
      void reconcileManagedGroups().catch(() => undefined)
    }, delayMs)
    pendingReconciliationTimers.set(delayMs, timer)
  }
}

async function deleteManagedGroup(browserGroupId) {
  const groups = await readManagedGroups()
  const nextGroups = { ...groups }
  delete nextGroups[browserGroupId]
  await chrome.storage.local.set({
    [MANAGED_GROUPS_STORAGE_KEY]: nextGroups,
  })
}

function getGroupTitle(browserGroupId) {
  return `${GROUP_TITLE_PREFIX}${getShortBrowserGroupId(browserGroupId)}`
}

function getShortBrowserGroupId(browserGroupId) {
  const normalizedId = browserGroupId.replace(/^browser-group-/, '')
  return normalizedId.length > 8 ? normalizedId.slice(0, 8) : normalizedId
}

function assertBrowserGroupId(browserGroupId) {
  if (typeof browserGroupId !== 'string' || !browserGroupId.trim()) {
    throw new Error('browserGroupId is required.')
  }
}

function normalizeUrls(urls) {
  return Array.isArray(urls)
    ? urls
        .map(normalizeNavigationUrl)
        .filter((url) => url !== null)
    : []
}

function normalizeNavigationUrl(value) {
  if (typeof value !== 'string') {
    return null
  }

  try {
    const trimmedValue = value.trim()
    const url = new URL(
      /^[a-z][a-z\d+.-]*:/i.test(trimmedValue)
        ? trimmedValue
        : `https://${trimmedValue}`,
    )

    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : null
  } catch {
    return null
  }
}

function normalizeTabSnapshot(tab, fallbackUrl = '') {
  return {
    active: Boolean(tab.active),
    groupId:
      tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE
        ? undefined
        : tab.groupId,
    id: tab.id,
    index: tab.index,
    pinned: Boolean(tab.pinned),
    title: tab.title || undefined,
    url: tab.url || tab.pendingUrl || fallbackUrl,
    windowId: tab.windowId,
  }
}

function normalizeGroupSnapshot(group) {
  return {
    collapsed: Boolean(group.collapsed),
    color: group.color,
    id: group.id,
    title: group.title || undefined,
    windowId: group.windowId,
  }
}

function createInactiveTab(url) {
  return chrome.tabs.create({
    active: false,
    url,
  })
}

function groupTabs(tabIds) {
  return chrome.tabs.group({ tabIds })
}

function updateGroup(groupId, updateProperties) {
  return chrome.tabGroups.update(groupId, updateProperties)
}

function removeTabs(tabIds) {
  return chrome.tabs.remove(tabIds)
}

function queryTabs(queryInfo) {
  return chrome.tabs.query(queryInfo)
}

function queryTabGroups(queryInfo) {
  return chrome.tabGroups.query(queryInfo)
}

function getExtensionVersion() {
  return chrome.runtime.getManifest().version
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

function isManagedGroupSnapshot(value) {
  return (
    value &&
    typeof value.capturedAt === 'string' &&
    Array.isArray(value.groups) &&
    Array.isArray(value.tabs)
  )
}

function createTabUrlMap(snapshot) {
  return Object.fromEntries(
    snapshot.tabs
      .filter((tab) => typeof tab.id === 'number' && tab.url)
      .map((tab) => [String(tab.id), tab.url]),
  )
}
