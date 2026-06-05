import { useState } from 'react'
import type { SyncImportResult, SyncStatus } from '../../../../shared/sync'
import { defaultSyncStatus } from '../../../shared/state/taskFormState'
import { getErrorMessage } from '../../../shared/utils/viewLabels'

type UseSyncDataOptions = {
  loadAppSettings(): Promise<void>
  loadWorkflowRunEvents(workflowId: string): Promise<void>
  loadWorkspaceData(): Promise<void>
  selectedWorkflowId: string | null
  setErrorMessage(message: string | null): void
}

export function useSyncData({
  loadAppSettings,
  loadWorkflowRunEvents,
  loadWorkspaceData,
  selectedWorkflowId,
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
        `${snapshot.actions.length}개 Action, ${snapshot.workflows.length}개 Workflow, ${snapshot.todos.length}개 Todo, ${snapshot.workflowRunEvents.length}개 실행 이벤트를 내보냈습니다.`,
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
        `${snapshot.actions.length}개 Action, ${snapshot.workflows.length}개 Workflow, ${snapshot.todos.length}개 Todo를 외부 JSON 파일로 내보냈습니다.`,
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
      await Promise.all([loadWorkspaceData(), loadAppSettings(), loadSyncStatus()])
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
      await Promise.all([loadWorkspaceData(), loadAppSettings(), loadSyncStatus()])
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handlePruneWorkflowRunEvents() {
    if (!window.pastelFlow) {
      return
    }

    try {
      setErrorMessage(null)
      const removedCount = await window.pastelFlow.workflows.pruneEvents()
      setPruneMessage(`${removedCount}개 실행 이벤트를 정리했습니다.`)
      if (selectedWorkflowId) {
        await loadWorkflowRunEvents(selectedWorkflowId)
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
    handlePruneWorkflowRunEvents,
    loadSyncStatus,
  }
}
