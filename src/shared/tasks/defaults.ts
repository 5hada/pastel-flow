import type {
  BrowserTabGroupColor,
  BrowserKind,
  BrowserTabGroupConfig,
  BrowserTabGroupSnapshot,
  BrowserTabGroupStateSnapshot,
  BrowserTabSnapshot,
  BrowserRunMode,
  DevicePolicy,
  DeviceExecutionPolicy,
  DeviceVisibilityPolicy,
  RestorePolicy,
  TaskState,
} from './types'

export const defaultDevicePolicy: DevicePolicy = {
  visibility: 'local_only',
  execution: 'local_only',
}

export const defaultTaskState: TaskState = {
  status: 'idle',
}

export const defaultBrowserRunMode: BrowserRunMode = 'dedicated_profile'

export const defaultDynamicTemplateUpdates = false

export function createDefaultBrowserTabGroupConfig(
  profileId: string,
): BrowserTabGroupConfig {
  return {
    profileId,
    initialUrls: [],
    browserKind: 'chrome',
    restorePolicy: 'browser_profile',
    runMode: defaultBrowserRunMode,
    dynamicTemplateUpdates: defaultDynamicTemplateUpdates,
  }
}

export function normalizeBrowserTabGroupConfig(
  config: Partial<BrowserTabGroupConfig>,
): BrowserTabGroupConfig {
  return {
    profileId: config.profileId ?? '',
    initialUrls: Array.isArray(config.initialUrls) ? config.initialUrls : [],
    browserKind: isBrowserKind(config.browserKind)
      ? config.browserKind
      : 'chrome',
    restorePolicy: isRestorePolicy(config.restorePolicy)
      ? config.restorePolicy
      : 'browser_profile',
    runMode: isBrowserRunMode(config.runMode)
      ? config.runMode
      : defaultBrowserRunMode,
    dynamicTemplateUpdates:
      typeof config.dynamicTemplateUpdates === 'boolean'
        ? config.dynamicTemplateUpdates
        : defaultDynamicTemplateUpdates,
    tabGroupSnapshot: normalizeBrowserTabGroupStateSnapshot(
      config.tabGroupSnapshot,
    ),
  }
}

export function normalizeDevicePolicy(
  policy: Partial<DevicePolicy> | null | undefined,
): DevicePolicy {
  return {
    visibility: isDeviceVisibilityPolicy(policy?.visibility)
      ? policy.visibility
      : defaultDevicePolicy.visibility,
    execution: isDeviceExecutionPolicy(policy?.execution)
      ? policy.execution
      : defaultDevicePolicy.execution,
    allowedDeviceIds: Array.isArray(policy?.allowedDeviceIds)
      ? policy.allowedDeviceIds
          .map((deviceId) =>
            typeof deviceId === 'string' ? deviceId.trim() : '',
          )
          .filter(Boolean)
      : undefined,
    secretRefs: Array.isArray(policy?.secretRefs)
      ? policy.secretRefs.filter(
          (secretRef) =>
            typeof secretRef.id === 'string' &&
            secretRef.id.trim() &&
            (secretRef.scope === 'local_device' ||
              secretRef.scope === 'trusted_devices'),
        )
      : undefined,
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

export function getDeviceVisibilityPolicyLabel(
  visibility: DeviceVisibilityPolicy,
): string {
  switch (visibility) {
    case 'all_devices':
      return '모든 기기'
    case 'trusted_devices':
      return '신뢰 기기'
    case 'specific_devices':
      return '지정 기기'
    case 'local_only':
      return '로컬 전용'
  }
}

export function getDeviceExecutionPolicyLabel(
  execution: DeviceExecutionPolicy,
): string {
  switch (execution) {
    case 'anywhere':
      return '어디서나'
    case 'trusted_only':
      return '신뢰 기기'
    case 'specific_devices':
      return '지정 기기'
    case 'local_only':
      return '로컬 전용'
  }
}

export function isRestrictedDevicePolicy(policy: DevicePolicy): boolean {
  return (
    policy.visibility !== 'all_devices' ||
    policy.execution !== 'anywhere' ||
    Boolean(policy.secretRefs?.length)
  )
}

function isBrowserKind(value: unknown): value is BrowserKind {
  return value === 'chrome' || value === 'edge' || value === 'chromium'
}

function isRestorePolicy(value: unknown): value is RestorePolicy {
  return value === 'browser_profile' || value === 'initial_urls_only'
}

function isBrowserRunMode(value: unknown): value is BrowserRunMode {
  return (
    value === 'dedicated_profile' ||
    value === 'extension_controlled' ||
    value === 'default_browser_deeplink'
  )
}

function isDeviceVisibilityPolicy(
  value: unknown,
): value is DeviceVisibilityPolicy {
  return (
    value === 'all_devices' ||
    value === 'trusted_devices' ||
    value === 'specific_devices' ||
    value === 'local_only'
  )
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

function isDeviceExecutionPolicy(
  value: unknown,
): value is DeviceExecutionPolicy {
  return (
    value === 'anywhere' ||
    value === 'trusted_only' ||
    value === 'specific_devices' ||
    value === 'local_only'
  )
}
