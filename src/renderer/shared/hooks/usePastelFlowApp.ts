import { useEffect, useState, type FormEvent } from 'react'
import type { WorkflowDefinition } from '../../../shared/workflows'
import { useActionWorkflowData } from '../../features/actions/hooks/useActionWorkflowData'
import { useAppSettingsData } from '../../features/settings/hooks/useAppSettingsData'
import { useSecretsData } from '../../features/secrets/hooks/useSecretsData'
import { useSyncData } from '../../features/sync/hooks/useSyncData'
import { useToolModulesData } from '../../features/tools/hooks/useToolModulesData'
import type {
  ActionRun,
  WorkflowRun,
  WorkflowRunEvent,
} from '../../../shared/runStatus'
import {
  createBrowserTaskForm,
  defaultCreateForm,
  type NavigationCategory,
  type SettingsCategory,
  type WorkspaceMode,
} from '../state/taskFormState'
import type {
  AppSettings,
  WorkspaceFolder,
  WorkspaceFolderScope,
} from '../../../shared/settings'
import {
  createDevicePolicyFromForm,
  createTaskConfigFromForm,
  createTaskScheduleFromForm,
  getActionTypeForTaskType,
} from '../utils/taskFormTransforms'
import { getErrorMessage } from '../utils/viewLabels'
import { useWorkspaceShortcuts } from './useWorkspaceShortcuts'

const sidebarAutoCollapseQuery = '(max-width: 640px)'

export function usePastelFlowApp() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('run')
  const [selectedCategory, setSelectedCategory] =
    useState<NavigationCategory>('all')
  const [selectedCollectionFolderId, setSelectedCollectionFolderId] =
    useState<string>('all')
  const [selectedSettingsCategory, setSelectedSettingsCategory] =
    useState<SettingsCategory>('general')
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => !isCompactViewport(),
  )
  const [createForm, setCreateForm] = useState(defaultCreateForm)
  const [workflowRunEvents, setWorkflowRunEvents] = useState<WorkflowRunEvent[]>(
    [],
  )
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([])
  const [selectedWorkflowRunId, setSelectedWorkflowRunId] = useState<string | null>(null)
  const [actionRuns, setActionRuns] = useState<ActionRun[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  const actionWorkflow = useActionWorkflowData(setErrorMessage)
  const settings = useAppSettingsData(setErrorMessage, setWorkspaceMode)
  const secrets = useSecretsData(
    setErrorMessage,
    settings.setSettingsErrorMessage,
  )
  const tools = useToolModulesData(
    setErrorMessage,
    actionWorkflow.loadActionWorkflowData,
  )
  const sync = useSyncData({
    loadAppSettings: settings.loadAppSettings,
    loadWorkflowRunEvents,
    loadWorkspaceData: reloadWorkspaceData,
    selectedWorkflowId: actionWorkflow.selectedWorkflowId,
    setErrorMessage,
  })

  useEffect(() => {
    void settings.loadAppSettings()
    void secrets.loadSecrets()
    void secrets.loadSecretStorageStatus()
    void sync.loadSyncStatus()
    void tools.loadToolModules()
    void actionWorkflow.loadActionWorkflowData()
    // Bootstrap once; the called loaders own their domain state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useWorkspaceShortcuts({
    handlers: {
      onOpenActions: openActionMode,
      onOpenRun: openRunMode,
      onOpenSettings: openSettingsMode,
      onOpenTools: openToolsMode,
      onOpenWorkflows: openWorkflowMode,
      onRefresh: () => void refreshWorkspaceData(),
      onRunSelectedWorkflow: (workflowId) =>
        void handleRunWorkflow(workflowId),
    },
    selectedWorkflowId: actionWorkflow.selectedWorkflowId,
    shortcuts: settings.appSettings.shortcuts,
  })

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return undefined
    }

    const mediaQuery = window.matchMedia(sidebarAutoCollapseQuery)

    function syncSidebarWithCompactWidth(event: MediaQueryListEvent) {
      setIsSidebarOpen(!event.matches)
    }

    if (mediaQuery.matches) {
      setIsSidebarOpen(false)
    }

    mediaQuery.addEventListener('change', syncSidebarWithCompactWidth)

    return () => {
      mediaQuery.removeEventListener('change', syncSidebarWithCompactWidth)
    }
  }, [])

  async function refreshWorkspaceData() {
    setIsRefreshing(true)
    try {
      await Promise.all([reloadWorkspaceData(), sync.loadSyncStatus()])
    } finally {
      setIsRefreshing(false)
    }
  }

  async function reloadWorkspaceData() {
    await Promise.all([
      actionWorkflow.loadActionWorkflowData(),
      tools.loadToolModules(),
      settings.loadAppSettings(),
      secrets.loadSecrets(),
    ])
    if (actionWorkflow.selectedWorkflowId) {
      await loadWorkflowRunHistory(actionWorkflow.selectedWorkflowId)
    }
  }

  function openRunMode() {
    setWorkspaceMode('run')
    settings.resetSettingsDraft()
  }

  function openActionMode() {
    setCreateForm(createBrowserTaskForm(settings.appSettings))
    setSelectedCollectionFolderId('all')
    actionWorkflow.setSelectedActionId(null)
    setWorkspaceMode('actions')
    void actionWorkflow.loadActionWorkflowData()
  }

  function openWorkflowMode() {
    setSelectedCollectionFolderId('all')
    actionWorkflow.setSelectedWorkflowId(null)
    clearWorkflowRunHistory()
    setWorkspaceMode('workflows')
    void actionWorkflow.loadActionWorkflowData()
  }

  function selectWorkflow(workflow: WorkflowDefinition) {
    selectWorkflowById(workflow.id)
  }

  function selectWorkflowById(workflowId: string) {
    actionWorkflow.setSelectedWorkflowId(workflowId)
    void loadWorkflowRunHistory(workflowId)
  }

  function openSettingsMode() {
    settings.resetSettingsDraft()
    setWorkspaceMode('settings')
    setSelectedSettingsCategory('general')
  }

  function openToolsMode() {
    setSelectedCollectionFolderId('all')
    tools.setSelectedToolId(null)
    tools.setToolRunResult(null)
    tools.setToolMessage(null)
    setWorkspaceMode('tools')
    void tools.loadToolModules()
  }

  async function updateWorkspaceFolders(
    updater: (settings: AppSettings) => AppSettings,
  ) {
    await settings.updateSettings(updater(settings.appSettings))
  }

  async function createWorkspaceFolder(scope: WorkspaceFolderScope) {
    await updateWorkspaceFolders((currentSettings) => {
      const scopedFolders = currentSettings.workspaceFolders.filter(
        (folder) => folder.scope === scope,
      )
      const folder: WorkspaceFolder = {
        id: `folder_${crypto.randomUUID()}`,
        name: '새 폴더',
        scope,
        order: scopedFolders.length,
      }

      setSelectedCollectionFolderId(folder.id)

      return {
        ...currentSettings,
        workspaceFolders: [...currentSettings.workspaceFolders, folder],
      }
    })
  }

  async function renameWorkspaceFolder(folderId: string, name: string) {
    const trimmedName = name.trim()
    if (!trimmedName) {
      return
    }

    await updateWorkspaceFolders((currentSettings) => ({
      ...currentSettings,
      workspaceFolders: currentSettings.workspaceFolders.map((folder) =>
        folder.id === folderId ? { ...folder, name: trimmedName } : folder,
      ),
    }))
  }

  async function deleteWorkspaceFolder(folderId: string) {
    await updateWorkspaceFolders((currentSettings) => {
      const nextAssignments = { ...currentSettings.workspaceFolderAssignments }
      Object.entries(nextAssignments).forEach(([itemId, currentFolderId]) => {
        if (currentFolderId === folderId) {
          delete nextAssignments[itemId]
        }
      })

      setSelectedCollectionFolderId('all')

      return {
        ...currentSettings,
        workspaceFolders: currentSettings.workspaceFolders
          .filter((folder) => folder.id !== folderId)
          .map((folder, index) => ({ ...folder, order: index })),
        workspaceFolderAssignments: nextAssignments,
      }
    })
  }

  async function moveWorkspaceFolder(folderId: string, direction: -1 | 1) {
    await updateWorkspaceFolders((currentSettings) => {
      const folder = currentSettings.workspaceFolders.find(
        (currentFolder) => currentFolder.id === folderId,
      )
      if (!folder) {
        return currentSettings
      }

      const scopedFolders = currentSettings.workspaceFolders
        .filter((currentFolder) => currentFolder.scope === folder.scope)
        .sort((left, right) => left.order - right.order)
      const index = scopedFolders.findIndex(
        (currentFolder) => currentFolder.id === folderId,
      )
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= scopedFolders.length) {
        return currentSettings
      }

      const reorderedScopedFolders = [...scopedFolders]
      const [movedFolder] = reorderedScopedFolders.splice(index, 1)
      if (!movedFolder) {
        return currentSettings
      }
      reorderedScopedFolders.splice(nextIndex, 0, movedFolder)
      const scopedOrder = new Map(
        reorderedScopedFolders.map((currentFolder, currentIndex) => [
          currentFolder.id,
          currentIndex,
        ]),
      )

      return {
        ...currentSettings,
        workspaceFolders: currentSettings.workspaceFolders.map((currentFolder) =>
          currentFolder.scope === folder.scope
            ? {
                ...currentFolder,
                order: scopedOrder.get(currentFolder.id) ?? currentFolder.order,
              }
            : currentFolder,
        ),
      }
    })
  }

  function openCategory(category: NavigationCategory) {
    setSelectedCategory(category)
    openRunMode()
  }

  async function handleSaveSettings(event: FormEvent<HTMLFormElement>) {
    await settings.handleSaveSettings(event)
    await actionWorkflow.loadActionWorkflowData()
  }

  async function loadWorkflowRunEvents(workflowId: string) {
    if (!window.pastelFlow) {
      return
    }

    try {
      setWorkflowRunEvents(await window.pastelFlow.workflows.listEvents(workflowId))
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function loadWorkflowRunHistory(workflowId: string) {
    if (!window.pastelFlow) {
      return
    }

    try {
      const [events, runs] = await Promise.all([
        window.pastelFlow.workflows.listEvents(workflowId),
        window.pastelFlow.workflows.listRuns(workflowId),
      ])
      setWorkflowRunEvents(events)
      setWorkflowRuns(runs)
      const nextSelectedRunId = runs[0]?.id ?? null
      setSelectedWorkflowRunId(nextSelectedRunId)
      setActionRuns(
        nextSelectedRunId
          ? await window.pastelFlow.workflows.listActionRuns(nextSelectedRunId)
          : [],
      )
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function selectWorkflowRun(runId: string) {
    if (!window.pastelFlow) {
      return
    }

    try {
      setSelectedWorkflowRunId(runId)
      setActionRuns(await window.pastelFlow.workflows.listActionRuns(runId))
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  function clearWorkflowRunHistory() {
    setWorkflowRunEvents([])
    setWorkflowRuns([])
    setSelectedWorkflowRunId(null)
    setActionRuns([])
  }

  async function handleRunWorkflow(workflowId: string) {
    await actionWorkflow.runWorkflow(workflowId)
    await loadWorkflowRunHistory(workflowId)
  }

  async function handleStopWorkflow(workflowId: string) {
    await actionWorkflow.stopWorkflow(workflowId)
    await loadWorkflowRunHistory(workflowId)
  }

  async function handleCreateAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedName = createForm.name.trim()
    if (!trimmedName || !window.pastelFlow) {
      return
    }

    try {
      setErrorMessage(null)
      const createdAction = await window.pastelFlow.actions.create({
        name: trimmedName,
        type: getActionTypeForTaskType(createForm.taskType),
        config: createTaskConfigFromForm(createForm),
      })

      if (createForm.createSingleActionWorkflow) {
        const createdWorkflow = await window.pastelFlow.workflows.create({
          name: trimmedName,
          permissions: createDevicePolicyFromForm(
            createForm,
            settings.currentDevice,
          ),
          schedule: createTaskScheduleFromForm(createForm),
          state: { status: 'idle' },
          actionRefs: [
            {
              id: crypto.randomUUID(),
              actionId: createdAction.id,
              order: 0,
              enabled: true,
            },
          ],
        })
        actionWorkflow.setSelectedWorkflowId(createdWorkflow.id)
        setWorkspaceMode('run')
      } else {
        actionWorkflow.setSelectedActionId(createdAction.id)
        setWorkspaceMode('actions')
      }

      setCreateForm(createBrowserTaskForm(settings.appSettings))
      await actionWorkflow.loadActionWorkflowData()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  return {
    actions: actionWorkflow.actions,
    appSettings: settings.appSettings,
    createForm,
    currentDevice: settings.currentDevice,
    errorMessage,
    isLoading: isRefreshing,
    isSidebarOpen,
    pruneMessage: sync.pruneMessage,
    runningWorkflowId: actionWorkflow.runningWorkflowId,
    secretForm: secrets.secretForm,
    secretStorageStatus: secrets.secretStorageStatus,
    secrets: secrets.secrets,
    selectedActionId: actionWorkflow.selectedActionId,
    selectedCategory,
    selectedCollectionFolderId,
    selectedSettingsCategory,
    selectedToolId: tools.selectedToolId,
    selectedWorkflowId: actionWorkflow.selectedWorkflowId,
    settingsErrorMessage: settings.settingsErrorMessage,
    settingsForm: settings.settingsForm,
    settingsSaveState: settings.settingsSaveState,
    stoppingWorkflowId: actionWorkflow.stoppingWorkflowId,
    syncMessage: sync.syncMessage,
    syncResult: sync.syncResult,
    syncStatus: sync.syncStatus,
    actionRuns,
    workflowRunEvents,
    workflowRuns,
    selectedWorkflowRunId,
    toolInputValues: tools.toolInputValues,
    toolMessage: tools.toolMessage,
    toolModules: tools.toolModules,
    toolRunResult: tools.toolRunResult,
    userDataPath: settings.userDataPath,
    workflows: actionWorkflow.workflows,
    workspaceMode,
    closeSettingsMode: settings.closeSettingsMode,
    handleCreateSecret: secrets.handleCreateSecret,
    handleCreateAction,
    handleCreateWorkflow: (name?: string) =>
      actionWorkflow.createWorkflow({
        name: name?.trim() || settings.appSettings.defaultWorkflowName,
        permissions: {
          visibility: 'local_only',
          execution: 'local_only',
          allowedDeviceIds: settings.currentDevice.id
            ? [settings.currentDevice.id]
            : undefined,
        },
      }),
    handleDeleteWorkflow: actionWorkflow.deleteWorkflow,
    handleCreateToolAction: tools.handleCreateToolAction,
    handleDeleteSecret: secrets.handleDeleteSecret,
    handleDeleteAction: actionWorkflow.deleteAction,
    handleExportSyncSnapshot: sync.handleExportSyncSnapshot,
    handleExportSyncSnapshotFile: sync.handleExportSyncSnapshotFile,
    handleImportSyncSnapshot: sync.handleImportSyncSnapshot,
    handleImportSyncSnapshotFile: sync.handleImportSyncSnapshotFile,
    handlePruneWorkflowRunEvents: sync.handlePruneWorkflowRunEvents,
    handleRegisterToolModule: tools.handleRegisterToolModule,
    handleRunWorkflow,
    handleRunToolModule: tools.handleRunToolModule,
    handleSaveSettings,
    handleStopWorkflow,
    handleTaskListDisplayModeChange:
      settings.handleTaskListDisplayModeChange,
    handleUpdateAction: actionWorkflow.updateAction,
    handleUpdateWorkflow: actionWorkflow.updateWorkflow,
    handleWorkflowGridColumnCountChange:
      settings.handleWorkflowGridColumnCountChange,
    openActionMode,
    openCategory,
    openRunMode,
    openSettingsMode,
    openToolsMode,
    openWorkflowMode,
    refreshWorkspaceData,
    selectWorkflow,
    selectWorkflowById,
    selectWorkflowRun,
    setCreateForm,
    setIsSidebarOpen,
    setSecretForm: secrets.setSecretForm,
    setSelectedActionId: actionWorkflow.setSelectedActionId,
    setSelectedCollectionFolderId,
    setSelectedSettingsCategory,
    setSelectedToolId: tools.setSelectedToolId,
    setSelectedWorkflowId: actionWorkflow.setSelectedWorkflowId,
    setSettingsForm: settings.setSettingsForm,
    setToolInputValues: tools.setToolInputValues,
    setToolMessage: tools.setToolMessage,
    setToolRunResult: tools.setToolRunResult,
    createWorkspaceFolder,
    deleteWorkspaceFolder,
    moveWorkspaceFolder,
    renameWorkspaceFolder,
  }
}

function isCompactViewport(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(sidebarAutoCollapseQuery).matches
  )
}
