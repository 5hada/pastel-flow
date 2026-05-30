import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { normalizeLinkedDevices } from '../../../src/shared/devices'
import type { AppSettingsStore } from '../../settings/store/appSettingsStore'
import type { DeviceStore } from '../../devices/store/deviceStore'
import type { TaskRunEventStore } from '../../tasks/store/taskRunEventStore'
import type { TaskStore } from '../../tasks/store/taskStore'
import {
  normalizeSyncExportSnapshot,
  type SyncExportSnapshot,
  type SyncImportResult,
  type SyncStatus,
} from '../../../src/shared/sync'
import type { TaskTemplate } from '../../../src/shared/tasks'

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
  taskRunEventStore: TaskRunEventStore
  taskStore: TaskStore
}

export function createMockSyncStore({
  appSettingsStore,
  dataDir,
  deviceStore,
  taskRunEventStore,
  taskStore,
}: MockSyncStoreOptions): MockSyncStore {
  const exportPath = path.join(dataDir, 'syncExport.json')

  return {
    async getStatus() {
      return {
        exportPath,
        lastExportedAt: await getLastExportedAt(exportPath),
      }
    },

    async exportSnapshot() {
      const [currentDevice, settingsSnapshot, tasks, taskRunEvents] =
        await Promise.all([
          deviceStore.getCurrentDevice(),
          appSettingsStore.getSnapshot(),
          taskStore.listTasks(),
          appSettingsStore
            .getSnapshot()
            .then((snapshot) =>
              taskRunEventStore.listEvents(undefined, {
                limit: snapshot.settings.taskRunEventExportLimit,
              }),
            ),
        ])
      const snapshot: SyncExportSnapshot = {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        sourceDevice: currentDevice,
        tasks: stripLocalTaskState(tasks),
        taskRunEvents,
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
      const currentTasks = await taskStore.listTasks()
      const mergedTasks = mergeTasks(currentTasks, normalizedSnapshot.tasks)
      const taskRunEventsAdded = await taskRunEventStore.importEvents(
        normalizedSnapshot.taskRunEvents,
      )
      const settingsSnapshot = await appSettingsStore.getSnapshot()
      const linkedDevices = mergeLinkedDevices(
        settingsSnapshot.settings.linkedDevices,
        normalizedSnapshot.linkedDevices,
      )

      await Promise.all([
        taskStore.replaceTasks(mergedTasks.tasks),
        appSettingsStore.updateSettings({
          ...settingsSnapshot.settings,
          linkedDevices,
        }),
      ])

      return {
        importedAt: new Date().toISOString(),
        tasksCreated: mergedTasks.created,
        tasksUpdated: mergedTasks.updated,
        taskRunEventsAdded,
        linkedDevicesMerged:
          linkedDevices.length - settingsSnapshot.settings.linkedDevices.length,
      }
    },

    async importSnapshotFromPath(filePath) {
      return this.importSnapshot(await readSnapshot(filePath))
    },
  }
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

function stripLocalTaskState(tasks: TaskTemplate[]): TaskTemplate[] {
  return tasks.map((task) => ({
    ...task,
    state: {
      ...task.state,
      localProfilePath: undefined,
    },
  }))
}

function mergeTasks(
  currentTasks: TaskTemplate[],
  incomingTasks: TaskTemplate[],
): {
  tasks: TaskTemplate[]
  created: number
  updated: number
} {
  const taskMap = new Map(currentTasks.map((task) => [task.id, task]))
  let created = 0
  let updated = 0

  for (const incomingTask of incomingTasks) {
    const currentTask = taskMap.get(incomingTask.id)

    if (!currentTask) {
      taskMap.set(incomingTask.id, incomingTask)
      created += 1
      continue
    }

    if (incomingTask.updatedAt > currentTask.updatedAt) {
      taskMap.set(incomingTask.id, mergeTaskFields(currentTask, incomingTask))
      updated += 1
    } else {
      const mergedTask = mergeTaskFields(incomingTask, currentTask)
      if (JSON.stringify(mergedTask) !== JSON.stringify(currentTask)) {
        taskMap.set(incomingTask.id, mergedTask)
        updated += 1
      }
    }
  }

  return {
    tasks: [...taskMap.values()].sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    ),
    created,
    updated,
  }
}

function mergeTaskFields(
  olderTask: TaskTemplate,
  newerTask: TaskTemplate,
): TaskTemplate {
  return {
    ...newerTask,
    config: {
      ...(olderTask.config as Record<string, unknown>),
      ...(newerTask.config as Record<string, unknown>),
    },
    permissions: {
      ...newerTask.permissions,
      allowedDeviceIds: dedupe([
        ...(olderTask.permissions.allowedDeviceIds ?? []),
        ...(newerTask.permissions.allowedDeviceIds ?? []),
      ]),
      secretRefs: [
        ...new Map(
          [
            ...(olderTask.permissions.secretRefs ?? []),
            ...(newerTask.permissions.secretRefs ?? []),
          ].map((secretRef) => [secretRef.id, secretRef]),
        ).values(),
      ],
    },
    schedule: newerTask.schedule ?? olderTask.schedule,
    state: {
      ...newerTask.state,
      localProfilePath: olderTask.state.localProfilePath,
      status:
        olderTask.state.status === 'running'
          ? olderTask.state.status
          : newerTask.state.status,
    },
  }
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

function dedupe(values: string[]): string[] {
  return [...new Set(values)]
}
