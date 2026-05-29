import type { CurrentDevice, LinkedDevice } from './devices'
import { normalizeLinkedDevices } from './devices'
import type { BrowserKind } from './tasks'

export type ThemeMode = 'system' | 'light' | 'dark'

export type InitialUrlInputMode = 'line'
export type TaskListDisplayMode = 'grid' | 'list'

export type BrowserExecutablePaths = Partial<Record<BrowserKind, string>>

export type AppSettings = {
  themeMode: ThemeMode
  defaultBrowserKind: BrowserKind
  defaultTaskName: string
  initialUrlInputMode: InitialUrlInputMode
  taskListDisplayMode: TaskListDisplayMode
  browserExecutablePaths: BrowserExecutablePaths
  linkedDevices: LinkedDevice[]
  taskRunEventRetentionLimit: number
}

export type AppSettingsSnapshot = {
  settings: AppSettings
  userDataPath: string
  currentDevice: CurrentDevice
}

export const defaultAppSettings: AppSettings = {
  themeMode: 'light',
  defaultBrowserKind: 'chrome',
  defaultTaskName: '새 브라우저 작업',
  initialUrlInputMode: 'line',
  taskListDisplayMode: 'grid',
  browserExecutablePaths: {},
  linkedDevices: [],
  taskRunEventRetentionLimit: 300,
}

export function normalizeAppSettings(
  settings: Partial<AppSettings> | null | undefined,
): AppSettings {
  return {
    themeMode: isThemeMode(settings?.themeMode)
      ? settings.themeMode
      : defaultAppSettings.themeMode,
    defaultBrowserKind: isBrowserKind(settings?.defaultBrowserKind)
      ? settings.defaultBrowserKind
      : defaultAppSettings.defaultBrowserKind,
    defaultTaskName:
      typeof settings?.defaultTaskName === 'string' &&
      settings.defaultTaskName.trim()
        ? settings.defaultTaskName.trim()
        : defaultAppSettings.defaultTaskName,
    initialUrlInputMode:
      settings?.initialUrlInputMode === 'line'
        ? settings.initialUrlInputMode
        : defaultAppSettings.initialUrlInputMode,
    taskListDisplayMode: isTaskListDisplayMode(settings?.taskListDisplayMode)
      ? settings.taskListDisplayMode
      : defaultAppSettings.taskListDisplayMode,
    browserExecutablePaths: normalizeBrowserExecutablePaths(
      settings?.browserExecutablePaths,
    ),
    linkedDevices: normalizeLinkedDevices(settings?.linkedDevices),
    taskRunEventRetentionLimit: normalizeRetentionLimit(
      settings?.taskRunEventRetentionLimit,
    ),
  }
}

function normalizeRetentionLimit(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return defaultAppSettings.taskRunEventRetentionLimit
  }

  return Math.min(Math.max(Math.round(value), 50), 2000)
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

function normalizeOptionalPath(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmedValue = value.trim()
  return trimmedValue || undefined
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark'
}

function isBrowserKind(value: unknown): value is BrowserKind {
  return value === 'chrome' || value === 'edge' || value === 'chromium'
}

function isTaskListDisplayMode(value: unknown): value is TaskListDisplayMode {
  return value === 'grid' || value === 'list'
}
