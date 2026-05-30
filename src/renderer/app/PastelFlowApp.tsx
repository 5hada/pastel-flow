import { FormEvent, useEffect, useMemo, useState } from 'react'
import type { CurrentDevice } from '../../shared/devices'
import {
  type AppSettings,
  type TaskListDisplayMode,
} from '../../shared/settings'
import {
  createDefaultBrowserTabGroupConfig,
  normalizeDevicePolicy,
  normalizeBrowserTabGroupConfig,
  type BrowserTabGroupConfig,
  type DiscordBotConfig,
  type NotionSyncConfig,
  type TaskTemplate,
  type TradingBotConfig,
  type ActionDefinition,
  type WorkflowDefinition,
} from '../../shared/tasks'
import type { LocalSecretMetadata } from '../../shared/secrets'
import type { SecretStorageStatus } from '../../shared/secrets'
import type { SyncImportResult, SyncStatus } from '../../shared/sync'
import type { TaskRunEvent } from '../../shared/taskRunEvents'
import type {
  RegisteredToolModule,
  ToolModuleRunResult,
} from '../../shared/tools'
import type { CreateTaskInput } from '../api/tasksApi'
import {
  createBrowserTaskForm,
  defaultCreateForm,
  defaultEditForm,
  defaultSecretForm,
  defaultSecretStorageStatus,
  defaultSettingsForm,
  defaultSyncStatus,
  initialSettingsSnapshot,
  type BrowserTaskFormState,
  type NavigationCategory,
  type SecretFormState,
  type SettingsCategory,
  type SettingsSaveState,
  type WorkspaceMode,
} from './taskFormState'
import { TopModeBar } from './components/shell/TopModeBar'
import { WorkspaceSidebar } from './components/shell/WorkspaceSidebar'
import { ActionWorkspacePanel } from './components/actions/ActionWorkspacePanel'
import { TaskLaunchPanel } from './components/run/TaskLaunchPanel'
import { EditWorkspace } from './components/tasks/EditWorkspace'
import { ToolsPanel } from './components/tools/ToolsPanel'
import { AppSettingsPanel } from './components/settings/AppSettingsPanel'
import {
  createDevicePolicyFromForm,
  createTaskConfigFromForm,
  createTaskScheduleFromForm,
  isSettingsDirty,
  normalizeCrawlerConfig,
} from './utils/taskFormTransforms'
import {
  createToolInputDefaults,
  filterTasks,
  getErrorMessage,
  getNavigationCategoryLabel,
  getWorkspaceModeLabel,
} from './utils/viewLabels'

function App() {
  const [tasks, setTasks] = useState<TaskTemplate[]>([])
  const [actions, setActions] = useState<ActionDefinition[]>([])
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([])
  const [taskRunEvents, setTaskRunEvents] = useState<TaskRunEvent[]>([])
  const [secrets, setSecrets] = useState<LocalSecretMetadata[]>([])
  const [secretStorageStatus, setSecretStorageStatus] =
    useState<SecretStorageStatus>(defaultSecretStorageStatus)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(defaultSyncStatus)
  const [syncResult, setSyncResult] = useState<SyncImportResult | null>(null)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [toolModules, setToolModules] = useState<RegisteredToolModule[]>([])
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null)
  const [toolInputValues, setToolInputValues] = useState<
    Record<string, unknown>
  >({})
  const [toolRunResult, setToolRunResult] =
    useState<ToolModuleRunResult | null>(null)
  const [toolMessage, setToolMessage] = useState<string | null>(null)
  const [pruneMessage, setPruneMessage] = useState<string | null>(null)
  const [appSettings, setAppSettings] = useState<AppSettings>(
    initialSettingsSnapshot.settings,
  )
  const [settingsForm, setSettingsForm] =
    useState<AppSettings>(defaultSettingsForm)
  const [userDataPath, setUserDataPath] = useState(
    initialSettingsSnapshot.userDataPath,
  )
  const [currentDevice, setCurrentDevice] = useState<CurrentDevice>(
    initialSettingsSnapshot.currentDevice,
  )
  const [createForm, setCreateForm] =
    useState<BrowserTaskFormState>(defaultCreateForm)
  const [editForm, setEditForm] =
    useState<BrowserTaskFormState>(defaultEditForm)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null)
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(
    null,
  )
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('run')
  const [selectedCategory, setSelectedCategory] =
    useState<NavigationCategory>('all')
  const [selectedSettingsCategory, setSelectedSettingsCategory] =
    useState<SettingsCategory>('general')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [confirmDeleteTaskId, setConfirmDeleteTaskId] = useState<string | null>(
    null,
  )
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null)
  const [stoppingTaskId, setStoppingTaskId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [settingsSaveState, setSettingsSaveState] =
    useState<SettingsSaveState>(null)
  const [settingsErrorMessage, setSettingsErrorMessage] = useState<
    string | null
  >(null)
  const [secretForm, setSecretForm] =
    useState<SecretFormState>(defaultSecretForm)

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  )

  const visibleTasks = useMemo(
    () => filterTasks(tasks, selectedCategory),
    [tasks, selectedCategory],
  )

  useEffect(() => {
    void loadAppSettings()
    void loadSecrets()
    void loadSecretStorageStatus()
    void loadSyncStatus()
    void loadToolModules()
    void loadTasks()
    void loadActionWorkflowData()
  }, [])

  useEffect(() => {
    if (!window.pastelFlow) {
      return undefined
    }

    return window.pastelFlow.tasks.onChanged((updatedTask) => {
      if (updatedTask.id === selectedTaskId) {
        void loadTaskRunEvents(updatedTask.id)
      }

      setTasks((currentTasks) => {
        if (!currentTasks.some((task) => task.id === updatedTask.id)) {
          return [...currentTasks, updatedTask]
        }

        return currentTasks.map((task) =>
          task.id === updatedTask.id ? updatedTask : task,
        )
      })
    })
  }, [selectedTaskId])

  useEffect(() => {
    if (selectedTaskId) {
      void loadTaskRunEvents(selectedTaskId)
    } else {
      setTaskRunEvents([])
    }
  }, [selectedTaskId])

  useEffect(() => {
    document.documentElement.dataset.theme = appSettings.themeMode
  }, [appSettings.themeMode])

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (tasks.length === 0) {
      setSelectedTaskId(null)
      setConfirmDeleteTaskId(null)
      if (workspaceMode === 'workflows') {
        setWorkspaceMode('run')
      }
      return
    }

    if (!selectedTaskId || !tasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(tasks[0].id)
    }
  }, [tasks, isLoading, selectedTaskId, workspaceMode])

  async function loadTasks() {
    if (!window.pastelFlow) {
      setErrorMessage('Pastel Flow API를 불러오지 못했습니다.')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setErrorMessage(null)
      setTasks(await window.pastelFlow.tasks.list())
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  async function loadAppSettings() {
    if (!window.pastelFlow) {
      setErrorMessage('Pastel Flow API를 불러오지 못했습니다.')
      return
    }

    try {
      setSettingsErrorMessage(null)
      const snapshot = await window.pastelFlow.settings.get()
      setAppSettings(snapshot.settings)
      setSettingsForm(snapshot.settings)
      setUserDataPath(snapshot.userDataPath)
      setCurrentDevice(snapshot.currentDevice)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function refreshWorkspaceData() {
    await Promise.all([loadTasks(), loadActionWorkflowData()])
  }

  async function loadActionWorkflowData() {
    if (!window.pastelFlow) {
      return
    }

    try {
      const [loadedActions, loadedWorkflows] = await Promise.all([
        window.pastelFlow.actions.list(),
        window.pastelFlow.workflows.list(),
      ])
      setActions(loadedActions)
      setWorkflows(loadedWorkflows)
      setSelectedActionId(
        (currentActionId) => currentActionId ?? loadedActions[0]?.id ?? null,
      )
      setSelectedWorkflowId(
        (currentWorkflowId) =>
          currentWorkflowId ?? loadedWorkflows[0]?.id ?? null,
      )
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function loadSecrets() {
    if (!window.pastelFlow) {
      return
    }

    try {
      setSecrets(await window.pastelFlow.secrets.list())
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function loadSecretStorageStatus() {
    if (!window.pastelFlow) {
      return
    }

    try {
      setSecretStorageStatus(await window.pastelFlow.secrets.status())
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

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

  async function loadToolModules() {
    if (!window.pastelFlow) {
      return
    }

    try {
      const tools = await window.pastelFlow.tools.list()
      setToolModules(tools)
      setSelectedToolId((currentToolId) => currentToolId ?? tools[0]?.id ?? null)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function loadTaskRunEvents(taskId: string) {
    if (!window.pastelFlow) {
      return
    }

    try {
      setTaskRunEvents(await window.pastelFlow.tasks.listEvents(taskId))
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedName = createForm.name.trim()
    if (!trimmedName || !window.pastelFlow) {
      return
    }

    const input: CreateTaskInput = {
      name: trimmedName,
      type: createForm.taskType,
      config: createTaskConfigFromForm(createForm),
      permissions: createDevicePolicyFromForm(createForm, currentDevice),
      schedule: createTaskScheduleFromForm(createForm),
    }

    try {
      setErrorMessage(null)
      const createdTask = await window.pastelFlow.tasks.create(input)
      setTasks((currentTasks) => [...currentTasks, createdTask])
      setSelectedTaskId(createdTask.id)
      setCreateForm(createBrowserTaskForm(appSettings))
      await loadActionWorkflowData()
      setWorkspaceMode('run')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  function openRunMode() {
    setWorkspaceMode('run')
    setSettingsForm(appSettings)
    setSettingsSaveState(null)
    setSettingsErrorMessage(null)
    setConfirmDeleteTaskId(null)
  }

  function openActionMode() {
    setCreateForm(createBrowserTaskForm(appSettings))
    setWorkspaceMode('actions')
    setConfirmDeleteTaskId(null)
    void loadActionWorkflowData()
  }

  function openWorkflowMode() {
    if (selectedTask) {
      startEditing(selectedTask)
    }
    setWorkspaceMode('workflows')
    void loadActionWorkflowData()
  }

  function selectWorkflow(workflow: WorkflowDefinition) {
    setSelectedWorkflowId(workflow.id)

    const linkedTask = workflow.legacyTaskId
      ? tasks.find((task) => task.id === workflow.legacyTaskId)
      : null

    if (linkedTask) {
      setSelectedTaskId(linkedTask.id)
      startEditing(linkedTask)
    }
  }

  function openSettingsMode() {
    setSettingsForm(appSettings)
    setSettingsSaveState(null)
    setSettingsErrorMessage(null)
    setWorkspaceMode('settings')
    setSelectedSettingsCategory('general')
    setConfirmDeleteTaskId(null)
  }

  function openToolsMode() {
    setWorkspaceMode('tools')
    setConfirmDeleteTaskId(null)
    void loadToolModules()
  }

  function closeSettingsMode() {
    if (
      isSettingsDirty(settingsForm, appSettings) &&
      !window.confirm('저장하지 않은 설정 변경 사항을 버릴까요?')
    ) {
      return
    }

    setSettingsForm(appSettings)
    setSettingsSaveState(null)
    setSettingsErrorMessage(null)
    setWorkspaceMode('run')
  }

  async function handleSaveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!window.pastelFlow) {
      return
    }

    try {
      setSettingsSaveState(null)
      setSettingsErrorMessage(null)
      const snapshot = await window.pastelFlow.settings.update(settingsForm)
      setAppSettings(snapshot.settings)
      setSettingsForm(snapshot.settings)
      setUserDataPath(snapshot.userDataPath)
      setCurrentDevice(snapshot.currentDevice)
      setSettingsSaveState('saved')
      await loadTasks()
    } catch (error) {
      setSettingsSaveState('failed')
      setSettingsErrorMessage(getErrorMessage(error))
    }
  }

  function startEditing(task: TaskTemplate) {
    const permissions = normalizeDevicePolicy(task.permissions)
    const browserConfig =
      task.type === 'browser_tab_group'
        ? normalizeBrowserTabGroupConfig(
            task.config as Partial<BrowserTabGroupConfig>,
          )
        : createDefaultBrowserTabGroupConfig('')
    const crawlerConfig = normalizeCrawlerConfig(task.config)
    const discordConfig = task.config as Partial<DiscordBotConfig>
    const notionConfig = task.config as Partial<NotionSyncConfig>
    const tradingConfig = task.config as Partial<TradingBotConfig>

    setConfirmDeleteTaskId(null)
    setEditForm({
      taskType: task.type,
      name: task.name,
      browserKind: browserConfig.browserKind,
      runMode: browserConfig.runMode,
      profileSource: browserConfig.profileSource,
      existingProfilePath: browserConfig.existingProfilePath ?? '',
      initialUrls: browserConfig.initialUrls.join('\n'),
      dynamicTemplateUpdates: browserConfig.dynamicTemplateUpdates,
      crawlerUrls: crawlerConfig.urls.join('\n'),
      crawlerMaxBytes: crawlerConfig.maxBytes,
      discordCommandPrefix: discordConfig.commandPrefix ?? '!',
      notionDatabaseId: notionConfig.databaseId ?? '',
      tradingExchange: tradingConfig.exchange ?? '',
      tradingSymbol: tradingConfig.symbol ?? '',
      scheduleEnabled: task.schedule?.enabled ?? false,
      scheduleMode: task.schedule?.mode ?? 'interval',
      scheduleIntervalMinutes: task.schedule?.intervalMinutes ?? 60,
      scheduleTimeOfDay: task.schedule?.timeOfDay ?? '09:00',
      scheduleDaysOfWeek: task.schedule?.daysOfWeek?.join('\n') ?? '1\n2\n3\n4\n5',
      visibility: permissions.visibility,
      execution: permissions.execution,
      allowedDeviceIds: permissions.allowedDeviceIds?.join('\n') ?? '',
      secretRefIds:
        permissions.secretRefs?.map((secretRef) => secretRef.id).join('\n') ??
        '',
    })
  }

  function openCategory(category: NavigationCategory) {
    setSelectedCategory(category)
    openRunMode()
  }

  async function handleTaskListDisplayModeChange(
    taskListDisplayMode: TaskListDisplayMode,
  ) {
    const nextSettings = {
      ...appSettings,
      taskListDisplayMode,
    }

    setAppSettings(nextSettings)
    setSettingsForm((currentForm) => ({
      ...currentForm,
      taskListDisplayMode,
    }))

    if (!window.pastelFlow) {
      return
    }

    try {
      setErrorMessage(null)
      const snapshot = await window.pastelFlow.settings.update(nextSettings)
      setAppSettings(snapshot.settings)
      setSettingsForm(snapshot.settings)
      setUserDataPath(snapshot.userDataPath)
      setCurrentDevice(snapshot.currentDevice)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleWorkflowGridColumnCountChange(
    workflowGridColumnCount: number,
  ) {
    const nextSettings = {
      ...appSettings,
      workflowGridColumnCount,
    }

    setAppSettings(nextSettings)
    setSettingsForm((currentForm) => ({
      ...currentForm,
      workflowGridColumnCount,
    }))

    if (!window.pastelFlow) {
      return
    }

    try {
      setErrorMessage(null)
      const snapshot = await window.pastelFlow.settings.update(nextSettings)
      setAppSettings(snapshot.settings)
      setSettingsForm(snapshot.settings)
      setUserDataPath(snapshot.userDataPath)
      setCurrentDevice(snapshot.currentDevice)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleUpdateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedTask || !window.pastelFlow) {
      return
    }

    const trimmedName = editForm.name.trim()
    if (!trimmedName) {
      return
    }

    try {
      setErrorMessage(null)
      const updatedTask = await window.pastelFlow.tasks.update(selectedTask.id, {
        name: trimmedName,
        config: createTaskConfigFromForm(
          {
            ...editForm,
            taskType: selectedTask.type,
          },
          selectedTask,
        ),
        permissions: createDevicePolicyFromForm(editForm, currentDevice),
        schedule: createTaskScheduleFromForm(editForm),
      })
      await loadActionWorkflowData()
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === updatedTask.id ? updatedTask : task,
        ),
      )
      setSelectedTaskId(updatedTask.id)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!window.pastelFlow) {
      return
    }

    const nextTask = tasks.find((task) => task.id !== taskId) ?? null

    try {
      setErrorMessage(null)
      await window.pastelFlow.tasks.delete(taskId)
      setTasks((currentTasks) =>
        currentTasks.filter((task) => task.id !== taskId),
      )
      setSelectedTaskId(nextTask?.id ?? null)
      setConfirmDeleteTaskId(null)
      if (!nextTask) {
        setWorkspaceMode('run')
      } else {
        startEditing(nextTask)
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleRunTask(taskId: string) {
    if (!window.pastelFlow) {
      return
    }

    try {
      setRunningTaskId(taskId)
      setSelectedTaskId(taskId)
      setErrorMessage(null)
      const updatedTask = await window.pastelFlow.tasks.run(taskId)
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === updatedTask.id ? updatedTask : task,
        ),
      )

      if (updatedTask.state.status === 'failed') {
        setErrorMessage(updatedTask.state.lastError ?? '작업 실행에 실패했습니다.')
      }
      await loadTaskRunEvents(taskId)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setRunningTaskId(null)
    }
  }

  async function handleStopTask(taskId: string) {
    if (!window.pastelFlow) {
      return
    }

    try {
      setStoppingTaskId(taskId)
      setSelectedTaskId(taskId)
      setErrorMessage(null)
      const updatedTask = await window.pastelFlow.tasks.stop(taskId)
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === updatedTask.id ? updatedTask : task,
        ),
      )
      await loadTaskRunEvents(taskId)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setStoppingTaskId(null)
    }
  }

  async function handleCreateSecret() {
    if (!window.pastelFlow) {
      return
    }

    try {
      setSettingsErrorMessage(null)
      const createdSecret = await window.pastelFlow.secrets.create(secretForm)
      setSecrets((currentSecrets) => [...currentSecrets, createdSecret])
      setSecretForm(defaultSecretForm)
    } catch (error) {
      setSettingsErrorMessage(getErrorMessage(error))
    }
  }

  async function handleDeleteSecret(secretId: string) {
    if (!window.pastelFlow) {
      return
    }

    try {
      setSettingsErrorMessage(null)
      await window.pastelFlow.secrets.delete(secretId)
      setSecrets((currentSecrets) =>
        currentSecrets.filter((secret) => secret.id !== secretId),
      )
    } catch (error) {
      setSettingsErrorMessage(getErrorMessage(error))
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
        `${snapshot.tasks.length}개 작업과 ${snapshot.taskRunEvents.length}개 실행 이벤트를 내보냈습니다.`,
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
        `${snapshot.tasks.length}개 작업을 외부 JSON 파일로 내보냈습니다.`,
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
      const result = await window.pastelFlow.sync.import()
      setSyncResult(result)
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
      const removedCount = await window.pastelFlow.tasks.pruneEvents()
      setPruneMessage(`${removedCount}개 실행 이벤트를 정리했습니다.`)
      if (selectedTaskId) {
        await loadTaskRunEvents(selectedTaskId)
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleRegisterToolModule() {
    if (!window.pastelFlow) {
      return
    }

    try {
      setErrorMessage(null)
      setToolMessage(null)
      const registeredTool = await window.pastelFlow.tools.registerFolder()
      if (!registeredTool) {
        return
      }

      await loadToolModules()
      setSelectedToolId(registeredTool.id)
      setToolRunResult(null)
      setToolInputValues(createToolInputDefaults(registeredTool))
      setToolMessage(`${registeredTool.manifest.name} 도구를 등록했습니다.`)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleRunToolModule() {
    if (!window.pastelFlow || !selectedToolId) {
      return
    }

    try {
      setErrorMessage(null)
      setToolMessage(null)
      const result = await window.pastelFlow.tools.run(
        selectedToolId,
        toolInputValues,
      )
      setToolRunResult(result)
      setToolMessage('도구 실행을 완료했습니다.')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleCreateToolAction() {
    if (!window.pastelFlow || !selectedToolId) {
      return
    }

    try {
      setErrorMessage(null)
      setToolMessage(null)
      const action = await window.pastelFlow.tools.createAction(selectedToolId)
      setToolMessage(`${action.name} Action을 생성했습니다.`)
      await loadActionWorkflowData()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>Pastel Flow</h1>
          <p>{getWorkspaceModeLabel(workspaceMode)}</p>
        </div>
        <TopModeBar
          currentMode={workspaceMode}
          onActions={openActionMode}
          onRun={openRunMode}
          onSettings={openSettingsMode}
          onTools={openToolsMode}
          onWorkflows={openWorkflowMode}
        />
        <button
          aria-label="작업 목록 새로고침"
          className="topbar-button"
          type="button"
          disabled={isLoading}
          title="새로고침"
          onClick={() => void refreshWorkspaceData()}
        >
          {isLoading ? '...' : '↻'}
        </button>
      </header>

      {errorMessage ? <p className="error-message">{errorMessage}</p> : null}

      <div className={`app-workspace${isSidebarOpen ? '' : ' is-sidebar-collapsed'}`}>
        {isSidebarOpen ? (
            <WorkspaceSidebar
            actions={actions}
            tasks={tasks}
            toolModules={toolModules}
            workflows={workflows}
            currentMode={workspaceMode}
            selectedCategory={selectedCategory}
            selectedActionId={selectedActionId}
            selectedSettingsCategory={selectedSettingsCategory}
            selectedToolId={selectedToolId}
            selectedWorkflowId={selectedWorkflowId}
            onCategorySelect={openCategory}
            onClose={() => setIsSidebarOpen(false)}
            onCreateAction={() => setSelectedActionId(null)}
            onCreateWorkflow={() => {
              setSelectedWorkflowId(null)
              setSelectedTaskId(null)
            }}
            onSelectAction={setSelectedActionId}
            onSelectSettingsCategory={setSelectedSettingsCategory}
            onSelectTool={(tool) => {
              setSelectedToolId(tool.id)
              setToolRunResult(null)
              setToolMessage(null)
              setToolInputValues(createToolInputDefaults(tool))
            }}
              onSelectWorkflow={selectWorkflow}
          />
        ) : null}

        <div className="workspace-content">
          {!isSidebarOpen ? (
            <button
              aria-label="좌측 패널 열기"
              className="sidebar-toggle floating-toggle"
              type="button"
              title="패널 열기"
              onClick={() => setIsSidebarOpen(true)}
            >
              ☰
            </button>
          ) : null}

          {workspaceMode === 'run' ? (
            <TaskLaunchPanel
              tasks={visibleTasks}
              categoryLabel={getNavigationCategoryLabel(selectedCategory)}
              displayMode={appSettings.taskListDisplayMode}
              isLoading={isLoading}
              runningTaskId={runningTaskId}
              selectedTaskId={selectedTaskId}
              stoppingTaskId={stoppingTaskId}
              gridColumnCount={appSettings.workflowGridColumnCount}
              onCreate={openWorkflowMode}
              onDisplayModeChange={handleTaskListDisplayModeChange}
              onGridColumnCountChange={handleWorkflowGridColumnCountChange}
              onRun={handleRunTask}
              onStop={handleStopTask}
              onSelect={(task) => {
                setSelectedTaskId(task.id)
                setConfirmDeleteTaskId(null)
                startEditing(task)
              }}
            />
          ) : null}

          {workspaceMode === 'actions' ? (
            <ActionWorkspacePanel
              actions={actions}
              createForm={createForm}
              currentDevice={currentDevice}
              selectedActionId={selectedActionId}
              secrets={secrets}
              onChange={setCreateForm}
              onSelectAction={setSelectedActionId}
              onSubmit={handleCreateTask}
            />
          ) : null}

          {workspaceMode === 'workflows' ? (
            <EditWorkspace
              actions={actions}
              confirmDeleteTaskId={confirmDeleteTaskId}
              currentDevice={currentDevice}
              editForm={editForm}
              isLoading={isLoading}
              secrets={secrets}
              selectedWorkflowId={selectedWorkflowId}
              onChange={setEditForm}
              onConfirmDelete={handleDeleteTask}
              onDeleteRequest={setConfirmDeleteTaskId}
              onSelectWorkflow={setSelectedWorkflowId}
              onSubmit={handleUpdateTask}
              selectedTask={selectedTask}
              taskRunEvents={taskRunEvents}
              workflows={workflows}
            />
          ) : null}

          {workspaceMode === 'tools' ? (
            <ToolsPanel
              selectedToolId={selectedToolId}
              toolInputValues={toolInputValues}
              toolMessage={toolMessage}
              toolModules={toolModules}
              toolRunResult={toolRunResult}
              onCreateToolAction={handleCreateToolAction}
              onRegisterToolModule={handleRegisterToolModule}
              onRunToolModule={handleRunToolModule}
              onToolInputChange={(key, value) =>
                setToolInputValues((currentValues) => ({
                  ...currentValues,
                  [key]: value,
                }))
              }
            />
          ) : null}

          {workspaceMode === 'settings' ? (
            <section className="mode-panel" aria-label="앱 설정">
            <AppSettingsPanel
              form={settingsForm}
              pruneMessage={pruneMessage}
              onChange={setSettingsForm}
              onClose={closeSettingsMode}
              onSubmit={handleSaveSettings}
              saveState={settingsSaveState}
              settingsErrorMessage={settingsErrorMessage}
            secretForm={secretForm}
            secretStorageStatus={secretStorageStatus}
            secrets={secrets}
  currentDevice={currentDevice}
  userDataPath={userDataPath}
                onCreateSecret={handleCreateSecret}
                onDeleteSecret={handleDeleteSecret}
                onSecretFormChange={setSecretForm}
                selectedCategory={selectedSettingsCategory}
                syncMessage={syncMessage}
                syncResult={syncResult}
                syncStatus={syncStatus}
                onExportSyncSnapshot={handleExportSyncSnapshot}
                onExportSyncSnapshotFile={handleExportSyncSnapshotFile}
                onImportSyncSnapshot={handleImportSyncSnapshot}
                onImportSyncSnapshotFile={handleImportSyncSnapshotFile}
                onPruneTaskRunEvents={handlePruneTaskRunEvents}
              />
            </section>
          ) : null}
        </div>
      </div>
    </main>
  )
}

export default App
