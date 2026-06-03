import type { CurrentDevice, LinkedDevice } from "../devices"
import type {
  BrowserKind,
  BrowserProfileSource,
  BrowserRunMode,
  BrowserProfilePreset,
  BrowserExecutablePaths,
} from "../browsers"

export type { BrowserExecutablePaths, BrowserProfilePreset } from "../browsers"

export type ThemeMode = 'system' | 'light' | 'dark' | 'custom'

export type InitialUrlInputMode = 'line'
export type WorkflowListDisplayMode = 'grid' | 'list'



export type ThemeColorKey =
  | 'appBg'
  | 'surface'
  | 'surfaceMuted'
  | 'surfaceRaised'
  | 'surfaceSelected'
  | 'border'
  | 'borderStrong'
  | 'text'
  | 'textMuted'
  | 'accent'
  | 'accentHover'
  | 'accentSoft'
  | 'accentContrast'
  | 'danger'
  | 'dangerHover'
  | 'dangerSoft'
  | 'info'
  | 'infoSoft'
  | 'warning'
  | 'warningText'
  | 'success'
  | 'successSoft'
  | 'controlBg'
  | 'readonlyBg'
  | 'railBg'

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
