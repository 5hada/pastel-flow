import type { IpcMain } from 'electron'
import type { SyncExportSnapshot } from '../../../src/shared/sync'
import type { MockSyncStore } from '../store/mockSyncStore'

export function registerSyncIpc(
  ipcMain: IpcMain,
  mockSyncStore: MockSyncStore,
): void {
  ipcMain.handle('sync:status', () => mockSyncStore.getStatus())
  ipcMain.handle('sync:export', () => mockSyncStore.exportSnapshot())
  ipcMain.handle(
    'sync:import',
    (_event, snapshot?: SyncExportSnapshot) =>
      mockSyncStore.importSnapshot(snapshot),
  )
}
