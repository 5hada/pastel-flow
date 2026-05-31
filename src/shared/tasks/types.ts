export type TaskType =
  | 'browser_tab_group'
  | 'discord_bot'
  | 'crawler'
  | 'notion_sync'
  | 'trading_bot'

export type ActionType =
  | 'browser_action'
  | 'crawler_action'
  | 'discord_dry_run_action'
  | 'notion_dry_run_action'
  | 'trading_dry_run_action'
  | 'tool_action'

export type ActionRunStatus = 'idle' | 'running' | 'failed'

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

export type WorkflowState = {
  status: ActionRunStatus
  actionStates?: Record<string, ActionRuntimeState>
  lastRunAt?: string
  lastError?: string
  localProfilePath?: string
  outputPath?: string
  lastMessage?: string
}

export type ActionRuntimeState = {
  status: ActionRunStatus
  actionRunId?: string
  workflowActionRefId?: string
  startedAt?: string
  completedAt?: string
  lastRunAt?: string
  lastError?: string
  localProfilePath?: string
  outputPath?: string
  lastMessage?: string
}

export type WorkflowScheduleMode = 'interval' | 'daily' | 'weekly'

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type WorkflowSchedule = {
  enabled: boolean
  mode: WorkflowScheduleMode
  intervalMinutes: number
  timeOfDay?: string
  daysOfWeek?: DayOfWeek[]
  nextRunAt?: string
  lastTriggeredAt?: string
}

export type ActionIOField = {
  id: string
  name: string
  type: 'string' | 'number' | 'boolean' | 'json' | 'secret_ref'
  required?: boolean
  description?: string
}

export type ActionDefinition<TConfig = unknown> = {
  id: string
  name: string
  type: ActionType
  config: TConfig
  secretRefs?: SecretRef[]
  inputSchema?: ActionIOField[]
  outputSchema?: ActionIOField[]
  createdAt: string
  updatedAt: string
}

export type WorkflowActionRef = {
  id: string
  actionId: string
  order: number
  inputMapping?: Record<string, string>
  enabled: boolean
}

export type WorkflowDefinition = {
  id: string
  name: string
  actionRefs: WorkflowActionRef[]
  permissions: DevicePolicy
  schedule?: WorkflowSchedule
  state: WorkflowState
  createdAt: string
  updatedAt: string
}

export type BrowserTabGroupConfig = {
  browserGroupId: string
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

export type TaskStatus = ActionRunStatus
export type TaskState = WorkflowState
export type TaskScheduleMode = WorkflowScheduleMode
export type TaskSchedule = WorkflowSchedule
