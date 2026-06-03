import type { IpcMain } from 'electron'
import type { AppSettings } from '../../../shared/settings'
import { ipcRequestChannels } from '../../../shared/ipcChannels'
import type { DeviceStore } from '../../devices/store/deviceStore'
import type { AppSettingsStore } from '../store/appSettingsStore'

export function registerAppSettingsIpc(
  ipcMain: IpcMain,
  appSettingsStore: AppSettingsStore,
  deviceStore: DeviceStore,
  onSettingsUpdated?: (settings: AppSettings) => void,
): void {
  ipcMain.handle(ipcRequestChannels.settings.get, async () => ({
    ...(await appSettingsStore.getSnapshot()),
    currentDevice: await deviceStore.getCurrentDevice(),
  }))
  ipcMain.handle(ipcRequestChannels.settings.update, async (_event, settings) => {
    const snapshot = await appSettingsStore.updateSettings(
      assertRecord(settings, '설정 입력') as AppSettings,
    )
    onSettingsUpdated?.(snapshot.settings)

    return {
      ...snapshot,
      currentDevice: await deviceStore.getCurrentDevice(),
    }
  })
}

function assertRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label}은 객체여야 합니다.`)
  }

  return value as Record<string, unknown>
}
