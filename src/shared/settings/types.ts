import type { CurrentDevice, LinkedDevice } from '../devices'
import type {
  BrowserKind,
  BrowserExecutablePaths,
  BrowserProfileSource,
  BrowserProfilePreset,
  BrowserRunMode,
} from '../browsers'

export type { BrowserExecutablePaths, BrowserProfilePreset } from '../browsers'

export type ThemeMode = 'system' | 'light' | 'dark' | 'custom'

export type InitialUrlInputMode = 'line'
export type WorkflowListDisplayMode = 'grid' | 'list'

export type WorkspaceFolderScope =
  | 'actions'
  | 'todos'
  | 'tools'
  | 'urlGroups'
  | 'workflows'

export type WorkspaceFolder = {
  id: string
  name: string
  scope: WorkspaceFolderScope
  order: number
}

export type ThemeColorKey =
  | 'accent'
  | 'accentForeground'
  | 'accentHover'
  | 'accentSoft'
  | 'accentSoftForeground'
  | 'background'
  | 'border'
  | 'danger'
  | 'dangerForeground'
  | 'dangerHover'
  | 'dangerSoft'
  | 'default'
  | 'defaultForeground'
  | 'fieldBackground'
  | 'fieldForeground'
  | 'fieldPlaceholder'
  | 'focus'
  | 'foreground'
  | 'muted'
  | 'segment'
  | 'success'
  | 'successForeground'
  | 'successSoft'
  | 'surface'
  | 'surfaceForeground'
  | 'surfaceSecondary'
  | 'surfaceSecondaryForeground'
  | 'surfaceTertiary'
  | 'warning'
  | 'warningForeground'
  | 'warningSoft'

export type CustomThemeColors = Record<ThemeColorKey, string>

export type DeveloperVisibilitySettings = {
  showIds: boolean
  showPaths: boolean
  showToolMetadata: boolean
}

export type ShortcutSettings = {
  refresh: string
  openRun: string
  openActions: string
  openWorkflows: string
  openTools: string
  openSettings: string
  runSelectedWorkflow: string
}

export type AppSettings = {
  themeMode: ThemeMode
  customThemeColors: CustomThemeColors
  defaultBrowserKind: BrowserKind
  defaultBrowserRunMode: BrowserRunMode
  defaultBrowserProfileSource: BrowserProfileSource
  defaultActionName: string
  defaultWorkflowName: string
  initialUrlInputMode: InitialUrlInputMode
  workflowListDisplayMode: WorkflowListDisplayMode
  workflowGridColumnCount: number
  startAtLogin: boolean
  workflowHierarchy: string[]
  workspaceFolders: WorkspaceFolder[]
  workspaceFolderAssignments: Record<string, string>
  browserProfilePresets: BrowserProfilePreset[]
  browserExecutablePaths: BrowserExecutablePaths
  developerVisibility: DeveloperVisibilitySettings
  shortcuts: ShortcutSettings
  linkedDevices: LinkedDevice[]
  workflowRunEventRetentionLimit: number
  workflowRunEventExportLimit: number
}

export type AppSettingsSnapshot = {
  settings: AppSettings
  userDataPath: string
  currentDevice: CurrentDevice
}
