import { ipcMain, safeStorage } from 'electron'
import { createActionAdapterRegistry } from '../actions/adapters/actionAdapterRegistry'
import { browserAdapter } from '../actions/adapters/browserAdapter'
import {
  disposeBrowserActionGroupRuntime,
  initializeBrowserActionGroupRuntime,
} from '../browsers/browserActionGroupRuntime'
import { crawlerAdapter } from '../actions/adapters/crawlerAdapter'
import { transformAdapter } from '../actions/adapters/transformAdapter'
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
import { registerTodoIpc } from '../todos/ipc/todoIpc'
import { createTodoStore } from '../todos/store/todoStore'
import { createSqliteDatabase } from '../database/sqliteDatabase'
import { registerUrlGroupIpc } from '../urlGroups/ipc/urlGroupIpc'
import { createUrlGroupItemRunStore } from '../urlGroups/store/urlGroupItemRunStore'
import { createUrlGroupStore } from '../urlGroups/store/urlGroupStore'
import { createWorkflowArtifactWriter } from '../workflows/artifacts/workflowArtifactWriter'
import { registerWorkflowIpc } from '../workflows/ipc/workflowIpc'
import { createWorkflowScheduler } from '../workflows/scheduler/workflowScheduler'
import { createWorkflowArtifactStore } from '../workflows/store/workflowArtifactStore'
import { createWorkflowRunEventStore } from '../workflows/store/workflowRunEventStore'
import { createWorkflowRunStore } from '../workflows/store/workflowRunStore'
import { createWorkflowStore } from '../workflows/store/workflowStore'
import { createWorkflowRunner } from '../workflows/workflowRunner'
import { applyLoginItemSettings } from './loginItems'
import { createObservedWorkflowStore } from './workflowStoreEvents'
import { resetStaleRunningWorkflows } from './workflowStartup'

export type MainProcessServices = {
  dispose(): void
}

export async function initializeMainProcessServices(
  dataDir: string,
): Promise<MainProcessServices> {
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
  const workflowArtifactStore = createWorkflowArtifactStore({
    database,
  })
  const urlGroupStore = createUrlGroupStore({
    database,
  })
  const urlGroupItemRunStore = createUrlGroupItemRunStore({
    database,
  })
  const todoStore = createTodoStore({
    database,
  })
  const workflowArtifactWriter = createWorkflowArtifactWriter({
    artifactStore: workflowArtifactStore,
    dataDir,
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
    transformAdapter,
  ])
  await initializeBrowserActionGroupRuntime(dataDir)
  const mockSyncStore = createMockSyncStore({
    dataDir,
    appSettingsStore,
    deviceStore,
    todoStore,
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
    workflowArtifactWriter,
    workflowStore,
    urlGroupStore,
    urlGroupItemRunStore,
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
  registerTodoIpc(ipcMain, todoStore)
  registerUrlGroupIpc(ipcMain, urlGroupStore)
  registerWorkflowIpc(
    ipcMain,
    workflowStore,
    workflowRunner,
    workflowRunEventStore,
    workflowRunStore,
    workflowArtifactStore,
    urlGroupItemRunStore,
    appSettingsStore,
    deviceStore,
  )
  const workflowScheduler = createWorkflowScheduler({
    appSettingsStore,
    deviceStore,
    workflowStore,
    workflowRunner,
  })
  workflowScheduler.start()

  return {
    dispose() {
      workflowScheduler.stop()
      disposeBrowserActionGroupRuntime()
      database.close()
    },
  }
}
