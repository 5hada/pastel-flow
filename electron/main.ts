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
import { createTaskScheduler } from './tasks/scheduler/taskScheduler'
import { createTaskRunEventStore } from './tasks/store/taskRunEventStore'
import { createTaskStore, type TaskStore } from './tasks/store/taskStore'
import { createWorkflowRunner } from './workflows/runner/workflowRunner'

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
  const taskStore = createObservedTaskStore(createTaskStore({
    dataDir,
  }))
  await resetStaleRunningWorkflows(taskStore)
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
  const workflowRunner = createWorkflowRunner({
    adapterRegistry,
    appSettingsStore,
    dataDir,
    deviceId: currentDevice.id,
    taskRunEventStore,
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

function createObservedTaskStore(taskStore: TaskStore): TaskStore {
  function broadcast(channel: string, payload: unknown) {
    BrowserWindow.getAllWindows().forEach((browserWindow) => {
      browserWindow.webContents.send(channel, payload)
    })
  }

  return {
    ...taskStore,
    async createAction(input) {
      const action = await taskStore.createAction(input)
      broadcast('actions:changed', action)
      return action
    },
    async updateAction(id, input) {
      const action = await taskStore.updateAction(id, input)
      broadcast('actions:changed', action)
      return action
    },
    async deleteAction(id) {
      await taskStore.deleteAction(id)
      broadcast('actions:deleted', id)
    },
    async createWorkflow(input) {
      const workflow = await taskStore.createWorkflow(input)
      broadcast('workflows:changed', workflow)
      return workflow
    },
    async updateWorkflow(id, input) {
      const workflow = await taskStore.updateWorkflow(id, input)
      broadcast('workflows:changed', workflow)
      return workflow
    },
    async deleteWorkflow(id) {
      await taskStore.deleteWorkflow(id)
      broadcast('workflows:deleted', id)
    },
  }
}

async function resetStaleRunningWorkflows(taskStore: TaskStore): Promise<void> {
  const workflows = await taskStore.listWorkflows()

  await Promise.all(
    workflows
      .filter((workflow) => workflow.state.status === 'running')
      .map((workflow) =>
        taskStore.updateWorkflow(workflow.id, {
          state: {
            ...workflow.state,
            status: 'idle',
            lastMessage: '앱 시작 시 이전 실행 상태를 정리했습니다.',
          },
        }),
      ),
  )
}
