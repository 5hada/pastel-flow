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

export type BrowserProfileSource = 'task_profile' | 'existing_profile'

export type BrowserTabGroupColor =
  | 'grey'
  | 'blue'
  | 'red'
  | 'yellow'
  | 'green'
  | 'pink'
  | 'purple'
  | 'cyan'
  | 'orange'

export type BrowserTabGroupSnapshot = {
  id: number
  windowId: number
  title?: string
  color: BrowserTabGroupColor
  collapsed: boolean
}

export type BrowserTabSnapshot = {
  id?: number
  windowId: number
  index: number
  url: string
  title?: string
  groupId?: number
  active: boolean
  pinned: boolean
}

export type BrowserTabGroupStateSnapshot = {
  capturedAt: string
  tabs: BrowserTabSnapshot[]
  groups: BrowserTabGroupSnapshot[]
}

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
  outputPath?: string
  lastMessage?: string
}

export type TaskScheduleMode = 'interval' | 'daily' | 'weekly'

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type TaskSchedule = {
  enabled: boolean
  mode: TaskScheduleMode
  intervalMinutes: number
  timeOfDay?: string
  daysOfWeek?: DayOfWeek[]
  nextRunAt?: string
  lastTriggeredAt?: string
}

export type BrowserTabGroupConfig = {
  profileId: string
  initialUrls: string[]
  browserKind: BrowserKind
  restorePolicy: RestorePolicy
  runMode: BrowserRunMode
  profileSource: BrowserProfileSource
  existingProfilePath?: string
  dynamicTemplateUpdates: boolean
  tabGroupSnapshot?: BrowserTabGroupStateSnapshot
}

export type CrawlerConfig = {
  urls: string[]
  maxBytes: number
}

export type DiscordBotConfig = {
  dryRun: boolean
  commandPrefix?: string
}

export type NotionSyncConfig = {
  dryRun: boolean
  databaseId?: string
}

export type TradingBotConfig = {
  dryRun: boolean
  exchange?: string
  symbol?: string
}

export type TaskTemplate<TConfig = unknown, TState = TaskState> = {
  id: string
  name: string
  type: TaskType
  config: TConfig
  state: TState
  permissions: DevicePolicy
  schedule?: TaskSchedule
  createdAt: string
  updatedAt: string
}

export type BrowserTabGroupTask = TaskTemplate<BrowserTabGroupConfig, TaskState>
