import {
  BrowserWindow,
  dialog,
  type IpcMain,
  type OpenDialogOptions,
} from 'electron'
import type { SyncExportSnapshot } from '../../../src/shared/sync'
import type { MockSyncStore } from '../store/mockSyncStore'

export function registerSyncIpc(
  ipcMain: IpcMain,
  mockSyncStore: MockSyncStore,
): void {
  ipcMain.handle('sync:status', () => mockSyncStore.getStatus())
  ipcMain.handle('sync:export', () => mockSyncStore.exportSnapshot())
  ipcMain.handle('sync:export-file', async (event) => {
    const browserWindow = BrowserWindow.fromWebContents(event.sender)
    const options = {
        defaultPath: 'pastel-flow-sync.json',
        filters: [{ name: 'JSON', extensions: ['json'] }],
      }
    const result = browserWindow
      ? await dialog.showSaveDialog(browserWindow, options)
      : await dialog.showSaveDialog(options)

    if (result.canceled || !result.filePath) {
      return undefined
    }

    return mockSyncStore.exportSnapshotToPath(result.filePath)
  })
  ipcMain.handle(
    'sync:import',
    (_event, snapshot?: SyncExportSnapshot) =>
      mockSyncStore.importSnapshot(snapshot),
  )
  ipcMain.handle('sync:import-file', async (event) => {
    const browserWindow = BrowserWindow.fromWebContents(event.sender)
    const options: OpenDialogOptions = {
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile'],
      }
    const result = browserWindow
      ? await dialog.showOpenDialog(browserWindow, options)
      : await dialog.showOpenDialog(options)

    if (result.canceled || !result.filePaths[0]) {
      return undefined
    }

    return mockSyncStore.importSnapshotFromPath(result.filePaths[0])
  })
}
