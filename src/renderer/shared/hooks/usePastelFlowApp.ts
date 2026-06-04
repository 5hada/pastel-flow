import { useEffect, useState, type FormEvent } from 'react'
import type { WorkflowDefinition } from '../../../shared/workflows'
import { useActionWorkflowData } from '../../features/actions/hooks/useActionWorkflowData'
import { useAppSettingsData } from '../../features/settings/hooks/useAppSettingsData'
import { useSecretsData } from '../../features/secrets/hooks/useSecretsData'
import { useSyncData } from '../../features/sync/hooks/useSyncData'
import { useToolModulesData } from '../../features/tools/hooks/useToolModulesData'
import type { WorkflowRunEvent } from '../../../shared/runStatus'
import {
  createBrowserTaskForm,
  defaultCreateForm,
  type NavigationCategory,
  type SettingsCategory,
  type WorkspaceMode,
} from '../state/taskFormState'
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
  const [selectedSettingsCategory, setSelectedSettingsCategory] =
    useState<SettingsCategory>('general')
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => !isCompactViewport(),
  )
  const [createForm, setCreateForm] = useState(defaultCreateForm)
  const [workflowRunEvents, setWorkflowRunEvents] = useState<WorkflowRunEvent[]>(
    [],
  )
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
        void actionWorkflow.runWorkflow(workflowId),
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
      await loadWorkflowRunEvents(actionWorkflow.selectedWorkflowId)
    }
  }

  function openRunMode() {
    setWorkspaceMode('run')
    settings.resetSettingsDraft()
  }

  function openActionMode() {
    setCreateForm(createBrowserTaskForm(settings.appSettings))
    setWorkspaceMode('actions')
    void actionWorkflow.loadActionWorkflowData()
  }

  function openWorkflowMode() {
    setWorkspaceMode('workflows')
    void actionWorkflow.loadActionWorkflowData()
  }

  function selectWorkflow(workflow: WorkflowDefinition) {
    actionWorkflow.setSelectedWorkflowId(workflow.id)
    void loadWorkflowRunEvents(workflow.id)
  }

  function openSettingsMode() {
    settings.resetSettingsDraft()
    setWorkspaceMode('settings')
    setSelectedSettingsCategory('general')
  }

  function openToolsMode() {
    setWorkspaceMode('tools')
    void tools.loadToolModules()
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
    workflowRunEvents,
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
    handleRunWorkflow: actionWorkflow.runWorkflow,
    handleRunToolModule: tools.handleRunToolModule,
    handleSaveSettings,
    handleStopWorkflow: actionWorkflow.stopWorkflow,
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
    setCreateForm,
    setIsSidebarOpen,
    setSecretForm: secrets.setSecretForm,
    setSelectedActionId: actionWorkflow.setSelectedActionId,
    setSelectedSettingsCategory,
    setSelectedToolId: tools.setSelectedToolId,
    setSelectedWorkflowId: actionWorkflow.setSelectedWorkflowId,
    setSettingsForm: settings.setSettingsForm,
    setToolInputValues: tools.setToolInputValues,
    setToolMessage: tools.setToolMessage,
    setToolRunResult: tools.setToolRunResult,
  }
}

function isCompactViewport(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(sidebarAutoCollapseQuery).matches
  )
}
