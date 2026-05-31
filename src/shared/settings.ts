import type { CurrentDevice, LinkedDevice } from './devices'
import { normalizeLinkedDevices } from './devices'
import type { BrowserKind, BrowserProfileSource, BrowserRunMode } from './tasks'

export type ThemeMode = 'system' | 'light' | 'dark' | 'custom'

export type InitialUrlInputMode = 'line'
export type TaskListDisplayMode = 'grid' | 'list'

export type BrowserExecutablePaths = Partial<Record<BrowserKind, string>>

export type BrowserProfilePreset = {
  id: string
  name: string
  browserKind: BrowserKind
  profilePath: string
}

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
  defaultTaskName: string
  defaultActionName: string
  defaultWorkflowName: string
  initialUrlInputMode: InitialUrlInputMode
  taskListDisplayMode: TaskListDisplayMode
  workflowGridColumnCount: number
  startAtLogin: boolean
  workflowHierarchy: string[]
  browserProfilePresets: BrowserProfilePreset[]
  browserExecutablePaths: BrowserExecutablePaths
  developerVisibility: DeveloperVisibilitySettings
  shortcuts: ShortcutSettings
  linkedDevices: LinkedDevice[]
  taskRunEventRetentionLimit: number
  taskRunEventExportLimit: number
}

export type AppSettingsSnapshot = {
  settings: AppSettings
  userDataPath: string
  currentDevice: CurrentDevice
}

export const defaultAppSettings: AppSettings = {
  themeMode: 'light',
  customThemeColors: createDefaultCustomThemeColors(),
  defaultBrowserKind: 'chrome',
  defaultBrowserRunMode: 'dedicated_profile',
  defaultBrowserProfileSource: 'task_profile',
  defaultTaskName: '새 브라우저 작업',
  defaultActionName: '새 Action',
  defaultWorkflowName: '새 Workflow',
  initialUrlInputMode: 'line',
  taskListDisplayMode: 'grid',
  workflowGridColumnCount: 5,
  startAtLogin: false,
  workflowHierarchy: ['기본'],
  browserProfilePresets: [],
  browserExecutablePaths: {},
  developerVisibility: {
    showIds: false,
    showPaths: false,
    showToolMetadata: false,
  },
  shortcuts: {
    refresh: 'Ctrl+R',
    openRun: 'Ctrl+0',
    openActions: 'Ctrl+1',
    openWorkflows: 'Ctrl+2',
    openTools: 'Ctrl+3',
    openSettings: 'Ctrl+,',
    runSelectedWorkflow: 'Ctrl+Enter',
  },
  linkedDevices: [],
  taskRunEventRetentionLimit: 300,
  taskRunEventExportLimit: 50,
}

export function normalizeAppSettings(
  settings: Partial<AppSettings> | null | undefined,
): AppSettings {
  return {
    themeMode: isThemeMode(settings?.themeMode)
      ? settings.themeMode
      : defaultAppSettings.themeMode,
    customThemeColors: normalizeCustomThemeColors(settings?.customThemeColors),
    defaultBrowserKind: isBrowserKind(settings?.defaultBrowserKind)
      ? settings.defaultBrowserKind
      : defaultAppSettings.defaultBrowserKind,
    defaultBrowserRunMode: isBrowserRunMode(settings?.defaultBrowserRunMode)
      ? settings.defaultBrowserRunMode
      : defaultAppSettings.defaultBrowserRunMode,
    defaultBrowserProfileSource: isBrowserProfileSource(
      settings?.defaultBrowserProfileSource,
    )
      ? settings.defaultBrowserProfileSource
      : defaultAppSettings.defaultBrowserProfileSource,
    defaultTaskName:
      typeof settings?.defaultTaskName === 'string' &&
      settings.defaultTaskName.trim()
        ? settings.defaultTaskName.trim()
        : defaultAppSettings.defaultTaskName,
    defaultActionName:
      typeof settings?.defaultActionName === 'string' &&
      settings.defaultActionName.trim()
        ? settings.defaultActionName.trim()
        : defaultAppSettings.defaultActionName,
    defaultWorkflowName:
      typeof settings?.defaultWorkflowName === 'string' &&
      settings.defaultWorkflowName.trim()
        ? settings.defaultWorkflowName.trim()
        : defaultAppSettings.defaultWorkflowName,
    initialUrlInputMode:
      settings?.initialUrlInputMode === 'line'
        ? settings.initialUrlInputMode
        : defaultAppSettings.initialUrlInputMode,
    taskListDisplayMode: isTaskListDisplayMode(settings?.taskListDisplayMode)
      ? settings.taskListDisplayMode
      : defaultAppSettings.taskListDisplayMode,
    workflowGridColumnCount: normalizeWorkflowGridColumnCount(
      settings?.workflowGridColumnCount,
    ),
    startAtLogin: settings?.startAtLogin === true,
    workflowHierarchy: normalizeStringList(settings?.workflowHierarchy, [
      '기본',
    ]),
    browserProfilePresets: normalizeBrowserProfilePresets(
      settings?.browserProfilePresets,
    ),
    browserExecutablePaths: normalizeBrowserExecutablePaths(
      settings?.browserExecutablePaths,
    ),
    developerVisibility: normalizeDeveloperVisibility(
      settings?.developerVisibility,
    ),
    shortcuts: normalizeShortcuts(settings?.shortcuts),
    linkedDevices: normalizeLinkedDevices(settings?.linkedDevices),
    taskRunEventRetentionLimit: normalizeRetentionLimit(
      settings?.taskRunEventRetentionLimit,
    ),
    taskRunEventExportLimit: normalizeEventExportLimit(
      settings?.taskRunEventExportLimit,
    ),
  }
}

function createDefaultCustomThemeColors(): CustomThemeColors {
  return {
    appBg: '#edf2f6',
    surface: '#ffffff',
    surfaceMuted: '#f6f8fb',
    surfaceRaised: '#ffffff',
    surfaceSelected: '#e9f6f3',
    border: '#d8e1ea',
    borderStrong: '#6f9f99',
    text: '#17212e',
    textMuted: '#677486',
    accent: '#226f68',
    accentHover: '#1a5d58',
    accentSoft: '#d9f0eb',
    accentContrast: '#ffffff',
    danger: '#b94a48',
    dangerHover: '#9f2f2b',
    dangerSoft: '#fff1f0',
    info: '#2e5f95',
    infoSoft: '#e6f0fb',
    warning: '#fff0c2',
    warningText: '#6b4b0e',
    success: '#287a54',
    successSoft: '#e4f5eb',
    controlBg: '#f8fafc',
    readonlyBg: '#eef3f8',
    railBg: '#e7edf3',
  }
}

function normalizeCustomThemeColors(value: unknown): CustomThemeColors {
  const defaults = createDefaultCustomThemeColors()
  if (!value || typeof value !== 'object') {
    return defaults
  }

  return (Object.keys(defaults) as ThemeColorKey[]).reduce<CustomThemeColors>(
    (colors, key) => ({
      ...colors,
      [key]: normalizeColor((value as Partial<CustomThemeColors>)[key]) ?? defaults[key],
    }),
    defaults,
  )
}

function normalizeColor(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmedValue = value.trim()
  return /^#[0-9a-fA-F]{6}$/.test(trimmedValue) ? trimmedValue : undefined
}

function normalizeWorkflowGridColumnCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return defaultAppSettings.workflowGridColumnCount
  }

  return Math.min(Math.max(Math.round(value), 2), 8)
}

function normalizeRetentionLimit(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return defaultAppSettings.taskRunEventRetentionLimit
  }

  return Math.min(Math.max(Math.round(value), 50), 2000)
}

function normalizeEventExportLimit(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return defaultAppSettings.taskRunEventExportLimit
  }

  return Math.min(Math.max(Math.round(value), 0), 2000)
}

function normalizeBrowserExecutablePaths(
  browserExecutablePaths: unknown,
): BrowserExecutablePaths {
  if (!browserExecutablePaths || typeof browserExecutablePaths !== 'object') {
    return defaultAppSettings.browserExecutablePaths
  }

  return {
    chrome: normalizeOptionalPath(
      (browserExecutablePaths as BrowserExecutablePaths).chrome,
    ),
    edge: normalizeOptionalPath(
      (browserExecutablePaths as BrowserExecutablePaths).edge,
    ),
    chromium: normalizeOptionalPath(
      (browserExecutablePaths as BrowserExecutablePaths).chromium,
    ),
  }
}

function normalizeBrowserProfilePresets(value: unknown): BrowserProfilePreset[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((profile): BrowserProfilePreset | null => {
      const candidate = profile as Partial<BrowserProfilePreset>
      const id = normalizeOptionalPath(candidate.id) ?? cryptoSafeId()
      const name = normalizeOptionalPath(candidate.name)
      const profilePath = normalizeOptionalPath(candidate.profilePath)
      const browserKind = isBrowserKind(candidate.browserKind)
        ? candidate.browserKind
        : defaultAppSettings.defaultBrowserKind

      return name && profilePath
        ? {
            id,
            name,
            browserKind,
            profilePath,
          }
        : null
    })
    .filter((profile): profile is BrowserProfilePreset => profile !== null)
}

function normalizeDeveloperVisibility(
  value: unknown,
): DeveloperVisibilitySettings {
  const candidate = value as Partial<DeveloperVisibilitySettings> | undefined
  return {
    showIds: candidate?.showIds === true,
    showPaths: candidate?.showPaths === true,
    showToolMetadata: candidate?.showToolMetadata === true,
  }
}

function normalizeShortcuts(value: unknown): ShortcutSettings {
  const candidate = value as Partial<ShortcutSettings> | undefined
  return {
    refresh: normalizeShortcut(candidate?.refresh, defaultAppSettings.shortcuts.refresh),
    openRun: normalizeShortcut(candidate?.openRun, defaultAppSettings.shortcuts.openRun),
    openActions: normalizeShortcut(
      candidate?.openActions,
      defaultAppSettings.shortcuts.openActions,
    ),
    openWorkflows: normalizeShortcut(
      candidate?.openWorkflows,
      defaultAppSettings.shortcuts.openWorkflows,
    ),
    openTools: normalizeShortcut(candidate?.openTools, defaultAppSettings.shortcuts.openTools),
    openSettings: normalizeShortcut(
      candidate?.openSettings,
      defaultAppSettings.shortcuts.openSettings,
    ),
    runSelectedWorkflow: normalizeShortcut(
      candidate?.runSelectedWorkflow,
      defaultAppSettings.shortcuts.runSelectedWorkflow,
    ),
  }
}

function normalizeShortcut(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalizeStringList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback
  }

  const items = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
  return items.length > 0 ? [...new Set(items)] : fallback
}

function normalizeOptionalPath(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmedValue = value.trim()
  return trimmedValue || undefined
}

function isThemeMode(value: unknown): value is ThemeMode {
  return (
    value === 'system' ||
    value === 'light' ||
    value === 'dark' ||
    value === 'custom'
  )
}

function isBrowserKind(value: unknown): value is BrowserKind {
  return value === 'chrome' || value === 'edge' || value === 'chromium'
}

function isTaskListDisplayMode(value: unknown): value is TaskListDisplayMode {
  return value === 'grid' || value === 'list'
}

function isBrowserRunMode(value: unknown): value is BrowserRunMode {
  return (
    value === 'dedicated_profile' ||
    value === 'extension_controlled' ||
    value === 'default_browser_deeplink'
  )
}

function isBrowserProfileSource(value: unknown): value is BrowserProfileSource {
  return value === 'task_profile' || value === 'existing_profile'
}

function cryptoSafeId(): string {
  return `profile_${Math.random().toString(36).slice(2, 10)}`
}
