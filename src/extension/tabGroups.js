import {
  EXTENSION_VERSION,
  GROUP_TITLE_PREFIX,
  MANAGED_GROUPS_STORAGE_KEY,
} from './constants.js'

export async function handleCommand(command) {
  switch (command.type) {
    case 'ping':
      return {
        ok: true,
        transport: 'native-messaging',
        version: EXTENSION_VERSION,
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

async function ensureGroup(browserGroupId, initialUrls) {
  assertBrowserGroupId(browserGroupId)
  const existingGroup = await findManagedGroup(browserGroupId)
  if (existingGroup) {
    await writeManagedGroup(browserGroupId, {
      groupId: existingGroup.id,
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
  await writeManagedGroup(browserGroupId, {
    groupId,
    tabIds,
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
  const snapshot = await snapshotGroup(browserGroupId)
  const tabIds = snapshot.tabs
    .map((tab) => tab.id)
    .filter((tabId) => typeof tabId === 'number')

  if (tabIds.length > 0) {
    await removeTabs(tabIds)
  }

  await deleteManagedGroup(browserGroupId)

  return {
    closed: tabIds.length,
  }
}

async function snapshotGroup(browserGroupId) {
  assertBrowserGroupId(browserGroupId)
  const group = await findManagedGroup(browserGroupId)
  const groups = group ? [group] : []
  const groupIds = new Set(groups.map((currentGroup) => currentGroup.id))
  const tabs = (await queryTabs({})).filter((tab) => groupIds.has(tab.groupId))

  return {
    capturedAt: new Date().toISOString(),
    groups: groups.map(normalizeGroupSnapshot),
    tabs: tabs.map(normalizeTabSnapshot),
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

async function deleteManagedGroup(browserGroupId) {
  const groups = await readManagedGroups()
  const nextGroups = { ...groups }
  delete nextGroups[browserGroupId]
  await chrome.storage.local.set({
    [MANAGED_GROUPS_STORAGE_KEY]: nextGroups,
  })
}

function getGroupTitle(browserGroupId) {
  return GROUP_TITLE_PREFIX + browserGroupId
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
      /^[a-z][a-z\\d+\\-.]*:/i.test(trimmedValue)
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

function normalizeTabSnapshot(tab) {
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
    url: tab.url || '',
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
