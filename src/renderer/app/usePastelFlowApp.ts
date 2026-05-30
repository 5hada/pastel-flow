import { useEffect, useState, type FormEvent } from 'react'
import type { WorkflowDefinition } from '../../shared/tasks'
import { useActionWorkflowData } from './hooks/useActionWorkflowData'
import { useAppSettingsData } from './hooks/useAppSettingsData'
import { useSecretsData } from './hooks/useSecretsData'
import { useSyncData } from './hooks/useSyncData'
import { useTaskData } from './hooks/useTaskData'
import { useToolModulesData } from './hooks/useToolModulesData'
import {
  createBrowserTaskForm,
  type NavigationCategory,
  type SettingsCategory,
  type WorkspaceMode,
} from './taskFormState'

const sidebarAutoCollapseQuery = '(max-width: 640px)'

export function usePastelFlowApp() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('run')
  const [selectedCategory, setSelectedCategory] =
    useState<NavigationCategory>('all')
  const [selectedSettingsCategory, setSelectedSettingsCategory] =
    useState<SettingsCategory>('general')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const actionWorkflow = useActionWorkflowData(setErrorMessage)
  const settings = useAppSettingsData(setErrorMessage, setWorkspaceMode)
  const tasks = useTaskData({
    appSettings: settings.appSettings,
    currentDevice: settings.currentDevice,
    loadActionWorkflowData: actionWorkflow.loadActionWorkflowData,
    selectedCategory,
    selectAction: actionWorkflow.setSelectedActionId,
    setErrorMessage,
    setWorkspaceMode,
  })
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
    loadTaskRunEvents: tasks.loadTaskRunEvents,
    loadTasks: tasks.loadTasks,
    selectedTaskId: tasks.selectedTaskId,
    setErrorMessage,
  })

  useEffect(() => {
    void settings.loadAppSettings()
    void secrets.loadSecrets()
    void secrets.loadSecretStorageStatus()
    void sync.loadSyncStatus()
    void tools.loadToolModules()
    void tasks.loadTasks()
    void actionWorkflow.loadActionWorkflowData()
    // Bootstrap once; the called loaders own their domain state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia(sidebarAutoCollapseQuery)

    function syncSidebarWithCompactWidth(event: MediaQueryListEvent) {
      setIsSidebarOpen(!event.matches)
    }

    setIsSidebarOpen(!mediaQuery.matches)

    mediaQuery.addEventListener('change', syncSidebarWithCompactWidth)

    return () => {
      mediaQuery.removeEventListener('change', syncSidebarWithCompactWidth)
    }
  }, [])

  async function refreshWorkspaceData() {
    await Promise.all([
      tasks.loadTasks(),
      actionWorkflow.loadActionWorkflowData(),
    ])
  }

  function openRunMode() {
    setWorkspaceMode('run')
    settings.resetSettingsDraft()
    tasks.setConfirmDeleteTaskId(null)
  }

  function openActionMode() {
    tasks.setCreateForm(createBrowserTaskForm(settings.appSettings))
    setWorkspaceMode('actions')
    tasks.setConfirmDeleteTaskId(null)
    void actionWorkflow.loadActionWorkflowData()
  }

  function openWorkflowMode() {
    if (tasks.selectedTask) {
      tasks.startEditing(tasks.selectedTask)
    }
    setWorkspaceMode('workflows')
    void actionWorkflow.loadActionWorkflowData()
  }

  function selectWorkflow(workflow: WorkflowDefinition) {
    actionWorkflow.setSelectedWorkflowId(workflow.id)

    const firstActionRef = [...workflow.actionRefs].sort(
      (left, right) => left.order - right.order,
    )[0]
    const linkedTask = firstActionRef
      ? tasks.tasks.find((task) => task.id === firstActionRef.actionId)
      : null

    if (linkedTask) {
      tasks.setSelectedTaskId(linkedTask.id)
      tasks.startEditing(linkedTask)
    }
  }

  function openSettingsMode() {
    settings.resetSettingsDraft()
    setWorkspaceMode('settings')
    setSelectedSettingsCategory('general')
    tasks.setConfirmDeleteTaskId(null)
  }

  function openToolsMode() {
    setWorkspaceMode('tools')
    tasks.setConfirmDeleteTaskId(null)
    void tools.loadToolModules()
  }

  function openCategory(category: NavigationCategory) {
    setSelectedCategory(category)
    openRunMode()
  }

  async function handleSaveSettings(event: FormEvent<HTMLFormElement>) {
    await settings.handleSaveSettings(event)
    await tasks.loadTasks()
  }

  return {
    actions: actionWorkflow.actions,
    appSettings: settings.appSettings,
    confirmDeleteTaskId: tasks.confirmDeleteTaskId,
    createForm: tasks.createForm,
    currentDevice: settings.currentDevice,
    editForm: tasks.editForm,
    errorMessage,
    isLoading: tasks.isLoading,
    isSidebarOpen,
    pruneMessage: sync.pruneMessage,
    runningTaskId: tasks.runningTaskId,
    runningWorkflowId: actionWorkflow.runningWorkflowId,
    secretForm: secrets.secretForm,
    secretStorageStatus: secrets.secretStorageStatus,
    secrets: secrets.secrets,
    selectedActionId: actionWorkflow.selectedActionId,
    selectedCategory,
    selectedSettingsCategory,
    selectedTask: tasks.selectedTask,
    selectedTaskId: tasks.selectedTaskId,
    selectedToolId: tools.selectedToolId,
    selectedWorkflowId: actionWorkflow.selectedWorkflowId,
    settingsErrorMessage: settings.settingsErrorMessage,
    settingsForm: settings.settingsForm,
    settingsSaveState: settings.settingsSaveState,
    stoppingTaskId: tasks.stoppingTaskId,
    stoppingWorkflowId: actionWorkflow.stoppingWorkflowId,
    syncMessage: sync.syncMessage,
    syncResult: sync.syncResult,
    syncStatus: sync.syncStatus,
    taskRunEvents: tasks.taskRunEvents,
    tasks: tasks.tasks,
    toolInputValues: tools.toolInputValues,
    toolMessage: tools.toolMessage,
    toolModules: tools.toolModules,
    toolRunResult: tools.toolRunResult,
    userDataPath: settings.userDataPath,
    visibleTasks: tasks.visibleTasks,
    workflows: actionWorkflow.workflows,
    workspaceMode,
    closeSettingsMode: settings.closeSettingsMode,
    handleCreateSecret: secrets.handleCreateSecret,
    handleCreateTask: tasks.handleCreateTask,
    handleCreateWorkflow: () =>
      actionWorkflow.createWorkflow({
        name: settings.appSettings.defaultWorkflowName,
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
    handleDeleteTask: tasks.handleDeleteTask,
    handleExportSyncSnapshot: sync.handleExportSyncSnapshot,
    handleExportSyncSnapshotFile: sync.handleExportSyncSnapshotFile,
    handleImportSyncSnapshot: sync.handleImportSyncSnapshot,
    handleImportSyncSnapshotFile: sync.handleImportSyncSnapshotFile,
    handlePruneTaskRunEvents: sync.handlePruneTaskRunEvents,
    handleRegisterToolModule: tools.handleRegisterToolModule,
    handleRunTask: tasks.handleRunTask,
    handleRunWorkflow: actionWorkflow.runWorkflow,
    handleRunToolModule: tools.handleRunToolModule,
    handleSaveSettings,
    handleStopTask: tasks.handleStopTask,
    handleStopWorkflow: actionWorkflow.stopWorkflow,
    handleTaskListDisplayModeChange:
      settings.handleTaskListDisplayModeChange,
    handleUpdateTask: tasks.handleUpdateTask,
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
    setConfirmDeleteTaskId: tasks.setConfirmDeleteTaskId,
    setCreateForm: tasks.setCreateForm,
    setEditForm: tasks.setEditForm,
    setIsSidebarOpen,
    setSecretForm: secrets.setSecretForm,
    setSelectedActionId: actionWorkflow.setSelectedActionId,
    setSelectedSettingsCategory,
    setSelectedTaskId: tasks.setSelectedTaskId,
    setSelectedToolId: tools.setSelectedToolId,
    setSelectedWorkflowId: actionWorkflow.setSelectedWorkflowId,
    setSettingsForm: settings.setSettingsForm,
    setToolInputValues: tools.setToolInputValues,
    setToolMessage: tools.setToolMessage,
    setToolRunResult: tools.setToolRunResult,
    startEditing: tasks.startEditing,
  }
}
