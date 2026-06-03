import type { CurrentDevice, LinkedDevice } from './devices'
import type { WorkflowRunEvent } from './runStatus'
import type { ActionDefinition } from './actions'
import type { WorkflowDefinition } from './workflows'

export type SyncExportSnapshot = {
  schemaVersion: 1
  exportedAt: string
  sourceDevice: CurrentDevice
  actions: ActionDefinition[]
  workflows: WorkflowDefinition[]
  workflowRunEvents: WorkflowRunEvent[]
  linkedDevices: LinkedDevice[]
}

export type SyncImportResult = {
  importedAt: string
  workflowRunEventsAdded: number
  linkedDevicesMerged: number
}

export type SyncMode = 'mock_file'

export type SyncStatus = {
  mode: SyncMode
  serverDbSyncEnabled: false
  message: string
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
    !Array.isArray(candidate.workflowRunEvents) ||
    !Array.isArray(candidate.linkedDevices)
  ) {
    throw new Error('동기화 스냅샷 필수 필드가 누락되었습니다.')
  }

  return {
    ...candidate,
    actions: Array.isArray(candidate.actions) ? candidate.actions : [],
    workflows: Array.isArray(candidate.workflows) ? candidate.workflows : [],
  } as SyncExportSnapshot
}
