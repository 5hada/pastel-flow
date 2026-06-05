import type {
    BrowserRunMode,
    BrowserTabGroupConfig,
    BrowserKind,
    BrowserTabGroupColor,
    BrowserTabGroupSnapshot,
    BrowserTabGroupStateSnapshot,
    BrowserTabSnapshot,
    BrowserProfileSource,
    RestorePolicy
} from './types'
import { normalizeBrowserNavigationUrls } from './urlFilters'

export const defaultBrowserRunMode: BrowserRunMode = 'extension_controlled'

export const defaultDynamicTemplateUpdates = false

export function createDefaultBrowserTabGroupConfig(
  profileId: string,
): BrowserTabGroupConfig {
  return {
    browserGroupId: `browser-group-${profileId}`,
    profileId,
    initialUrls: [],
    browserKind: 'chrome',
    restorePolicy: 'browser_profile',
    runMode: defaultBrowserRunMode,
    profileSource: 'action_profile',
    dynamicTemplateUpdates: defaultDynamicTemplateUpdates,
  }
}

export function normalizeBrowserTabGroupConfig(
  config: Partial<BrowserTabGroupConfig>,
): BrowserTabGroupConfig {
  return {
    browserGroupId:
      typeof config.browserGroupId === 'string' && config.browserGroupId.trim()
        ? config.browserGroupId.trim()
        : `browser-group-${config.profileId ?? 'default'}`,
    profileId: config.profileId ?? '',
    urlGroupId:
      typeof config.urlGroupId === 'string' && config.urlGroupId.trim()
        ? config.urlGroupId.trim()
        : undefined,
    initialUrls: Array.isArray(config.initialUrls)
      ? normalizeBrowserNavigationUrls(config.initialUrls)
      : [],
    browserKind: isBrowserKind(config.browserKind)
      ? config.browserKind
      : 'chrome',
    restorePolicy: isRestorePolicy(config.restorePolicy)
      ? config.restorePolicy
      : 'browser_profile',
    runMode: isBrowserRunMode(config.runMode)
      ? config.runMode
      : defaultBrowserRunMode,
    profileSource: isBrowserProfileSource(config.profileSource)
      ? config.profileSource
      : 'action_profile',
    existingProfilePath:
      typeof config.existingProfilePath === 'string' &&
      config.existingProfilePath.trim()
        ? config.existingProfilePath.trim()
        : undefined,
    dynamicTemplateUpdates:
      typeof config.dynamicTemplateUpdates === 'boolean'
        ? config.dynamicTemplateUpdates
        : defaultDynamicTemplateUpdates,
    tabGroupSnapshot: normalizeBrowserTabGroupStateSnapshot(
      config.tabGroupSnapshot,
    ),
  }
}

export function getBrowserRunModeLabel(runMode?: BrowserRunMode): string {
  switch (runMode ?? defaultBrowserRunMode) {
    case 'dedicated_profile':
      return '전용 프로필'
    case 'extension_controlled':
      return '확장 프로그램'
    case 'default_browser_deeplink':
      return '기본 브라우저 연결'
  }
}

function isBrowserKind(value: unknown): value is BrowserKind {
  return value === 'chrome' || value === 'edge' || value === 'chromium'
}

function isRestorePolicy(value: unknown): value is RestorePolicy {
  return value === 'browser_profile' || value === 'initial_urls_only'
}

function isBrowserRunMode(value: unknown): value is BrowserRunMode {
  return value === 'extension_controlled'
}

function isBrowserProfileSource(
  value: unknown,
): value is BrowserProfileSource {
  return value === 'action_profile' || value === 'existing_profile'
}

function normalizeBrowserTabGroupStateSnapshot(
  snapshot: unknown,
): BrowserTabGroupStateSnapshot | undefined {
  if (!snapshot || typeof snapshot !== 'object') {
    return undefined
  }

  const candidate = snapshot as Partial<BrowserTabGroupStateSnapshot>
  if (
    typeof candidate.capturedAt !== 'string' ||
    !Array.isArray(candidate.tabs) ||
    !Array.isArray(candidate.groups)
  ) {
    return undefined
  }

  const tabs = candidate.tabs.reduce<BrowserTabSnapshot[]>((result, tab) => {
    if (!tab || typeof tab !== 'object') {
      return result
    }

    const normalizedTab: BrowserTabSnapshot = {
      id:
        typeof tab.id === 'number' && Number.isFinite(tab.id)
          ? tab.id
          : undefined,
      windowId:
        typeof tab.windowId === 'number' && Number.isFinite(tab.windowId)
          ? tab.windowId
          : 0,
      index:
        typeof tab.index === 'number' && Number.isFinite(tab.index)
          ? tab.index
          : 0,
      url: typeof tab.url === 'string' ? tab.url : '',
      title: typeof tab.title === 'string' ? tab.title : undefined,
      groupId:
        typeof tab.groupId === 'number' && Number.isFinite(tab.groupId)
          ? tab.groupId
          : undefined,
      active: tab.active === true,
      pinned: tab.pinned === true,
    }

    return normalizedTab.url ? [...result, normalizedTab] : result
  }, [])
  const groups = candidate.groups.reduce<BrowserTabGroupSnapshot[]>(
    (result, group) => {
      if (!group || typeof group !== 'object') {
        return result
      }

      return [
        ...result,
        {
          id:
            typeof group.id === 'number' && Number.isFinite(group.id)
              ? group.id
              : 0,
          windowId:
            typeof group.windowId === 'number' &&
            Number.isFinite(group.windowId)
              ? group.windowId
              : 0,
          title:
            typeof group.title === 'string' && group.title.trim()
              ? group.title
              : undefined,
          color: isBrowserTabGroupColor(group.color) ? group.color : 'grey',
          collapsed: group.collapsed === true,
        },
      ]
    },
    [],
  )

  return {
    capturedAt: candidate.capturedAt,
    tabs,
    groups,
  }
}

function isBrowserTabGroupColor(
  value: unknown,
): value is BrowserTabGroupColor {
  return (
    value === 'grey' ||
    value === 'blue' ||
    value === 'red' ||
    value === 'yellow' ||
    value === 'green' ||
    value === 'pink' ||
    value === 'purple' ||
    value === 'cyan' ||
    value === 'orange'
  )
}
