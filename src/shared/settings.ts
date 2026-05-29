import type { CurrentDevice, LinkedDevice } from './devices'
import { normalizeLinkedDevices } from './devices'
import type { BrowserKind } from './tasks'

export type ThemeMode = 'system' | 'light' | 'dark'

export type InitialUrlInputMode = 'line'

export type BrowserExecutablePaths = Partial<Record<BrowserKind, string>>

export type AppSettings = {
  themeMode: ThemeMode
  defaultBrowserKind: BrowserKind
  defaultTaskName: string
  initialUrlInputMode: InitialUrlInputMode
  browserExecutablePaths: BrowserExecutablePaths
  linkedDevices: LinkedDevice[]
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
  browserExecutablePaths: {},
  linkedDevices: [],
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
    browserExecutablePaths: normalizeBrowserExecutablePaths(
      settings?.browserExecutablePaths,
    ),
    linkedDevices: normalizeLinkedDevices(settings?.linkedDevices),
  }
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
