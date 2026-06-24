import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { normalizeLinkedDevices } from '../../../shared/devices'
import type { AppSettingsStore } from '../../settings/store/appSettingsStore'
import type { DeviceStore } from '../../devices/store/deviceStore'
import type { WorkflowStore, WorkflowRunEventStore } from '../../workflows/store'
import type { ActionStore } from '../../actions/actionStore'
import {
  normalizeSyncExportSnapshot,
  sanitizeActionsForSyncExport,
  sanitizeWorkflowsForSyncExport,
  type SyncExportSnapshot,
  type SyncImportResult,
  type SyncStatus,
} from '../../../shared/sync'

import type { ActionDefinition } from '../../../shared/actions'
import type { WorkflowDefinition } from '../../../shared/workflows'
import type { TodoItem } from '../../../shared/todos'
import type { TodoStore } from '../../todos/store/todoStore'

export type MockSyncStore = {
  getStatus(): Promise<SyncStatus>
  exportSnapshot(): Promise<SyncExportSnapshot>
  exportSnapshotToPath(filePath: string): Promise<SyncExportSnapshot>
  importSnapshot(snapshot?: SyncExportSnapshot): Promise<SyncImportResult>
  importSnapshotFromPath(filePath: string): Promise<SyncImportResult>
}

export type MockSyncStoreOptions = {
  dataDir: string
  appSettingsStore: AppSettingsStore
  deviceStore: DeviceStore
  workflowRunEventStore: WorkflowRunEventStore
  actionStore: ActionStore
  workflowStore: WorkflowStore
  todoStore: TodoStore
}

export function createMockSyncStore({
  appSettingsStore,
  dataDir,
  deviceStore,
  workflowRunEventStore,
  actionStore,
  workflowStore,
  todoStore,
}: MockSyncStoreOptions): MockSyncStore {
  const exportPath = path.join(dataDir, 'syncExport.json')

  return {
    async getStatus() {
      return {
        mode: 'mock_file',
        serverDbSyncEnabled: false,
        message:
          '실제 서버 DB 연동은 현재 구현 범위에서 제외되어 있으며 로컬 mock 파일 sync만 사용합니다.',
        exportPath,
        lastExportedAt: await getLastExportedAt(exportPath),
      }
    },

    async exportSnapshot() {
      const [currentDevice, settingsSnapshot, actions, workflows, todos, workflowRunEvents] =
        await Promise.all([
          deviceStore.getCurrentDevice(),
          appSettingsStore.getSnapshot(),
          actionStore.listActions(),
          workflowStore.listWorkflows(),
          todoStore.listTodos({
            includeCompleted: true,
            includeDeleted: true,
          }),
          appSettingsStore
            .getSnapshot()
            .then((snapshot) =>
              workflowRunEventStore.listEvents(undefined, {
                limit: snapshot.settings.workflowRunEventExportLimit,
              }),
            ),
        ])
      const snapshot: SyncExportSnapshot = {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        sourceDevice: currentDevice,
        actions: sanitizeActionsForSyncExport(actions),
        workflows: sanitizeWorkflowsForSyncExport(workflows),
        todos,
        workflowRunEvents,
        linkedDevices: settingsSnapshot.settings.linkedDevices,
      }

      await mkdir(dataDir, { recursive: true })
      await writeFile(exportPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')

      return snapshot
    },

    async exportSnapshotToPath(filePath) {
      const snapshot = await this.exportSnapshot()
      await writeFile(filePath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')

      return snapshot
    },

    async importSnapshot(snapshot) {
      const nextSnapshot = snapshot ?? (await readSnapshot(exportPath))
      const normalizedSnapshot = normalizeSyncExportSnapshot(nextSnapshot)
      const [currentActions, currentWorkflows] = await Promise.all([
        actionStore.listActions(),
        workflowStore.listWorkflows(),
      ])
      const currentTodos = await todoStore.listTodos({
        includeCompleted: true,
        includeDeleted: true,
      })
      const mergedActions = mergeDefinitions(
        currentActions,
        normalizedSnapshot.actions,
      )
      const mergedWorkflows = mergeDefinitions(
        currentWorkflows,
        normalizedSnapshot.workflows,
      )
      const mergedTodos = mergeTodos(currentTodos, normalizedSnapshot.todos)
      const workflowRunEventsAdded = await workflowRunEventStore.importEvents(
        normalizedSnapshot.workflowRunEvents,
      )
      const settingsSnapshot = await appSettingsStore.getSnapshot()
      const linkedDevices = mergeLinkedDevices(
        settingsSnapshot.settings.linkedDevices,
        normalizedSnapshot.linkedDevices,
      )

      await actionStore.replaceActions(mergedActions)
      await Promise.all([
        workflowStore.replaceWorkflows({
          workflows: mergedWorkflows,
        }),
        todoStore.replaceTodos(mergedTodos),
        appSettingsStore.updateSettings({
          ...settingsSnapshot.settings,
          linkedDevices,
        }),
      ])

      return {
        importedAt: new Date().toISOString(),
        todosMerged: countChangedDefinitions(currentTodos, mergedTodos),
        workflowRunEventsAdded,
        linkedDevicesMerged:
          linkedDevices.length - settingsSnapshot.settings.linkedDevices.length,
      }
    },

    async importSnapshotFromPath(filePath) {
      return this.importSnapshot(await readSnapshot(filePath))
    },
  }
}

function countChangedDefinitions<TDefinition extends { id: string }>(
  currentDefinitions: TDefinition[],
  nextDefinitions: TDefinition[],
): number {
  const currentDefinitionMap = new Map(
    currentDefinitions.map((definition) => [definition.id, definition]),
  )

  return nextDefinitions.filter((definition) => {
    const currentDefinition = currentDefinitionMap.get(definition.id)
    return (
      !currentDefinition ||
      JSON.stringify(currentDefinition) !== JSON.stringify(definition)
    )
  }).length
}

async function getLastExportedAt(exportPath: string): Promise<string | undefined> {
  try {
    const fileStat = await stat(exportPath)
    return fileStat.mtime.toISOString()
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return undefined
    }

    throw error
  }
}

async function readSnapshot(exportPath: string): Promise<SyncExportSnapshot> {
  const raw = await readFile(exportPath, 'utf8')
  return normalizeSyncExportSnapshot(JSON.parse(raw))
}

function mergeDefinitions<TDefinition extends ActionDefinition | WorkflowDefinition>(
  currentDefinitions: TDefinition[],
  incomingDefinitions: TDefinition[],
): TDefinition[] {
  const definitionMap = new Map(
    currentDefinitions.map((definition) => [definition.id, definition]),
  )

  for (const incomingDefinition of incomingDefinitions) {
    const currentDefinition = definitionMap.get(incomingDefinition.id)

    if (
      !currentDefinition ||
      incomingDefinition.updatedAt > currentDefinition.updatedAt
    ) {
      definitionMap.set(incomingDefinition.id, incomingDefinition)
    }
  }

  return [...definitionMap.values()].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  )
}

function mergeTodos(
  currentTodos: TodoItem[],
  incomingTodos: TodoItem[],
): TodoItem[] {
  const todoMap = new Map(currentTodos.map((todo) => [todo.id, todo]))

  for (const incomingTodo of incomingTodos) {
    const currentTodo = todoMap.get(incomingTodo.id)

    if (!currentTodo || incomingTodo.updatedAt > currentTodo.updatedAt) {
      todoMap.set(incomingTodo.id, incomingTodo)
    }
  }

  return [...todoMap.values()].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  )
}

function mergeLinkedDevices(
  currentDevices: unknown,
  incomingDevices: unknown,
) {
  const deviceMap = new Map(
    normalizeLinkedDevices(currentDevices).map((device) => [device.id, device]),
  )

  for (const device of normalizeLinkedDevices(incomingDevices)) {
    deviceMap.set(device.id, device)
  }

  return [...deviceMap.values()]
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}
