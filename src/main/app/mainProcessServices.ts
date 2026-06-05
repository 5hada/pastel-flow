import { ipcMain, safeStorage } from 'electron'
import { createActionAdapterRegistry } from '../actions/adapters/actionAdapterRegistry'
import { browserAdapter } from '../actions/adapters/browserAdapter'
import { initializeBrowserActionGroupRuntime } from '../browsers/browserActionGroupRuntime'
import { crawlerAdapter } from '../actions/adapters/crawlerAdapter'
import {
  discordBotAdapter,
  notionSyncAdapter,
  tradingBotAdapter,
} from '../actions/adapters/dryRunAdapters'
import { createDeviceStore } from '../devices/store/deviceStore'
import { registerSecretIpc } from '../secrets/ipc/secretIpc'
import { createSecretStore } from '../secrets/store/secretStore'
import { registerAppSettingsIpc } from '../settings/ipc/appSettingsIpc'
import { createAppSettingsStore } from '../settings/store/appSettingsStore'
import { registerSyncIpc } from '../sync/ipc/syncIpc'
import { createMockSyncStore } from '../sync/store/mockSyncStore'
import { registerToolModuleIpc } from '../tools/ipc/toolModuleIpc'
import { createToolModuleRunner } from '../tools/runner/toolModuleRunner'
import { createToolModuleStore } from '../tools/store/toolModuleStore'
import { createSqliteDatabase } from '../storage/sqliteDatabase'
import { registerWorkflowIpc } from '../workflows/ipc/workflowIpc'
import { createWorkflowScheduler } from '../workflows/scheduler/workflowScheduler'
import { createWorkflowRunEventStore } from '../workflows/store/workflowRunEventStore'
import { createWorkflowRunStore } from '../workflows/store/workflowRunStore'
import { createWorkflowStore } from '../workflows/store/workflowStore'
import { createWorkflowRunner } from '../workflows/workflowRunner'
import { applyLoginItemSettings } from './loginItems'
import { createObservedWorkflowStore } from './workflowStoreEvents'
import { resetStaleRunningWorkflows } from './workflowStartup'

export async function initializeMainProcessServices(dataDir: string): Promise<void> {
  const database = createSqliteDatabase({ dataDir })
  const appSettingsStore = createAppSettingsStore({
    dataDir,
  })
  appSettingsStore.getSnapshot()
    .then((snapshot) => {
      applyLoginItemSettings(snapshot.settings.startAtLogin)
    })
    .catch(() => undefined)

  const deviceStore = createDeviceStore({
    dataDir,
  })
  const currentDevice = await deviceStore.getCurrentDevice()
  const workflowStore = createObservedWorkflowStore(createWorkflowStore({
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
    database,
    async getRetentionLimit() {
      const snapshot = await appSettingsStore.getSnapshot()
      return snapshot.settings.workflowRunEventRetentionLimit
    },
  })
  const workflowRunStore = createWorkflowRunStore({
    database,
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
  await initializeBrowserActionGroupRuntime(dataDir)
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
    workflowRunStore,
    workflowStore,
    toolModuleRunner,
  })

  registerAppSettingsIpc(ipcMain, appSettingsStore, deviceStore, (settings) => {
    applyLoginItemSettings(settings.startAtLogin)
  })
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
    workflowRunStore,
    appSettingsStore,
    deviceStore,
  )
  createWorkflowScheduler({
    appSettingsStore,
    deviceStore,
    workflowStore,
    workflowRunner,
  }).start()
}
