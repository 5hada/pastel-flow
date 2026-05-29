import type {
  BrowserTabGroupConfig,
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

export function createDefaultBrowserTabGroupConfig(
  profileId: string,
): BrowserTabGroupConfig {
  return {
    profileId,
    initialUrls: [],
    browserKind: 'chrome',
    restorePolicy: 'browser_profile',
  }
}
