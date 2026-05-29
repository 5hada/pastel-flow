export type TaskType =
  | 'browser_tab_group'
  | 'discord_bot'
  | 'crawler'
  | 'notion_sync'
  | 'trading_bot'

export type TaskStatus = 'idle' | 'running' | 'failed'

export type BrowserKind = 'chrome' | 'edge' | 'chromium'

export type RestorePolicy = 'browser_profile' | 'initial_urls_only'

export type BrowserRunMode =
  | 'dedicated_profile'
  | 'extension_controlled'
  | 'default_browser_deeplink'

export type DeviceVisibilityPolicy =
  | 'all_devices'
  | 'trusted_devices'
  | 'specific_devices'
  | 'local_only'

export type DeviceExecutionPolicy =
  | 'anywhere'
  | 'trusted_only'
  | 'specific_devices'
  | 'local_only'

export type SecretScope = 'local_device' | 'trusted_devices'

export type SecretRef = {
  id: string
  scope: SecretScope
  description?: string
}

export type DevicePolicy = {
  visibility: DeviceVisibilityPolicy
  execution: DeviceExecutionPolicy
  allowedDeviceIds?: string[]
  secretRefs?: SecretRef[]
}

export type TaskState = {
  status: TaskStatus
  lastRunAt?: string
  lastError?: string
  localProfilePath?: string
}

export type BrowserTabGroupConfig = {
  profileId: string
  initialUrls: string[]
  browserKind: BrowserKind
  restorePolicy: RestorePolicy
  runMode: BrowserRunMode
  dynamicTemplateUpdates: boolean
}

export type TaskTemplate<TConfig = unknown, TState = TaskState> = {
  id: string
  name: string
  type: TaskType
  config: TConfig
  state: TState
  permissions: DevicePolicy
  createdAt: string
  updatedAt: string
}

export type BrowserTabGroupTask = TaskTemplate<BrowserTabGroupConfig, TaskState>
