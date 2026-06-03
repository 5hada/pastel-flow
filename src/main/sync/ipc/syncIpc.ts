import {
  BrowserWindow,
  dialog,
  type IpcMain,
  type OpenDialogOptions,
} from 'electron'
import { ipcRequestChannels } from '../../../shared/ipcChannels'
import type { SyncExportSnapshot } from '../../../shared/sync'
import type { MockSyncStore } from '../store/mockSyncStore'

export function registerSyncIpc(
  ipcMain: IpcMain,
  mockSyncStore: MockSyncStore,
): void {
  ipcMain.handle(ipcRequestChannels.sync.status, () => mockSyncStore.getStatus())
  ipcMain.handle(ipcRequestChannels.sync.export, () =>
    mockSyncStore.exportSnapshot(),
  )
  ipcMain.handle(ipcRequestChannels.sync.exportFile, async (event) => {
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
    ipcRequestChannels.sync.import,
    (_event, snapshot?: SyncExportSnapshot) =>
      mockSyncStore.importSnapshot(snapshot),
  )
  ipcMain.handle(ipcRequestChannels.sync.importFile, async (event) => {
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
