import { app, BrowserWindow, ipcMain, Menu, safeStorage } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createDeviceStore } from './devices/store/deviceStore'
import { registerSecretIpc } from './secrets/ipc/secretIpc'
import { createSecretStore } from './secrets/store/secretStore'
import { registerAppSettingsIpc } from './settings/ipc/appSettingsIpc'
import { createAppSettingsStore } from './settings/store/appSettingsStore'
import { registerSyncIpc } from './sync/ipc/syncIpc'
import { createMockSyncStore } from './sync/store/mockSyncStore'
import { registerToolModuleIpc } from './tools/ipc/toolModuleIpc'
import { createToolModuleRunner } from './tools/runner/toolModuleRunner'
import { createToolModuleStore } from './tools/store/toolModuleStore'
import { browserTabGroupAdapter } from './tasks/adapters/browserTabGroupAdapter'
import { crawlerAdapter } from './tasks/adapters/crawlerAdapter'
import {
  discordBotAdapter,
  notionSyncAdapter,
  tradingBotAdapter,
} from './tasks/adapters/dryRunAdapters'
import { createTaskAdapterRegistry } from './tasks/adapters/taskAdapterRegistry'
import { registerTaskIpc } from './tasks/ipc/taskIpc'
import { createTaskRunner } from './tasks/runner/taskRunner'
import { createTaskScheduler } from './tasks/scheduler/taskScheduler'
import { createTaskRunEventStore } from './tasks/store/taskRunEventStore'
import { createTaskStore } from './tasks/store/taskStore'
import { createWorkflowRunner } from './workflows/runner/workflowRunner'
import { canViewTaskOnDevice } from '../src/shared/tasks'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST
app.setPath('userData', path.join(app.getPath('appData'), 'pastel-flow'))
app.setName('Pastel Flow')
app.setAppUserModelId('com.pastelflow.app')

let win: BrowserWindow | null
const appIconPath = path.join(process.env.VITE_PUBLIC, 'pastel-flow.png')

function createWindow() {
  win = new BrowserWindow({
    autoHideMenuBar: true,
    icon: appIconPath,
    title: 'Pastel Flow',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })
  win.setIcon(appIconPath)
  win.setMenu(null)

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null)

  const dataDir = app.getPath('userData')
  const appSettingsStore = createAppSettingsStore({
    dataDir,
  })
  const deviceStore = createDeviceStore({
    dataDir,
  })
  const currentDevice = await deviceStore.getCurrentDevice()
  const taskStore = createTaskStore({
    dataDir,
  })
  const toolModuleStore = createToolModuleStore({
    dataDir,
  })
  const toolModuleRunner = createToolModuleRunner({
    toolModuleStore,
  })
  const taskRunEventStore = createTaskRunEventStore({
    dataDir,
    async getRetentionLimit() {
      const snapshot = await appSettingsStore.getSnapshot()
      return snapshot.settings.taskRunEventRetentionLimit
    },
  })
  const secretStore = createSecretStore({
    dataDir,
    encryptionAvailable: safeStorage.isEncryptionAvailable(),
    encryptionBackend:
      typeof safeStorage.getSelectedStorageBackend === 'function'
        ? safeStorage.getSelectedStorageBackend()
        : 'unknown',
    encrypt(value) {
      return safeStorage.encryptString(value).toString('base64')
    },
  })
  const adapterRegistry = createTaskAdapterRegistry([
    browserTabGroupAdapter,
    crawlerAdapter,
    discordBotAdapter,
    notionSyncAdapter,
    tradingBotAdapter,
  ])
  const mockSyncStore = createMockSyncStore({
    dataDir,
    appSettingsStore,
    deviceStore,
    taskRunEventStore,
    taskStore,
  })
  const taskRunner = createTaskRunner({
    taskStore,
    taskRunEventStore,
    appSettingsStore,
    adapterRegistry,
    dataDir,
    deviceId: currentDevice.id,
    async onTaskUpdated(task) {
      const [currentDevice, appSettingsSnapshot] = await Promise.all([
        deviceStore.getCurrentDevice(),
        appSettingsStore.getSnapshot(),
      ])

      if (
        !canViewTaskOnDevice(
          task,
          currentDevice,
          appSettingsSnapshot.settings.linkedDevices,
        )
      ) {
        return
      }

      for (const browserWindow of BrowserWindow.getAllWindows()) {
        browserWindow.webContents.send('tasks:changed', task)
      }
    },
  })
  const workflowRunner = createWorkflowRunner({
    taskRunner,
    taskStore,
    toolModuleRunner,
  })

  registerAppSettingsIpc(ipcMain, appSettingsStore, deviceStore)
  registerSecretIpc(ipcMain, secretStore, taskStore)
  registerSyncIpc(ipcMain, mockSyncStore)
  registerToolModuleIpc(
    ipcMain,
    toolModuleStore,
    toolModuleRunner,
    taskStore,
  )
  registerTaskIpc(
    ipcMain,
    taskStore,
    taskRunner,
    workflowRunner,
    taskRunEventStore,
    appSettingsStore,
    deviceStore,
  )
  createTaskScheduler({
    appSettingsStore,
    deviceStore,
    taskStore,
    workflowRunner,
  }).start()
  createWindow()
})
