import type { BrowserKind } from './tasks'

export type ThemeMode = 'system' | 'light' | 'dark'

export type InitialUrlInputMode = 'line'

export type AppSettings = {
  themeMode: ThemeMode
  defaultBrowserKind: BrowserKind
  defaultTaskName: string
  initialUrlInputMode: InitialUrlInputMode
}

export type AppSettingsSnapshot = {
  settings: AppSettings
  userDataPath: string
}

export const defaultAppSettings: AppSettings = {
  themeMode: 'light',
  defaultBrowserKind: 'chrome',
  defaultTaskName: '새 브라우저 작업',
  initialUrlInputMode: 'line',
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
  }
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark'
}

function isBrowserKind(value: unknown): value is BrowserKind {
  return value === 'chrome' || value === 'edge' || value === 'chromium'
}
