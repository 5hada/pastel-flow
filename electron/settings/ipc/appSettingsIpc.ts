import type { IpcMain } from 'electron'
import type { AppSettings } from '../../../src/shared/settings'
import type { DeviceStore } from '../../devices/store/deviceStore'
import type { AppSettingsStore } from '../store/appSettingsStore'

export function registerAppSettingsIpc(
  ipcMain: IpcMain,
  appSettingsStore: AppSettingsStore,
  deviceStore: DeviceStore,
): void {
  ipcMain.handle('settings:get', async () => ({
    ...(await appSettingsStore.getSnapshot()),
    currentDevice: await deviceStore.getCurrentDevice(),
  }))
  ipcMain.handle('settings:update', async (_event, settings: AppSettings) => ({
    ...(await appSettingsStore.updateSettings(settings)),
    currentDevice: await deviceStore.getCurrentDevice(),
  }))
}
