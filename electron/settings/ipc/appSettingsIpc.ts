import type { IpcMain } from 'electron'
import type { AppSettings } from '../../../src/shared/settings'
import type { AppSettingsStore } from '../store/appSettingsStore'

export function registerAppSettingsIpc(
  ipcMain: IpcMain,
  appSettingsStore: AppSettingsStore,
): void {
  ipcMain.handle('settings:get', () => appSettingsStore.getSnapshot())
  ipcMain.handle('settings:update', (_event, settings: AppSettings) =>
    appSettingsStore.updateSettings(settings),
  )
}
