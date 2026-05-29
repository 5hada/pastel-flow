import type {
  BrowserTabGroupConfig,
  BrowserRunMode,
  DevicePolicy,
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
