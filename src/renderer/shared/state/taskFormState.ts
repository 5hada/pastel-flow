import { defaultAppSettings, type AppSettings } from '../../../shared/settings'
import type { SecretStorageStatus } from '../../../shared/secrets'
import type { SyncStatus } from '../../../shared/sync'
import type {
  BrowserKind,
  BrowserProfileSource,
  BrowserRunMode,
  DeviceExecutionPolicy,
  DeviceVisibilityPolicy,
  TaskScheduleMode,
  TaskType,
} from './taskTypes'

export type BrowserTaskFormState = {
  taskType: TaskType
  name: string
  createSingleActionWorkflow: boolean
  browserKind: BrowserKind
  runMode: BrowserRunMode
  profileSource: BrowserProfileSource
  profilePresetId: string
  existingProfilePath: string
  urlGroupId: string
  initialUrls: string
  dynamicTemplateUpdates: boolean
  crawlerUrls: string
  crawlerMaxBytes: number
  discordCommandPrefix: string
  notionDatabaseId: string
  tradingExchange: string
  tradingSymbol: string
  transformMode: 'json_to_string' | 'string_to_json' | 'pick_field' | 'join' | 'split'
  transformPath: string
  transformSeparator: string
  scheduleEnabled: boolean
  scheduleMode: TaskScheduleMode
  scheduleIntervalMinutes: number
  scheduleTimeOfDay: string
  scheduleDaysOfWeek: string
  visibility: DeviceVisibilityPolicy
  execution: DeviceExecutionPolicy
  allowedDeviceIds: string
  secretRefIds: string
}

export type SecretFormState = {
  name: string
  value: string
  description: string
}

export type SettingsSaveState = 'saved' | 'failed' | null

export type WorkspaceMode =
  | 'run'
  | 'actions'
  | 'workflows'
  | 'urlGroups'
  | 'scraps'
  | 'todos'
  | 'tools'
  | 'settings'

export type NavigationCategory =
  | 'all'
  | 'favorites'
  | 'due_soon'
  | 'running'
  | 'scheduled'
  | 'failed'
  | 'restricted'
  | 'secret_required'

export type SettingsCategory =
  | 'general'
  | 'appearance'
  | 'browser'
  | 'devices'
  | 'secrets'
  | 'sync'
  | 'events'
  | 'data'
  | 'shortcuts'
  | 'developer'

export const defaultSettingsForm: AppSettings = {
  ...defaultAppSettings,
}

export function createBrowserTaskForm(
  settings: AppSettings,
): BrowserTaskFormState {
  return {
    name: settings.defaultActionName,
    taskType: 'browser_tab_group',
    createSingleActionWorkflow: false,
    browserKind: settings.defaultBrowserKind,
    runMode: settings.defaultBrowserRunMode,
    profileSource: settings.defaultBrowserProfileSource,
    profilePresetId: '',
    existingProfilePath: '',
    urlGroupId: '',
    initialUrls: '',
    dynamicTemplateUpdates: false,
    crawlerUrls: '',
    crawlerMaxBytes: 50000,
    discordCommandPrefix: '!',
    notionDatabaseId: '',
    tradingExchange: '',
    tradingSymbol: '',
    transformMode: 'json_to_string',
    transformPath: '',
    transformSeparator: '\n',
    scheduleEnabled: false,
    scheduleMode: 'interval',
    scheduleIntervalMinutes: 60,
    scheduleTimeOfDay: '09:00',
    scheduleDaysOfWeek: '1\n2\n3\n4\n5',
    visibility: 'local_only',
    execution: 'local_only',
    allowedDeviceIds: '',
    secretRefIds: '',
  }
}

export const defaultCreateForm = createBrowserTaskForm(defaultAppSettings)

export const initialSettingsSnapshot = {
  settings: defaultAppSettings,
  userDataPath: '',
  currentDevice: {
    id: '',
    name: '',
  },
}

export const defaultEditForm: BrowserTaskFormState = {
  taskType: 'browser_tab_group',
  name: defaultAppSettings.defaultActionName,
  createSingleActionWorkflow: false,
  browserKind: defaultAppSettings.defaultBrowserKind,
  runMode: 'dedicated_profile',
  profileSource: 'action_profile',
  profilePresetId: '',
  existingProfilePath: '',
  urlGroupId: '',
  initialUrls: '',
  dynamicTemplateUpdates: false,
  crawlerUrls: '',
  crawlerMaxBytes: 50000,
  discordCommandPrefix: '!',
  notionDatabaseId: '',
  tradingExchange: '',
  tradingSymbol: '',
  transformMode: 'json_to_string',
  transformPath: '',
  transformSeparator: '\n',
  scheduleEnabled: false,
  scheduleMode: 'interval',
  scheduleIntervalMinutes: 60,
  scheduleTimeOfDay: '09:00',
  scheduleDaysOfWeek: '1\n2\n3\n4\n5',
  visibility: 'local_only',
  execution: 'local_only',
  allowedDeviceIds: '',
  secretRefIds: '',
}

export const defaultSecretForm: SecretFormState = {
  name: '',
  value: '',
  description: '',
}

export const defaultSecretStorageStatus: SecretStorageStatus = {
  encryptionAvailable: false,
  backend: 'unknown',
  message: 'Secret 암호화 상태를 아직 불러오지 못했습니다.',
}

export const defaultSyncStatus: SyncStatus = {
  mode: 'mock_file',
  serverDbSyncEnabled: false,
  message:
    '실제 서버 DB 연동은 현재 구현 범위에서 제외되어 있으며 로컬 mock 파일 sync만 사용합니다.',
  exportPath: '',
}

export const taskTypeOptions: TaskType[] = [
  'browser_tab_group',
  'crawler',
  'discord_bot',
  'notion_sync',
  'trading_bot',
]
