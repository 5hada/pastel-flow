import type { CurrentDevice, LinkedDevice } from './devices'
import type { TaskRunEvent } from './taskRunEvents'
import type { TaskTemplate } from './tasks'

export type SyncExportSnapshot = {
  schemaVersion: 1
  exportedAt: string
  sourceDevice: CurrentDevice
  tasks: TaskTemplate[]
  taskRunEvents: TaskRunEvent[]
  linkedDevices: LinkedDevice[]
}

export type SyncImportResult = {
  importedAt: string
  tasksCreated: number
  tasksUpdated: number
  taskRunEventsAdded: number
  linkedDevicesMerged: number
}

export type SyncStatus = {
  lastExportedAt?: string
  exportPath: string
}

export function normalizeSyncExportSnapshot(
  value: unknown,
): SyncExportSnapshot {
  if (!value || typeof value !== 'object') {
    throw new Error('동기화 스냅샷 형식이 올바르지 않습니다.')
  }

  const candidate = value as Partial<SyncExportSnapshot>
  if (candidate.schemaVersion !== 1) {
    throw new Error('지원하지 않는 동기화 스냅샷 버전입니다.')
  }

  if (
    typeof candidate.exportedAt !== 'string' ||
    !candidate.sourceDevice ||
    typeof candidate.sourceDevice.id !== 'string' ||
    typeof candidate.sourceDevice.name !== 'string' ||
    !Array.isArray(candidate.tasks) ||
    !Array.isArray(candidate.taskRunEvents) ||
    !Array.isArray(candidate.linkedDevices)
  ) {
    throw new Error('동기화 스냅샷 필수 필드가 누락되었습니다.')
  }

  return candidate as SyncExportSnapshot
}
