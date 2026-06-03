import { useState } from 'react'
import type { SyncImportResult, SyncStatus } from '../../../../shared/sync'
import { defaultSyncStatus } from '../../../shared/state/taskFormState'
import { getErrorMessage } from '../../../shared/utils/viewLabels'

type UseSyncDataOptions = {
  loadAppSettings(): Promise<void>
  loadTaskRunEvents(taskId: string): Promise<void>
  loadTasks(): Promise<void>
  selectedTaskId: string | null
  setErrorMessage(message: string | null): void
}

export function useSyncData({
  loadAppSettings,
  loadTaskRunEvents,
  loadTasks,
  selectedTaskId,
  setErrorMessage,
}: UseSyncDataOptions) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(defaultSyncStatus)
  const [syncResult, setSyncResult] = useState<SyncImportResult | null>(null)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [pruneMessage, setPruneMessage] = useState<string | null>(null)

  async function loadSyncStatus() {
    if (!window.pastelFlow) {
      return
    }

    try {
      setSyncStatus(await window.pastelFlow.sync.status())
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleExportSyncSnapshot() {
    if (!window.pastelFlow) {
      return
    }

    try {
      setErrorMessage(null)
      setSyncResult(null)
      const snapshot = await window.pastelFlow.sync.export()
      setSyncMessage(
        `${snapshot.actions.length}개 Action, ${snapshot.workflows.length}개 Workflow, ${snapshot.workflowRunEvents.length}개 실행 이벤트를 내보냈습니다.`,
      )
      await loadSyncStatus()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleExportSyncSnapshotFile() {
    if (!window.pastelFlow) {
      return
    }

    try {
      setErrorMessage(null)
      setSyncResult(null)
      const snapshot = await window.pastelFlow.sync.exportFile()
      if (!snapshot) {
        return
      }

      setSyncMessage(
        `${snapshot.actions.length}개 Action과 ${snapshot.workflows.length}개 Workflow를 외부 JSON 파일로 내보냈습니다.`,
      )
      await loadSyncStatus()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleImportSyncSnapshot() {
    if (!window.pastelFlow) {
      return
    }

    try {
      setErrorMessage(null)
      setSyncMessage(null)
      setSyncResult(await window.pastelFlow.sync.import())
      await Promise.all([loadTasks(), loadAppSettings(), loadSyncStatus()])
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleImportSyncSnapshotFile() {
    if (!window.pastelFlow) {
      return
    }

    try {
      setErrorMessage(null)
      setSyncMessage(null)
      const result = await window.pastelFlow.sync.importFile()
      if (!result) {
        return
      }

      setSyncResult(result)
      await Promise.all([loadTasks(), loadAppSettings(), loadSyncStatus()])
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handlePruneTaskRunEvents() {
    if (!window.pastelFlow) {
      return
    }

    try {
      setErrorMessage(null)
      const removedCount = await window.pastelFlow.workflows.pruneEvents()
      setPruneMessage(`${removedCount}개 실행 이벤트를 정리했습니다.`)
      if (selectedTaskId) {
        await loadTaskRunEvents(selectedTaskId)
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  return {
    pruneMessage,
    syncMessage,
    syncResult,
    syncStatus,
    handleExportSyncSnapshot,
    handleExportSyncSnapshotFile,
    handleImportSyncSnapshot,
    handleImportSyncSnapshotFile,
    handlePruneTaskRunEvents,
    loadSyncStatus,
  }
}
