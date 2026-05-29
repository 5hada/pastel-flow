import type {
  BrowserKind,
  BrowserTabGroupConfig,
  BrowserRunMode,
  DevicePolicy,
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

export function createDefaultBrowserTabGroupConfig(
  profileId: string,
): BrowserTabGroupConfig {
  return {
    profileId,
    initialUrls: [],
    browserKind: 'chrome',
    restorePolicy: 'browser_profile',
    runMode: defaultBrowserRunMode,
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
  return (
    value === 'dedicated_profile' ||
    value === 'extension_controlled' ||
    value === 'default_browser_deeplink'
  )
}
