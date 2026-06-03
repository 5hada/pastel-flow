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
import { browserAdapter } from './actions/adapters/browserAdapter'
import { crawlerAdapter } from './actions/adapters/crawlerAdapter'
import {
  discordBotAdapter,
  notionSyncAdapter,
  tradingBotAdapter,
} from './actions/adapters/dryRunAdapters'
import { createActionAdapterRegistry } from './actions/adapters/actionAdapterRegistry'
import { registerWorkflowIpc } from './workflows/ipc/workflowIpc'
import { createWorkflowScheduler } from './workflows/scheduler/workflowScheduler'
import { createWorkflowRunEventStore } from './workflows/store/workflowRunEventStore'
import { createWorkflowStore, type WorkflowStore } from './workflows/store/workflowStore'
import { createWorkflowRunner } from './workflows/workflowRunner'
import { ipcEventChannels, type IpcEventChannel } from '../shared/ipcChannels'

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
  const workflowStore = createObservedworkflowStore(createWorkflowStore({
    dataDir,
  }))
  await resetStaleRunningWorkflows(workflowStore)
  const toolModuleStore = createToolModuleStore({
    dataDir,
  })
  const toolModuleRunner = createToolModuleRunner({
    toolModuleStore,
  })
  const workflowRunEventStore = createWorkflowRunEventStore({
    dataDir,
    async getRetentionLimit() {
      const snapshot = await appSettingsStore.getSnapshot()
      return snapshot.settings.workflowRunEventRetentionLimit
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
  const adapterRegistry = createActionAdapterRegistry([
    browserAdapter,
    crawlerAdapter,
    discordBotAdapter,
    notionSyncAdapter,
    tradingBotAdapter,
  ])
  const mockSyncStore = createMockSyncStore({
    dataDir,
    appSettingsStore,
    deviceStore,
    workflowRunEventStore,
    workflowStore,
  })
  const workflowRunner = createWorkflowRunner({
    adapterRegistry,
    appSettingsStore,
    dataDir,
    deviceId: currentDevice.id,
    workflowRunEventStore,
    workflowStore,
    toolModuleRunner,
  })

  registerAppSettingsIpc(ipcMain, appSettingsStore, deviceStore)
  registerSecretIpc(ipcMain, secretStore)
  registerSyncIpc(ipcMain, mockSyncStore)
  registerToolModuleIpc(
    ipcMain,
    toolModuleStore,
    toolModuleRunner,
    workflowStore,
  )
  registerWorkflowIpc(
    ipcMain,
    workflowStore,
    workflowRunner,
    workflowRunEventStore,
    appSettingsStore,
    deviceStore,
  )
  createWorkflowScheduler({
    appSettingsStore,
    deviceStore,
    workflowStore,
    workflowRunner
  }).start()
  createWindow()
})

function createObservedworkflowStore(workflowStore: WorkflowStore): WorkflowStore {
  function broadcast(channel: IpcEventChannel, payload: unknown) {
    BrowserWindow.getAllWindows().forEach((browserWindow) => {
      browserWindow.webContents.send(channel, payload)
    })
  }

  return {
    ...workflowStore,
    async createAction(input) {
      const action = await workflowStore.createAction(input)
      broadcast(ipcEventChannels.actions.changed, action)
      return action
    },
    async updateAction(id, input) {
      const action = await workflowStore.updateAction(id, input)
      broadcast(ipcEventChannels.actions.changed, action)
      return action
    },
    async deleteAction(id) {
      await workflowStore.deleteAction(id)
      broadcast(ipcEventChannels.actions.deleted, id)
    },
    async createWorkflow(input) {
      const workflow = await workflowStore.createWorkflow(input)
      broadcast(ipcEventChannels.workflows.changed, workflow)
      return workflow
    },
    async updateWorkflow(id, input) {
      const workflow = await workflowStore.updateWorkflow(id, input)
      broadcast(ipcEventChannels.workflows.changed, workflow)
      return workflow
    },
    async deleteWorkflow(id) {
      await workflowStore.deleteWorkflow(id)
      broadcast(ipcEventChannels.workflows.deleted, id)
    },
  }
}

async function resetStaleRunningWorkflows(workflowStore: WorkflowStore): Promise<void> {
  const workflows = await workflowStore.listWorkflows()

  await Promise.all(
    workflows
      .filter((workflow) => workflow.state.status === 'running')
      .map((workflow) =>
        workflowStore.updateWorkflow(workflow.id, {
          state: {
            ...workflow.state,
            status: 'idle',
            lastMessage: '앱 시작 시 이전 실행 상태를 정리했습니다.',
          },
        }),
      ),
  )
}
