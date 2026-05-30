import { FormEvent, type CSSProperties, useEffect, useMemo, useState } from 'react'
import {
  getDeviceAccessLevelLabel,
  type CurrentDevice,
  type DeviceAccessLevel,
  type LinkedDevice,
} from '../../shared/devices'
import {
  type AppSettings,
  type TaskListDisplayMode,
  type ThemeMode,
} from '../../shared/settings'
import {
  createDefaultBrowserTabGroupConfig,
  getDeviceExecutionPolicyLabel,
  getDeviceVisibilityPolicyLabel,
  getBrowserRunModeLabel,
  isRestrictedDevicePolicy,
  normalizeDevicePolicy,
  normalizeBrowserTabGroupConfig,
  type BrowserKind,
  type BrowserProfileSource,
  type BrowserRunMode,
  type BrowserTabGroupConfig,
  type CrawlerConfig,
  type DeviceExecutionPolicy,
  type DevicePolicy,
  type DeviceVisibilityPolicy,
  type DiscordBotConfig,
  type NotionSyncConfig,
  type SecretRef,
  type TaskScheduleMode,
  type TaskSchedule,
  type TaskState,
  type TaskTemplate,
  type TaskType,
  type TradingBotConfig,
  type ActionDefinition,
  type WorkflowDefinition,
} from '../../shared/tasks'
import type { LocalSecretMetadata } from '../../shared/secrets'
import type { SecretStorageStatus } from '../../shared/secrets'
import type { SyncImportResult, SyncStatus } from '../../shared/sync'
import type { TaskRunEvent, TaskRunEventStatus } from '../../shared/taskRunEvents'
import type {
  RegisteredToolModule,
  ToolModuleField,
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
  taskTypeOptions,
  type BrowserTaskFormState,
  type NavigationCategory,
  type SecretFormState,
  type SettingsCategory,
  type SettingsSaveState,
  type WorkspaceMode,
} from './taskFormState'

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
          onClick={loadTasks}
        >
          {isLoading ? '...' : '↻'}
        </button>
      </header>

      {errorMessage ? <p className="error-message">{errorMessage}</p> : null}

      <div className={`app-workspace${isSidebarOpen ? '' : ' is-sidebar-collapsed'}`}>
        {isSidebarOpen ? (
            <WorkspaceSidebar
            tasks={tasks}
            toolModules={toolModules}
            currentMode={workspaceMode}
            selectedCategory={selectedCategory}
            selectedSettingsCategory={selectedSettingsCategory}
            selectedTask={selectedTask}
            selectedToolId={selectedToolId}
            onCategorySelect={openCategory}
            onClose={() => setIsSidebarOpen(false)}
            onSelectSettingsCategory={setSelectedSettingsCategory}
            onSelectTool={(tool) => {
              setSelectedToolId(tool.id)
              setToolRunResult(null)
              setToolMessage(null)
              setToolInputValues(createToolInputDefaults(tool))
            }}
              onSelectTask={(task) => {
                setSelectedTaskId(task.id)
                startEditing(task)
              }}
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
              onSelectTool={(tool) => {
                setSelectedToolId(tool.id)
                setToolRunResult(null)
                setToolMessage(null)
                setToolInputValues(createToolInputDefaults(tool))
              }}
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

type TopModeBarProps = {
  currentMode: WorkspaceMode
  onActions(): void
  onRun(): void
  onSettings(): void
  onTools(): void
  onWorkflows(): void
}

function TopModeBar({
  currentMode,
  onActions,
  onRun,
  onSettings,
  onTools,
  onWorkflows,
}: TopModeBarProps) {
  const modes: {
    id: WorkspaceMode
    icon: string
    label: string
    onClick(): void
  }[] = [
    { id: 'run', icon: '▶', label: '실행', onClick: onRun },
    { id: 'actions', icon: '+', label: 'Action', onClick: onActions },
    { id: 'workflows', icon: '✎', label: 'Workflow', onClick: onWorkflows },
    { id: 'tools', icon: '◇', label: '도구', onClick: onTools },
    { id: 'settings', icon: '⚙', label: '설정', onClick: onSettings },
  ]

  return (
    <nav className="top-mode-bar" aria-label="작업 모드">
      {modes.map((mode) => (
        <button
          aria-label={mode.label}
          className={currentMode === mode.id ? 'is-active' : ''}
          key={mode.id}
          type="button"
          title={mode.label}
          onClick={mode.onClick}
        >
          <span aria-hidden="true">{mode.icon}</span>
        </button>
      ))}
    </nav>
  )
}

type WorkspaceSidebarProps = {
  tasks: TaskTemplate[]
  toolModules: RegisteredToolModule[]
  currentMode: WorkspaceMode
  selectedCategory: NavigationCategory
  selectedSettingsCategory: SettingsCategory
  selectedTask: TaskTemplate | null
  selectedToolId: string | null
  onCategorySelect(category: NavigationCategory): void
  onClose(): void
  onSelectSettingsCategory(category: SettingsCategory): void
  onSelectTask(task: TaskTemplate): void
  onSelectTool(tool: RegisteredToolModule): void
}

function WorkspaceSidebar({
  tasks,
  toolModules,
  currentMode,
  selectedCategory,
  selectedSettingsCategory,
  selectedTask,
  selectedToolId,
  onCategorySelect,
  onClose,
  onSelectSettingsCategory,
  onSelectTask,
  onSelectTool,
}: WorkspaceSidebarProps) {
  const restrictedCount = tasks.filter((task) =>
    isRestrictedDevicePolicy(task.permissions),
  ).length
  const runningCount = tasks.filter(
    (task) => task.state.status === 'running',
  ).length
  const scheduledCount = tasks.filter((task) => task.schedule?.enabled).length
  const failedCount = tasks.filter((task) => task.state.status === 'failed').length
  const secretCount = tasks.filter(
    (task) => (task.permissions.secretRefs?.length ?? 0) > 0,
  ).length
  const runCategories: {
    id: NavigationCategory
    icon: string
    label: string
    count: number
  }[] = [
    { id: 'all', icon: '□', label: '전체', count: tasks.length },
    { id: 'running', icon: '●', label: '실행 중', count: runningCount },
    { id: 'scheduled', icon: '◷', label: '예약됨', count: scheduledCount },
    { id: 'failed', icon: '!', label: '실패', count: failedCount },
    { id: 'restricted', icon: '◇', label: '제한됨', count: restrictedCount },
    { id: 'secret_required', icon: '◆', label: 'Secret 필요', count: secretCount },
  ]
  const settingsCategories: {
    id: SettingsCategory
    icon: string
    label: string
  }[] = [
    { id: 'general', icon: '◌', label: '일반' },
    { id: 'browser', icon: '▤', label: '브라우저' },
    { id: 'shortcuts', icon: '⌘', label: '단축키' },
    { id: 'devices', icon: '▣', label: '기기' },
    { id: 'secrets', icon: '◆', label: 'Secret' },
    { id: 'sync', icon: '⇄', label: '동기화' },
    { id: 'events', icon: '≡', label: '실행 이벤트' },
    { id: 'data', icon: '▥', label: '데이터 관리' },
  ]

  return (
    <aside className="workspace-sidebar" aria-label="보조 패널">
      <div className="sidebar-group">
        <div className="sidebar-heading">
          <p className="sidebar-label">{getWorkspaceModeLabel(currentMode)}</p>
          <button
            aria-label="좌측 패널 닫기"
            className="sidebar-toggle"
            type="button"
            title="패널 닫기"
            onClick={onClose}
          >
            ☰
          </button>
        </div>

        {currentMode === 'run'
          ? runCategories.map((category) => (
              <button
                className={`sidebar-item${
                  selectedCategory === category.id ? ' is-active' : ''
                }`}
                key={category.id}
                type="button"
                onClick={() => onCategorySelect(category.id)}
              >
                <span aria-hidden="true">{category.icon}</span>
                <strong>{category.label}</strong>
                <em>{category.count}</em>
              </button>
            ))
          : null}

        {currentMode === 'actions' ? (
          <div className="sidebar-empty">
            <strong>Action</strong>
            <span>{tasks.length}개 legacy Action</span>
          </div>
        ) : null}

        {currentMode === 'workflows'
          ? tasks.map((task) => (
              <button
                className={`sidebar-item task-sidebar-item${
                  selectedTask?.id === task.id ? ' is-active' : ''
                }`}
                key={task.id}
                type="button"
                onClick={() => onSelectTask(task)}
              >
                <span aria-hidden="true">□</span>
                <strong>{task.name}</strong>
                <em>{getTaskTypeLabel(task.type)}</em>
              </button>
            ))
          : null}

        {currentMode === 'tools' ? (
          toolModules.length === 0 ? (
            <div className="sidebar-empty">
              <strong>Tool Module</strong>
              <span>등록된 도구가 없습니다.</span>
            </div>
          ) : (
            toolModules.map((tool) => (
              <button
                className={`sidebar-item task-sidebar-item${
                  selectedToolId === tool.id ? ' is-active' : ''
                }`}
                key={tool.id}
                type="button"
                onClick={() => onSelectTool(tool)}
              >
                <span aria-hidden="true">◇</span>
                <strong>{tool.manifest.name}</strong>
                <em>v{tool.manifest.version}</em>
              </button>
            ))
          )
        ) : null}

        {currentMode === 'settings'
          ? settingsCategories.map((category) => (
              <button
                className={`sidebar-item${
                  selectedSettingsCategory === category.id ? ' is-active' : ''
                }`}
                key={category.id}
                type="button"
                onClick={() => onSelectSettingsCategory(category.id)}
              >
                <span aria-hidden="true">{category.icon}</span>
                <strong>{category.label}</strong>
              </button>
            ))
          : null}
      </div>

      <div className="sidebar-note">
        <span>Local first</span>
        <strong>전용 프로필</strong>
      </div>
    </aside>
  )
}

type ToolsPanelProps = {
  selectedToolId: string | null
  toolInputValues: Record<string, unknown>
  toolMessage: string | null
  toolModules: RegisteredToolModule[]
  toolRunResult: ToolModuleRunResult | null
  onCreateToolAction(): Promise<void>
  onRegisterToolModule(): Promise<void>
  onRunToolModule(): Promise<void>
  onSelectTool(tool: RegisteredToolModule): void
  onToolInputChange(key: string, value: unknown): void
}

function ToolsPanel({
  onCreateToolAction,
  onRegisterToolModule,
  onRunToolModule,
  onSelectTool,
  onToolInputChange,
  selectedToolId,
  toolInputValues,
  toolMessage,
  toolModules,
  toolRunResult,
}: ToolsPanelProps) {
  const selectedTool =
    toolModules.find((tool) => tool.id === selectedToolId) ?? null

  return (
    <section className="mode-panel tool-panel" aria-label="도구">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Tool modules</p>
          <h2>도구 모듈</h2>
        </div>
        <button type="button" onClick={() => void onRegisterToolModule()}>
          폴더 등록
        </button>
      </div>
      <section className="settings-subsection" aria-label="tool modules">
        {toolModules.length === 0 ? (
          <div className="empty-state-action">
            <p className="empty-state">등록된 도구 모듈이 없습니다.</p>
            <button type="button" onClick={() => void onRegisterToolModule()}>
              도구 폴더 선택
            </button>
          </div>
        ) : (
          <div className="tool-module-layout">
            <div className="tool-module-list" aria-label="등록된 도구">
              {toolModules.map((tool) => (
                <button
                  className={`tool-module-item${
                    selectedTool?.id === tool.id ? ' is-selected' : ''
                  }`}
                  key={tool.id}
                  type="button"
                  onClick={() => onSelectTool(tool)}
                >
                  <strong>{tool.manifest.name}</strong>
                  <span>
                    {tool.manifest.id} · v{tool.manifest.version}
                  </span>
                </button>
              ))}
            </div>
            {selectedTool ? (
              <div className="tool-module-detail">
                <div className="section-heading compact-heading">
                  <div>
                    <p className="eyebrow">{selectedTool.manifest.id}</p>
                    <h3>{selectedTool.manifest.name}</h3>
                  </div>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => void onCreateToolAction()}
                  >
                    Action 생성
                  </button>
                </div>
                {selectedTool.manifest.description ? (
                  <p className="muted-text">
                    {selectedTool.manifest.description}
                  </p>
                ) : null}
                <dl className="detail-list">
                  <DetailItem
                    label="입력"
                    value={`${selectedTool.manifest.inputs.length}개`}
                  />
                  <DetailItem
                    label="출력"
                    value={`${selectedTool.manifest.outputs.length}개`}
                  />
                  <DetailItem
                    label="권한"
                    value={
                      selectedTool.manifest.permissions.length > 0
                        ? selectedTool.manifest.permissions.join(', ')
                        : '없음'
                    }
                  />
                  <DetailItem
                    label="등록 위치"
                    value={selectedTool.sourcePath}
                  />
                </dl>
                <div className="tool-runner">
                  {selectedTool.manifest.inputs.length > 0 ? (
                    selectedTool.manifest.inputs.map((field) => (
                      <ToolInputField
                        field={field}
                        key={field.key}
                        value={toolInputValues[field.key]}
                        onChange={(value) => onToolInputChange(field.key, value)}
                      />
                    ))
                  ) : (
                    <p className="empty-state">입력 없이 실행할 수 있습니다.</p>
                  )}
                  <div className="form-actions">
                    <button type="button" onClick={() => void onRunToolModule()}>
                      실행
                    </button>
                  </div>
                </div>
                {toolMessage ? (
                  <p className="panel-success">{toolMessage}</p>
                ) : null}
                {toolRunResult ? (
                  <pre className="tool-output">
                    {JSON.stringify(toolRunResult.output, null, 2)}
                  </pre>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </section>
    </section>
  )
}

type ToolInputFieldProps = {
  field: ToolModuleField
  value: unknown
  onChange(value: unknown): void
}

function ToolInputField({ field, onChange, value }: ToolInputFieldProps) {
  const control = field.ui?.control
  const label = field.ui?.label ?? field.key

  if (control === 'toggle' || control === 'checkbox' || field.type === 'boolean') {
    return (
      <label className="tool-field toggle-field">
        <span>
          {label}
          {field.required ? ' *' : ''}
        </span>
        <span className="toggle-switch">
        <input
          checked={value === true || value === 'true'}
          type="checkbox"
          onChange={(event) => onChange(event.target.checked)}
        />
          <span />
        </span>
      </label>
    )
  }

  if (control === 'select' && field.ui?.options?.length) {
    return (
      <label>
        {label}
        {field.required ? ' *' : ''}
        <select
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
        >
          {field.ui.options.map((option) => (
            <option key={String(option.value)} value={String(option.value)}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    )
  }

  if (control === 'radio' && field.ui?.options?.length) {
    return (
      <fieldset className="settings-fieldset">
        <legend>
          {label}
          {field.required ? ' *' : ''}
        </legend>
        <div className="option-swatch-list">
          {field.ui.options.map((option) => (
            <label className="option-swatch" key={String(option.value)}>
              <input
                checked={String(value ?? '') === String(option.value)}
                name={`tool-${field.key}`}
                type="radio"
                value={String(option.value)}
                onChange={() => onChange(option.value)}
              />
              <span style={{ backgroundColor: option.color }}>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    )
  }

  if (control === 'color') {
    return (
      <label>
        {label}
        {field.required ? ' *' : ''}
        <span className="color-input-row">
          <input
            className="color-input"
            type="color"
            value={String(value || '#1f6f68')}
            onChange={(event) => onChange(event.target.value)}
          />
          <input
            value={String(value ?? '')}
            onChange={(event) => onChange(event.target.value)}
          />
        </span>
      </label>
    )
  }

  if (control === 'list' || field.type === 'string[]' || field.type === 'number[]') {
    return (
      <ToolListInputField field={field} value={value} onChange={onChange} />
    )
  }

  if (
    control === 'json' ||
    control === 'textarea' ||
    field.type === 'json' ||
    field.ui?.rows
  ) {
    return (
      <label>
        {label}
        {field.required ? ' *' : ''}
        <textarea
          placeholder={field.ui?.placeholder}
          rows={field.ui?.rows}
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
        />
        {field.ui?.helpText ? (
          <small className="field-help">{field.ui.helpText}</small>
        ) : null}
      </label>
    )
  }

  return (
    <label>
      {label}
      {field.required ? ' *' : ''}
      <input
        max={field.ui?.max}
        min={field.ui?.min}
        placeholder={field.ui?.placeholder}
        step={field.ui?.step}
        type={field.type === 'number' || control === 'number' ? 'number' : 'text'}
        value={String(value ?? '')}
        onChange={(event) => onChange(event.target.value)}
      />
      {field.ui?.helpText ? (
        <small className="field-help">{field.ui.helpText}</small>
      ) : null}
    </label>
  )
}

function ToolListInputField({ field, onChange, value }: ToolInputFieldProps) {
  const values = Array.isArray(value)
    ? value.map(String)
    : String(value ?? '')
        .split('\n')
        .filter(Boolean)
  const label = field.ui?.label ?? field.key

  function updateValue(nextValues: string[]) {
    onChange(nextValues.join('\n'))
  }

  return (
    <fieldset className="settings-fieldset">
      <legend>
        {label}
        {field.required ? ' *' : ''}
      </legend>
      <div className="tool-list-editor">
        {values.length === 0 ? (
          <p className="empty-state">항목이 없습니다.</p>
        ) : (
          values.map((item, index) => (
            <div className="tool-list-row" key={`${field.key}-${index}`}>
              <input
                value={item}
                onChange={(event) =>
                  updateValue(
                    values.map((currentItem, currentIndex) =>
                      currentIndex === index ? event.target.value : currentItem,
                    ),
                  )
                }
              />
              <button
                className="icon-button"
                type="button"
                onClick={() =>
                  updateValue(
                    values.filter((_item, currentIndex) => currentIndex !== index),
                  )
                }
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
      <button
        className="ghost-button"
        type="button"
        onClick={() => updateValue([...values, ''])}
      >
        항목 추가
      </button>
    </fieldset>
  )
}

type TaskListDisplayToggleProps = {
  value: TaskListDisplayMode
  onChange(value: TaskListDisplayMode): void
}

function TaskListDisplayToggle({
  onChange,
  value,
}: TaskListDisplayToggleProps) {
  return (
    <div className="display-toggle" aria-label="목록 표시 형식">
      {(['grid', 'list'] as TaskListDisplayMode[]).map((displayMode) => (
        <button
          aria-label={displayMode === 'grid' ? '그리드 형식' : '목록 형식'}
          className={value === displayMode ? 'is-active' : ''}
          key={displayMode}
          type="button"
          title={displayMode === 'grid' ? '그리드' : '목록'}
          onClick={() => onChange(displayMode)}
        >
          <span aria-hidden="true">{displayMode === 'grid' ? '▦' : '☰'}</span>
        </button>
      ))}
    </div>
  )
}

type TaskEditPanelProps = {
  currentDevice: CurrentDevice
  editForm: BrowserTaskFormState
  secrets: LocalSecretMetadata[]
  onChange(value: BrowserTaskFormState): void
  onSubmit(event: FormEvent<HTMLFormElement>): void
}

type ActionWorkspacePanelProps = {
  actions: ActionDefinition[]
  createForm: BrowserTaskFormState
  currentDevice: CurrentDevice
  selectedActionId: string | null
  secrets: LocalSecretMetadata[]
  onChange(value: BrowserTaskFormState): void
  onSelectAction(actionId: string | null): void
  onSubmit(event: FormEvent<HTMLFormElement>): void
}

function ActionWorkspacePanel({
  actions,
  createForm,
  currentDevice,
  onChange,
  onSelectAction,
  onSubmit,
  secrets,
  selectedActionId,
}: ActionWorkspacePanelProps) {
  const selectedAction =
    actions.find((action) => action.id === selectedActionId) ?? null

  return (
    <section className="mode-panel action-workspace" aria-label="Action 편집">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Actions</p>
          <h2>Action 관리</h2>
        </div>
        <button
          aria-label="새 Action"
          type="button"
          onClick={() => onSelectAction(null)}
        >
          +
        </button>
      </div>
      <div className="editor-layout">
        <div className="editor-list">
          {actions.length === 0 ? (
            <p className="empty-state">저장된 Action이 없습니다.</p>
          ) : (
            actions.map((action) => (
              <button
                className={`editor-list-item${
                  selectedAction?.id === action.id ? ' is-selected' : ''
                }`}
                key={action.id}
                type="button"
                onClick={() => onSelectAction(action.id)}
              >
                <strong>{action.name}</strong>
                <span>{getActionTypeLabel(action.type)}</span>
              </button>
            ))
          )}
        </div>
        <div className="editor-detail">
          {selectedAction ? (
            <>
              <div className="section-heading compact-heading">
                <div>
                  <p className="eyebrow">{getActionTypeLabel(selectedAction.type)}</p>
                  <h3>{selectedAction.name}</h3>
                </div>
              </div>
              <dl className="detail-list">
                <DetailItem label="Action ID" value={selectedAction.id} />
                <DetailItem
                  label="수정 시간"
                  value={formatDate(selectedAction.updatedAt)}
                />
                <DetailItem
                  label="Secret"
                  value={`${selectedAction.secretRefs?.length ?? 0}개`}
                />
                <DetailItem
                  label="입력 / 출력"
                  value={`${selectedAction.inputSchema?.length ?? 0} / ${
                    selectedAction.outputSchema?.length ?? 0
                  }`}
                />
              </dl>
            </>
          ) : (
            <CreateTaskPanel
              createForm={createForm}
              currentDevice={currentDevice}
              secrets={secrets}
              onCancel={() => onSelectAction(actions[0]?.id ?? null)}
              onChange={onChange}
              onSubmit={onSubmit}
            />
          )}
        </div>
      </div>
    </section>
  )
}

type WorkflowActionListProps = {
  actions: ActionDefinition[]
  workflow: WorkflowDefinition | null
}

function WorkflowActionList({ actions, workflow }: WorkflowActionListProps) {
  if (!workflow) {
    return (
      <div className="empty-state-action">
        <p className="empty-state">선택된 Workflow가 없습니다.</p>
        <button type="button">+</button>
      </div>
    )
  }

  const actionMap = new Map(actions.map((action) => [action.id, action]))
  const sortedActionRefs = [...workflow.actionRefs].sort(
    (left, right) => left.order - right.order,
  )

  return (
    <div className="workflow-action-list">
      {sortedActionRefs.length === 0 ? (
        <p className="empty-state">이 Workflow에는 아직 Action이 없습니다.</p>
      ) : (
        sortedActionRefs.map((actionRef, index) => {
          const action = actionMap.get(actionRef.actionId)

          return (
            <div className="workflow-action-row" key={actionRef.id}>
              <span>{index + 1}</span>
              <div>
                <strong>{action?.name ?? actionRef.actionId}</strong>
                <small>
                  {action ? getActionTypeLabel(action.type) : '연결 끊김'}
                </small>
              </div>
              <label className="toggle-switch">
                <input checked={actionRef.enabled} readOnly type="checkbox" />
                <span />
              </label>
              <button className="icon-button" disabled type="button">
                ↑
              </button>
              <button className="icon-button" disabled type="button">
                ↓
              </button>
            </div>
          )
        })
      )}
    </div>
  )
}

type TaskLaunchPanelProps = {
  tasks: TaskTemplate[]
  categoryLabel: string
  displayMode: TaskListDisplayMode
  gridColumnCount: number
  isLoading: boolean
  runningTaskId: string | null
  selectedTaskId: string | null
  stoppingTaskId: string | null
  onCreate(): void
  onDisplayModeChange(value: TaskListDisplayMode): void
  onGridColumnCountChange(value: number): void
  onRun(taskId: string): Promise<void>
  onStop(taskId: string): Promise<void>
  onSelect(task: TaskTemplate): void
}

function TaskLaunchPanel({
  tasks,
  categoryLabel,
  displayMode,
  gridColumnCount,
  isLoading,
  onCreate,
  onDisplayModeChange,
  onGridColumnCountChange,
  onRun,
  onSelect,
  onStop,
  runningTaskId,
  selectedTaskId,
  stoppingTaskId,
}: TaskLaunchPanelProps) {
  return (
    <section className="task-section launch-section" aria-label="Workflow 실행">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{categoryLabel}</p>
          <h2>실행할 Workflow</h2>
        </div>
        <div className="section-actions">
          <TaskListDisplayToggle
            value={displayMode}
            onChange={onDisplayModeChange}
          />
          {displayMode === 'grid' ? (
            <select
              aria-label="그리드 열 수"
              className="compact-select"
              value={gridColumnCount}
              onChange={(event) =>
                onGridColumnCountChange(Number(event.target.value))
              }
            >
              {[2, 3, 4, 5, 6, 7, 8].map((count) => (
                <option key={count} value={count}>
                  {count}열
                </option>
              ))}
            </select>
          ) : null}
          <span>{tasks.length}개</span>
        </div>
      </div>

      {isLoading ? (
        <p className="empty-state">작업을 불러오는 중입니다.</p>
      ) : tasks.length === 0 ? (
        <div className="empty-state empty-state-action">
          <p>아직 저장된 Workflow가 없습니다.</p>
          <button type="button" onClick={onCreate}>
            Workflow 만들기
          </button>
        </div>
      ) : (
        <div
          className={`task-list task-list-${displayMode}`}
          style={
            displayMode === 'grid'
              ? ({
                  '--workflow-grid-columns': gridColumnCount,
                } as CSSProperties)
              : undefined
          }
        >
          {tasks.map((task) => {
            const config =
              task.type === 'browser_tab_group'
                ? normalizeBrowserTabGroupConfig(
                    task.config as Partial<BrowserTabGroupConfig>,
                  )
                : null
            const isRunning = runningTaskId === task.id
            const isStopping = stoppingTaskId === task.id
            const isSelected = selectedTaskId === task.id
            const canStop = task.state.status === 'running'

            return (
              <article
                className={`task-row${isSelected ? ' is-selected' : ''}`}
                key={task.id}
              >
                {displayMode === 'list' ? (
                  <button
                    className="task-select-button"
                    type="button"
                    onClick={() => onSelect(task)}
                  >
                    <span className="task-row-title">{task.name}</span>
                    <span className="task-row-meta">
                      {config
                        ? getBrowserKindLabel(config.browserKind)
                        : getTaskTypeLabel(task.type)} · 마지막 실행{' '}
                      {formatDate(task.state.lastRunAt)}
                    </span>
                  </button>
                ) : (
                  <button
                    className={`workflow-grid-button status-${task.state.status}`}
                    disabled={isRunning || isStopping || canStop}
                    type="button"
                    onClick={() => void onRun(task.id)}
                  >
                    {task.name}
                  </button>
                )}
                {displayMode === 'list' &&
                isRestrictedDevicePolicy(task.permissions) ? (
                  <span className="sensitive-pill">제한됨</span>
                ) : null}
                {displayMode === 'list' ? (
                  <span className={`status-pill status-${task.state.status}`}>
                  {getTaskStatusLabel(task.state.status)}
                  </span>
                ) : null}
                {displayMode === 'list' ? (
                  <button
                    type="button"
                    disabled={isRunning || isStopping}
                    onClick={() =>
                      void (canStop ? onStop(task.id) : onRun(task.id))
                    }
                  >
                    {isStopping
                      ? '중지 중'
                      : canStop
                        ? '중지'
                        : isRunning
                          ? '실행 중'
                          : '실행'}
                  </button>
                ) : null}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

type CreateTaskPanelProps = {
  createForm: BrowserTaskFormState
  currentDevice: CurrentDevice
  secrets: LocalSecretMetadata[]
  onCancel(): void
  onChange(value: BrowserTaskFormState): void
  onSubmit(event: FormEvent<HTMLFormElement>): void
}

function CreateTaskPanel({
  createForm,
  currentDevice,
  onCancel,
  onChange,
  onSubmit,
  secrets,
}: CreateTaskPanelProps) {
  return (
    <section className="mode-panel" aria-label="새 브라우저 작업 생성">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">New template</p>
          <h2>새 단일 Action Workflow</h2>
        </div>
        <button className="ghost-button" type="button" onClick={onCancel}>
          닫기
        </button>
      </div>
      <form className="task-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            작업 타입
            <select
              value={createForm.taskType}
              onChange={(event) =>
                onChange({
                  ...createForm,
                  taskType: event.target.value as TaskType,
                })
              }
            >
              {taskTypeOptions.map((taskType) => (
                <option key={taskType} value={taskType}>
                  {getTaskTypeLabel(taskType)}
                </option>
              ))}
            </select>
          </label>
          <label>
            이름
            <input
              value={createForm.name}
              onChange={(event) =>
                onChange({
                  ...createForm,
                  name: event.target.value,
                })
              }
              placeholder="예: 리서치 세션"
            />
          </label>
        </div>
        <TaskTypeConfigFields form={createForm} onChange={onChange} />
        <ScheduleFields form={createForm} onChange={onChange} />
        <PolicyFields
          currentDevice={currentDevice}
          form={createForm}
          onChange={onChange}
          secrets={secrets}
        />
        <div className="form-actions">
          <button type="submit">생성</button>
        </div>
      </form>
    </section>
  )
}

type EditWorkspaceProps = {
  actions: ActionDefinition[]
  confirmDeleteTaskId: string | null
  currentDevice: CurrentDevice
  editForm: BrowserTaskFormState
  isLoading: boolean
  secrets: LocalSecretMetadata[]
  selectedWorkflowId: string | null
  selectedTask: TaskTemplate | null
  taskRunEvents: TaskRunEvent[]
  workflows: WorkflowDefinition[]
  onChange(value: BrowserTaskFormState): void
  onConfirmDelete(taskId: string): Promise<void>
  onDeleteRequest(taskId: string | null): void
  onSelectWorkflow(workflowId: string | null): void
  onSubmit(event: FormEvent<HTMLFormElement>): void
}

function EditWorkspace({
  actions,
  confirmDeleteTaskId,
  currentDevice,
  editForm,
  isLoading,
  onChange,
  onConfirmDelete,
  onDeleteRequest,
  onSelectWorkflow,
  onSubmit,
  secrets,
  selectedWorkflowId,
  selectedTask,
  taskRunEvents,
  workflows,
}: EditWorkspaceProps) {
  const selectedWorkflow =
    workflows.find((workflow) => workflow.id === selectedWorkflowId) ?? null

  if (isLoading) {
    return (
      <section className="mode-panel">
        <p className="empty-state">작업을 불러오는 중입니다.</p>
      </section>
    )
  }

  if (!selectedTask) {
    return (
      <section className="mode-panel">
        <div className="empty-state empty-state-action">
          <p>수정할 작업이 없습니다.</p>
        </div>
      </section>
    )
  }

  const config =
    selectedTask.type === 'browser_tab_group'
      ? normalizeBrowserTabGroupConfig(
          selectedTask.config as Partial<BrowserTabGroupConfig>,
        )
      : null
  const isConfirmingDelete = confirmDeleteTaskId === selectedTask.id

  return (
    <section aria-label="기존 작업 수정">
      <section className="mode-panel workflow-builder" aria-label="Workflow 작성">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Workflows</p>
            <h2>Workflow 작성</h2>
          </div>
          <button
            aria-label="새 Workflow"
            type="button"
            onClick={() => onSelectWorkflow(null)}
          >
            +
          </button>
        </div>
        <div className="editor-layout">
          <div className="editor-list">
            {workflows.map((workflow) => (
              <button
                className={`editor-list-item${
                  selectedWorkflow?.id === workflow.id ? ' is-selected' : ''
                }`}
                key={workflow.id}
                type="button"
                onClick={() => onSelectWorkflow(workflow.id)}
              >
                <strong>{workflow.name}</strong>
                <span>{workflow.actionRefs.length} Actions</span>
              </button>
            ))}
          </div>
          <div className="editor-detail">
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow">Action order</p>
                <h3>{selectedWorkflow?.name ?? '새 Workflow'}</h3>
              </div>
            </div>
            <WorkflowActionList
              actions={actions}
              workflow={selectedWorkflow}
            />
          </div>
        </div>
      </section>
      <section className="mode-panel" aria-label="선택한 작업 수정">
        <TaskEditPanel
          currentDevice={currentDevice}
          editForm={editForm}
          onChange={onChange}
          onSubmit={onSubmit}
          secrets={secrets}
        />

        <dl className="detail-list">
          <DetailItem label="작업 타입" value={getTaskTypeLabel(selectedTask.type)} />
          <DetailItem label="설정 요약" value={getTaskConfigSummary(selectedTask)} />
          {config ? (
            <>
              <DetailItem label="브라우저" value={getBrowserKindLabel(config.browserKind)} />
              <DetailItem label="실행 방식" value={getBrowserRunModeLabel(config.runMode)} />
              <DetailItem
                label="프로필 소스"
                value={getBrowserProfileSourceLabel(config.profileSource)}
              />
              <DetailItem
                label="동적 업데이트"
                value={config.dynamicTemplateUpdates ? '사용' : '사용 안 함'}
              />
              <DetailItem
                label="탭 그룹 스냅샷"
                value={getTabGroupSnapshotLabel(config)}
              />
              <DetailItem label="프로필 ID" value={config.profileId || '없음'} />
            </>
          ) : null}
          <DetailItem label="예약" value={getTaskScheduleLabel(selectedTask.schedule)} />
          <DetailItem label="상태" value={getTaskStatusLabel(selectedTask.state.status)} />
          <DetailItem label="마지막 실행" value={formatDate(selectedTask.state.lastRunAt)} />
          <DetailItem
            label="마지막 메시지"
            value={selectedTask.state.lastMessage ?? '아직 없음'}
          />
          <DetailItem
            label="출력 경로"
            value={
              selectedTask.state.outputPath ??
              selectedTask.state.localProfilePath ??
              '아직 없음'
            }
          />
          <DetailItem label="생성 시간" value={formatDate(selectedTask.createdAt)} />
          <DetailItem label="수정 시간" value={formatDate(selectedTask.updatedAt)} />
          <DetailItem
            label="표시 정책"
            value={getDeviceVisibilityPolicyLabel(selectedTask.permissions.visibility)}
          />
          <DetailItem
            label="실행 정책"
            value={getDeviceExecutionPolicyLabel(selectedTask.permissions.execution)}
          />
        </dl>

        {selectedTask.state.lastError ? (
          <section className="last-error" aria-label="마지막 오류">
            <h3>마지막 오류</h3>
            <p>{selectedTask.state.lastError}</p>
          </section>
        ) : null}

        <TaskRunEventsPanel events={taskRunEvents} />

        <section className="danger-zone" aria-label="작업 삭제">
          {isConfirmingDelete ? (
            <>
              <p>이 작업을 삭제할까요? 저장된 템플릿 설정이 목록에서 사라집니다.</p>
              <div className="form-actions">
                <button
                  className="danger-button"
                  type="button"
                  onClick={() => void onConfirmDelete(selectedTask.id)}
                >
                  삭제 확정
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => onDeleteRequest(null)}
                >
                  취소
                </button>
              </div>
            </>
          ) : (
            <button
              className="danger-button"
              type="button"
              onClick={() => onDeleteRequest(selectedTask.id)}
            >
              삭제
            </button>
          )}
        </section>
      </section>
    </section>
  )
}

type AppSettingsPanelProps = {
  form: AppSettings
  currentDevice: CurrentDevice
  pruneMessage: string | null
  secretForm: SecretFormState
  secretStorageStatus: SecretStorageStatus
  selectedCategory: SettingsCategory
  secrets: LocalSecretMetadata[]
  saveState: SettingsSaveState
  settingsErrorMessage: string | null
  syncMessage: string | null
  syncResult: SyncImportResult | null
  syncStatus: SyncStatus
  userDataPath: string
  onChange(value: AppSettings): void
  onClose(): void
  onCreateSecret(): void
  onDeleteSecret(secretId: string): void
  onExportSyncSnapshot(): Promise<void>
  onExportSyncSnapshotFile(): Promise<void>
  onImportSyncSnapshot(): Promise<void>
  onImportSyncSnapshotFile(): Promise<void>
  onPruneTaskRunEvents(): Promise<void>
  onSecretFormChange(value: SecretFormState): void
  onSubmit(event: FormEvent<HTMLFormElement>): void
}

function AppSettingsPanel({
  currentDevice,
  form,
  pruneMessage,
  secretForm,
  secretStorageStatus,
  selectedCategory,
  onChange,
  onClose,
  onCreateSecret,
  onDeleteSecret,
  onExportSyncSnapshot,
  onExportSyncSnapshotFile,
  onImportSyncSnapshot,
  onImportSyncSnapshotFile,
  onPruneTaskRunEvents,
  onSecretFormChange,
  onSubmit,
  saveState,
  settingsErrorMessage,
  secrets,
  syncMessage,
  syncResult,
  syncStatus,
  userDataPath,
}: AppSettingsPanelProps) {
  return (
    <>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">App settings</p>
          <h2>앱 설정</h2>
        </div>
        <button className="ghost-button" type="button" onClick={onClose}>
          닫기
        </button>
      </div>

      <form className="task-form" onSubmit={onSubmit}>
        {selectedCategory === 'general' ? (
          <>
            <fieldset className="settings-fieldset">
              <legend>테마</legend>
              <div className="segmented-control">
                {(['system', 'light', 'dark'] as ThemeMode[]).map((themeMode) => (
                  <label key={themeMode}>
                    <input
                      checked={form.themeMode === themeMode}
                      name="themeMode"
                      type="radio"
                      value={themeMode}
                      onChange={() =>
                        onChange({
                          ...form,
                          themeMode,
                        })
                      }
                    />
                    <span>{getThemeModeLabel(themeMode)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="theme-preview" data-preview-theme={form.themeMode}>
              <span>{getThemeModeLabel(form.themeMode)}</span>
              <strong>Pastel Flow</strong>
              <p>설정 저장 전에는 이 미리보기만 변경됩니다.</p>
            </div>

            <label>
              기본 브라우저
              <select
                value={form.defaultBrowserKind}
                onChange={(event) =>
                  onChange({
                    ...form,
                    defaultBrowserKind: event.target.value as BrowserKind,
                  })
                }
              >
                <option value="chrome">Chrome</option>
                <option value="edge">Edge</option>
                <option value="chromium">Chromium</option>
              </select>
            </label>

            <label>
              새 Action 기본 이름
              <input
                value={form.defaultActionName}
                onChange={(event) =>
                  onChange({
                    ...form,
                    defaultActionName: event.target.value,
                  })
                }
              />
            </label>

            <label>
              새 Workflow 기본 이름
              <input
                value={form.defaultWorkflowName}
                onChange={(event) =>
                  onChange({
                    ...form,
                    defaultWorkflowName: event.target.value,
                  })
                }
              />
            </label>

            <label>
              작업 목록 표시 형식
              <select
                value={form.taskListDisplayMode}
                onChange={(event) =>
                  onChange({
                    ...form,
                    taskListDisplayMode: event.target.value as TaskListDisplayMode,
                  })
                }
              >
                <option value="grid">그리드</option>
                <option value="list">목록</option>
              </select>
            </label>

            <label>
              실행 그리드 열 수
              <input
                max={8}
                min={2}
                type="number"
                value={form.workflowGridColumnCount}
                onChange={(event) =>
                  onChange({
                    ...form,
                    workflowGridColumnCount: Number(event.target.value),
                  })
                }
              />
            </label>
          </>
        ) : null}

        {selectedCategory === 'shortcuts' ? (
          <section className="settings-subsection" aria-label="단축키">
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow">Shortcuts</p>
                <h3>단축키 사용자 정의</h3>
              </div>
            </div>
            <div className="shortcut-list">
              {[
                ['실행 페이지 새로고침', 'Ctrl+R'],
                ['Action 화면 열기', 'Ctrl+1'],
                ['Workflow 화면 열기', 'Ctrl+2'],
                ['도구 페이지 열기', 'Ctrl+3'],
              ].map(([label, shortcut]) => (
                <label key={label}>
                  {label}
                  <input value={shortcut} readOnly />
                </label>
              ))}
            </div>
            <p className="muted-text">
              단축키 충돌 감지와 저장은 다음 단계에서 활성화합니다.
            </p>
          </section>
        ) : null}

        {selectedCategory === 'browser' ? (
          <section className="settings-subsection" aria-label="브라우저 설정">
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow">Browser</p>
                <h3>브라우저 실행 정책</h3>
              </div>
            </div>
            <label>
              Chrome 실행 파일 경로
              <input
                value={form.browserExecutablePaths.chrome ?? ''}
                onChange={(event) =>
                  onChange({
                    ...form,
                    browserExecutablePaths: {
                      ...form.browserExecutablePaths,
                      chrome: event.target.value,
                    },
                  })
                }
                placeholder="비워두면 자동으로 찾습니다."
              />
            </label>

            <label>
              Edge 실행 파일 경로
              <input
                value={form.browserExecutablePaths.edge ?? ''}
                onChange={(event) =>
                  onChange({
                    ...form,
                    browserExecutablePaths: {
                      ...form.browserExecutablePaths,
                      edge: event.target.value,
                    },
                  })
                }
                placeholder="비워두면 자동으로 찾습니다."
              />
            </label>

            <label>
              Chromium 실행 파일 경로
              <input
                value={form.browserExecutablePaths.chromium ?? ''}
                onChange={(event) =>
                  onChange({
                    ...form,
                    browserExecutablePaths: {
                      ...form.browserExecutablePaths,
                      chromium: event.target.value,
                    },
                  })
                }
                placeholder="비워두면 자동으로 찾습니다."
              />
            </label>
            <dl className="detail-list">
              <DetailItem label="기본 실행 방식" value="전용 프로필" />
              <DetailItem
                label="기본 프로필 조작"
                value="자동 탐색/강제 조작 안 함"
              />
            </dl>
          </section>
        ) : null}

        {selectedCategory === 'devices' ? (
          <section className="settings-subsection" aria-label="기기 권한">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">Device policy</p>
              <h3>기기별 허용 수준</h3>
            </div>
            <button
              className="ghost-button"
              type="button"
              onClick={() =>
                onChange({
                  ...form,
                  linkedDevices: [
                    ...form.linkedDevices,
                    createEmptyLinkedDevice(),
                  ],
                })
              }
            >
              기기 추가
            </button>
          </div>

          <div className="device-current">
            <span>현재 기기</span>
            <strong>{currentDevice.name || '아직 불러오지 못했습니다.'}</strong>
            <code>{currentDevice.id || '기기 ID 없음'}</code>
          </div>

          {form.linkedDevices.length === 0 ? (
            <p className="muted-text">아직 연동된 기기 설정이 없습니다.</p>
          ) : (
            <div className="linked-device-list">
              {form.linkedDevices.map((device, index) => (
                <LinkedDeviceEditor
                  device={device}
                  key={`${device.id}-${index}`}
                  onChange={(updatedDevice) =>
                    onChange({
                      ...form,
                      linkedDevices: form.linkedDevices.map(
                        (currentDeviceItem, currentIndex) =>
                          currentIndex === index
                            ? updatedDevice
                            : currentDeviceItem,
                      ),
                    })
                  }
                  onRemove={() =>
                    onChange({
                      ...form,
                      linkedDevices: form.linkedDevices.filter(
                        (_device, currentIndex) => currentIndex !== index,
                      ),
                    })
                  }
                />
              ))}
            </div>
          )}
          </section>
        ) : null}

        {selectedCategory === 'secrets' ? (
          <section className="settings-subsection" aria-label="로컬 Secret">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">Secrets</p>
              <h3>로컬 Secret</h3>
            </div>
            <span>{secrets.length}개</span>
          </div>

          <div
            className={`secret-storage-status${
              secretStorageStatus.encryptionAvailable ? ' is-ok' : ' is-warning'
            }`}
          >
            <strong>
              {secretStorageStatus.encryptionAvailable
                ? '암호화 사용 가능'
                : '암호화 사용 불가'}
            </strong>
            <span>{secretStorageStatus.message}</span>
            <code>{secretStorageStatus.backend}</code>
          </div>

          <div className="secret-form">
            <label>
              이름
              <input
                value={secretForm.name}
                onChange={(event) =>
                  onSecretFormChange({
                    ...secretForm,
                    name: event.target.value,
                  })
                }
              />
            </label>
            <label>
              값
              <input
                type="password"
                value={secretForm.value}
                onChange={(event) =>
                  onSecretFormChange({
                    ...secretForm,
                    value: event.target.value,
                  })
                }
              />
            </label>
            <label>
              설명
              <input
                value={secretForm.description}
                onChange={(event) =>
                  onSecretFormChange({
                    ...secretForm,
                    description: event.target.value,
                  })
                }
              />
            </label>
            <button type="button" onClick={onCreateSecret}>
              추가
            </button>
          </div>

          {secrets.length === 0 ? (
            <p className="muted-text">저장된 로컬 Secret이 없습니다.</p>
          ) : (
            <div className="secret-list">
              {secrets.map((secret) => (
                <div className="secret-row" key={secret.id}>
                  <div>
                    <strong>{secret.name}</strong>
                    <small>{secret.description ?? secret.id}</small>
                  </div>
                  <button
                    className="danger-button"
                    type="button"
                    onClick={() => onDeleteSecret(secret.id)}
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
          </section>
        ) : null}

        {selectedCategory === 'sync' ? (
          <section className="settings-subsection" aria-label="동기화">
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow">Mock sync</p>
                <h3>로컬 동기화 스냅샷</h3>
              </div>
            </div>
            <dl className="detail-list">
              <DetailItem
                label="Sync mode"
                value={getSyncModeLabel(syncStatus.mode)}
              />
              <DetailItem
                label="Server DB"
                value={syncStatus.serverDbSyncEnabled ? '사용' : '미사용'}
              />
              <DetailItem
                label="내보내기 파일"
                value={syncStatus.exportPath || '아직 없음'}
              />
              <DetailItem
                label="마지막 내보내기"
                value={formatDate(syncStatus.lastExportedAt)}
              />
            </dl>
            {syncStatus.message ? (
              <p className="muted-text">{syncStatus.message}</p>
            ) : null}
            <div className="form-actions">
              <button type="button" onClick={() => void onExportSyncSnapshot()}>
                내보내기
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={() => void onExportSyncSnapshotFile()}
              >
                파일로 내보내기
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={() => void onImportSyncSnapshot()}
              >
                가져오기
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={() => void onImportSyncSnapshotFile()}
              >
                파일에서 가져오기
              </button>
            </div>
            {syncMessage ? <p className="panel-success">{syncMessage}</p> : null}
            {syncResult ? (
              <p className="panel-success">
                가져오기 완료: 생성 {syncResult.tasksCreated}개, 업데이트{' '}
                {syncResult.tasksUpdated}개, 이벤트{' '}
                {syncResult.taskRunEventsAdded}개
              </p>
            ) : null}
          </section>
        ) : null}

        {selectedCategory === 'events' ? (
          <section className="settings-subsection" aria-label="실행 이벤트">
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow">Run events</p>
                <h3>실행 이벤트 보존</h3>
              </div>
            </div>
            <label>
              실행 이벤트 보존 개수
              <input
                max={2000}
                min={50}
                type="number"
                value={form.taskRunEventRetentionLimit}
                onChange={(event) =>
                  onChange({
                    ...form,
                    taskRunEventRetentionLimit: Number(event.target.value),
                  })
                }
              />
            </label>
            <label>
              Sync export 이벤트 개수
              <input
                max={2000}
                min={0}
                type="number"
                value={form.taskRunEventExportLimit}
                onChange={(event) =>
                  onChange({
                    ...form,
                    taskRunEventExportLimit: Number(event.target.value),
                  })
                }
              />
            </label>
            <div className="form-actions">
              <button
                className="ghost-button"
                type="button"
                onClick={() => void onPruneTaskRunEvents()}
              >
                보존 개수 적용
              </button>
            </div>
            {pruneMessage ? (
              <p className="panel-success">{pruneMessage}</p>
            ) : null}
          </section>
        ) : null}

        {selectedCategory === 'data' ? (
          <section className="settings-subsection" aria-label="데이터 관리">
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow">Data</p>
                <h3>로컬 데이터 위치</h3>
              </div>
            </div>
            <label>
              userData 위치
              <input value={userDataPath || '아직 불러오지 못했습니다.'} readOnly />
            </label>
            <dl className="detail-list">
              <DetailItem label="작업 저장" value="tasks.json" />
              <DetailItem label="도구 등록" value="toolModules.json" />
              <DetailItem label="도구 복사" value="tool-modules/" />
              <DetailItem label="Secret 저장" value="secrets.json" />
            </dl>
          </section>
        ) : null}

        {settingsErrorMessage ? (
          <p className="panel-error">{settingsErrorMessage}</p>
        ) : null}
        {saveState === 'saved' ? (
          <p className="panel-success">설정을 저장했습니다.</p>
        ) : null}

        <div className="form-actions">
          <button type="submit">저장</button>
        </div>
      </form>
    </>
  )
}

function TaskEditPanel({
  currentDevice,
  editForm,
  onChange,
  onSubmit,
  secrets,
}: TaskEditPanelProps) {
  return (
    <>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Edit template</p>
          <h2>작업 수정</h2>
        </div>
      </div>
      <form className="task-form" onSubmit={onSubmit}>
        <label>
          이름
          <input
            value={editForm.name}
            onChange={(event) =>
              onChange({
                ...editForm,
                name: event.target.value,
              })
            }
          />
        </label>
        <TaskTypeConfigFields form={editForm} onChange={onChange} />
        <ScheduleFields form={editForm} onChange={onChange} />
        <PolicyFields
          currentDevice={currentDevice}
          form={editForm}
          onChange={onChange}
          secrets={secrets}
        />
        <div className="form-actions">
          <button type="submit">저장</button>
        </div>
      </form>
    </>
  )
}

type DetailItemProps = {
  label: string
  value: string
}

function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function parseInitialUrls(value: string): string[] {
  return parseLines(value)
}

function parseLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function parseDaysOfWeek(value: string): TaskSchedule['daysOfWeek'] {
  const days = value
    .split(/[,\r\n]+/)
    .map((item) => Number(item.trim()))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)

  return days.length > 0
    ? ([...new Set(days)] as TaskSchedule['daysOfWeek'])
    : undefined
}

function createTaskConfigFromForm(
  form: BrowserTaskFormState,
  existingTask?: TaskTemplate,
):
  | BrowserTabGroupConfig
  | CrawlerConfig
  | DiscordBotConfig
  | NotionSyncConfig
  | TradingBotConfig {
  switch (form.taskType) {
    case 'browser_tab_group': {
      const currentConfig =
        existingTask?.type === 'browser_tab_group'
          ? normalizeBrowserTabGroupConfig(
              existingTask.config as Partial<BrowserTabGroupConfig>,
            )
          : createDefaultBrowserTabGroupConfig(`browser-${crypto.randomUUID()}`)
      return {
        ...currentConfig,
        browserKind: form.browserKind,
        runMode: form.runMode,
        profileSource: form.profileSource,
        existingProfilePath: form.existingProfilePath.trim() || undefined,
        initialUrls: parseInitialUrls(form.initialUrls),
        dynamicTemplateUpdates: form.dynamicTemplateUpdates,
      }
    }
    case 'crawler':
      return {
        urls: parseInitialUrls(form.crawlerUrls),
        maxBytes: normalizeCrawlerMaxBytes(form.crawlerMaxBytes),
      }
    case 'discord_bot':
      return {
        dryRun: true,
        commandPrefix: form.discordCommandPrefix.trim() || undefined,
      }
    case 'notion_sync':
      return {
        dryRun: true,
        databaseId: form.notionDatabaseId.trim() || undefined,
      }
    case 'trading_bot':
      return {
        dryRun: true,
        exchange: form.tradingExchange.trim() || undefined,
        symbol: form.tradingSymbol.trim() || undefined,
      }
  }
}

function normalizeCrawlerConfig(config: unknown): CrawlerConfig {
  const candidate = config as Partial<CrawlerConfig>
  return {
    urls: Array.isArray(candidate?.urls)
      ? candidate.urls
          .map((url) => (typeof url === 'string' ? url.trim() : ''))
          .filter(Boolean)
      : [],
    maxBytes: normalizeCrawlerMaxBytes(candidate?.maxBytes),
  }
}

function normalizeCrawlerMaxBytes(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(Math.max(Math.round(value), 1024), 500000)
    : 50000
}

function createDevicePolicyFromForm(
  form: BrowserTaskFormState,
  currentDevice: CurrentDevice,
): DevicePolicy {
  const allowedDeviceIds = parseLines(form.allowedDeviceIds)
  const secretRefs = parseLines(form.secretRefIds).map(
    (secretId): SecretRef => ({
      id: secretId,
      scope: 'local_device',
    }),
  )
  const shouldUseCurrentDevice =
    allowedDeviceIds.length === 0 &&
    (form.visibility === 'local_only' || form.execution === 'local_only') &&
    currentDevice.id

  return normalizeDevicePolicy({
    visibility: form.visibility,
    execution: form.execution,
    allowedDeviceIds: shouldUseCurrentDevice
      ? [currentDevice.id]
      : allowedDeviceIds,
    secretRefs,
  })
}

function createTaskScheduleFromForm(
  form: BrowserTaskFormState,
): TaskSchedule | undefined {
  if (!form.scheduleEnabled) {
    return undefined
  }

  const intervalMinutes = Math.min(
    Math.max(Math.round(form.scheduleIntervalMinutes), 1),
    10080,
  )
  const scheduleMode = form.scheduleMode

  return {
    enabled: true,
    mode: scheduleMode,
    intervalMinutes,
    timeOfDay:
      scheduleMode === 'daily' || scheduleMode === 'weekly'
        ? form.scheduleTimeOfDay
        : undefined,
    daysOfWeek:
      scheduleMode === 'weekly'
        ? parseDaysOfWeek(form.scheduleDaysOfWeek)
        : undefined,
    nextRunAt: getInitialScheduleRunAt({
      enabled: true,
      mode: scheduleMode,
      intervalMinutes,
      timeOfDay: form.scheduleTimeOfDay,
      daysOfWeek: parseDaysOfWeek(form.scheduleDaysOfWeek),
    }),
  }
}

type ScheduleFieldsProps = {
  form: BrowserTaskFormState
  onChange(value: BrowserTaskFormState): void
}

function TaskTypeConfigFields({ form, onChange }: ScheduleFieldsProps) {
  switch (form.taskType) {
    case 'browser_tab_group':
      return <BrowserConfigFields form={form} onChange={onChange} />
    case 'crawler':
      return <CrawlerConfigFields form={form} onChange={onChange} />
    case 'discord_bot':
      return <DiscordBotConfigFields form={form} onChange={onChange} />
    case 'notion_sync':
      return <NotionSyncConfigFields form={form} onChange={onChange} />
    case 'trading_bot':
      return <TradingBotConfigFields form={form} onChange={onChange} />
  }
}

function BrowserConfigFields({ form, onChange }: ScheduleFieldsProps) {
  return (
    <>
      <div className="form-grid">
        <label>
          브라우저
          <select
            value={form.browserKind}
            onChange={(event) =>
              onChange({
                ...form,
                browserKind: event.target.value as BrowserKind,
              })
            }
          >
            <option value="chrome">Chrome</option>
            <option value="edge">Edge</option>
            <option value="chromium">Chromium</option>
          </select>
        </label>
        <label>
          실행 방식
          <select
            value={form.runMode}
            onChange={(event) =>
              onChange({
                ...form,
                runMode: event.target.value as BrowserRunMode,
              })
            }
          >
            <option value="dedicated_profile">전용 프로필</option>
            <option value="extension_controlled">확장 프로그램 제어</option>
            <option value="default_browser_deeplink">기본 브라우저 연결</option>
          </select>
        </label>
        {form.runMode === 'extension_controlled' ? (
          <label>
            프로필 소스
            <select
              value={form.profileSource}
              onChange={(event) =>
                onChange({
                  ...form,
                  profileSource: event.target.value as BrowserProfileSource,
                })
              }
            >
              <option value="task_profile">작업 전용 프로필</option>
              <option value="existing_profile">기존 브라우저 프로필</option>
            </select>
          </label>
        ) : null}
      </div>
      {form.runMode === 'extension_controlled' &&
      form.profileSource === 'existing_profile' ? (
        <label>
          기존 프로필 경로
          <input
            value={form.existingProfilePath}
            onChange={(event) =>
              onChange({
                ...form,
                existingProfilePath: event.target.value,
              })
            }
          />
        </label>
      ) : null}
      <label>
        초기 URL
        <textarea
          value={form.initialUrls}
          onChange={(event) =>
            onChange({
              ...form,
              initialUrls: event.target.value,
            })
          }
          placeholder="한 줄에 하나씩 입력"
          rows={5}
        />
      </label>
      <label className="inline-check">
        <input
          checked={form.dynamicTemplateUpdates}
          type="checkbox"
          onChange={(event) =>
            onChange({
              ...form,
              dynamicTemplateUpdates: event.target.checked,
            })
          }
        />
        실행 후 열린 탭 URL을 템플릿에 반영
      </label>
    </>
  )
}

function CrawlerConfigFields({ form, onChange }: ScheduleFieldsProps) {
  return (
    <>
      <label>
        수집 URL
        <textarea
          value={form.crawlerUrls}
          onChange={(event) =>
            onChange({
              ...form,
              crawlerUrls: event.target.value,
            })
          }
          placeholder="한 줄에 하나씩 입력"
          rows={5}
        />
      </label>
      <label>
        URL당 최대 bytes
        <input
          max={500000}
          min={1024}
          type="number"
          value={form.crawlerMaxBytes}
          onChange={(event) =>
            onChange({
              ...form,
              crawlerMaxBytes: Number(event.target.value),
            })
          }
        />
      </label>
    </>
  )
}

function DiscordBotConfigFields({ form, onChange }: ScheduleFieldsProps) {
  return (
    <label>
      명령 prefix
      <input
        value={form.discordCommandPrefix}
        onChange={(event) =>
          onChange({
            ...form,
            discordCommandPrefix: event.target.value,
          })
        }
      />
    </label>
  )
}

function NotionSyncConfigFields({ form, onChange }: ScheduleFieldsProps) {
  return (
    <label>
      Database ID
      <input
        value={form.notionDatabaseId}
        onChange={(event) =>
          onChange({
            ...form,
            notionDatabaseId: event.target.value,
          })
        }
      />
    </label>
  )
}

function TradingBotConfigFields({ form, onChange }: ScheduleFieldsProps) {
  return (
    <fieldset className="settings-fieldset">
      <legend>자동매매 skeleton</legend>
      <p className="muted-text">실제 주문 실행 없이 dry-run 뼈대만 저장합니다.</p>
      <div className="form-grid">
        <label>
          Exchange
          <input
            value={form.tradingExchange}
            onChange={(event) =>
              onChange({
                ...form,
                tradingExchange: event.target.value,
              })
            }
          />
        </label>
        <label>
          Symbol
          <input
            value={form.tradingSymbol}
            onChange={(event) =>
              onChange({
                ...form,
                tradingSymbol: event.target.value,
              })
            }
          />
        </label>
      </div>
    </fieldset>
  )
}

function ScheduleFields({ form, onChange }: ScheduleFieldsProps) {
  return (
    <fieldset className="settings-fieldset">
      <legend>예약 실행</legend>
      <label className="inline-check">
        <input
          checked={form.scheduleEnabled}
          type="checkbox"
          onChange={(event) =>
            onChange({
              ...form,
              scheduleEnabled: event.target.checked,
            })
          }
        />
        주기적으로 실행
      </label>
      <label>
        예약 방식
        <select
          value={form.scheduleMode}
          onChange={(event) =>
            onChange({
              ...form,
              scheduleMode: event.target.value as TaskScheduleMode,
            })
          }
        >
          <option value="interval">간격</option>
          <option value="daily">매일</option>
          <option value="weekly">매주</option>
        </select>
      </label>
      {form.scheduleMode === 'interval' ? (
        <label>
          실행 간격(분)
          <input
            max={10080}
            min={1}
            type="number"
            value={form.scheduleIntervalMinutes}
            onChange={(event) =>
              onChange({
                ...form,
                scheduleIntervalMinutes: Number(event.target.value),
              })
            }
          />
        </label>
      ) : null}
      {form.scheduleMode === 'daily' || form.scheduleMode === 'weekly' ? (
        <label>
          실행 시각
          <input
            type="time"
            value={form.scheduleTimeOfDay}
            onChange={(event) =>
              onChange({
                ...form,
                scheduleTimeOfDay: event.target.value,
              })
            }
          />
        </label>
      ) : null}
      {form.scheduleMode === 'weekly' ? (
        <label>
          실행 요일
          <textarea
            value={form.scheduleDaysOfWeek}
            onChange={(event) =>
              onChange({
                ...form,
                scheduleDaysOfWeek: event.target.value,
              })
            }
            placeholder="0=일, 1=월 ... 6=토"
            rows={3}
          />
        </label>
      ) : null}
    </fieldset>
  )
}

function isSettingsDirty(form: AppSettings, settings: AppSettings): boolean {
  return (
    form.themeMode !== settings.themeMode ||
    form.defaultBrowserKind !== settings.defaultBrowserKind ||
    form.defaultTaskName.trim() !== settings.defaultTaskName ||
    form.defaultActionName.trim() !== settings.defaultActionName ||
    form.defaultWorkflowName.trim() !== settings.defaultWorkflowName ||
    form.initialUrlInputMode !== settings.initialUrlInputMode ||
    form.taskListDisplayMode !== settings.taskListDisplayMode ||
    form.workflowGridColumnCount !== settings.workflowGridColumnCount ||
    form.taskRunEventRetentionLimit !== settings.taskRunEventRetentionLimit ||
    form.taskRunEventExportLimit !== settings.taskRunEventExportLimit ||
    normalizeSettingsPath(form.browserExecutablePaths.chrome) !==
      normalizeSettingsPath(settings.browserExecutablePaths.chrome) ||
    normalizeSettingsPath(form.browserExecutablePaths.edge) !==
      normalizeSettingsPath(settings.browserExecutablePaths.edge) ||
    normalizeSettingsPath(form.browserExecutablePaths.chromium) !==
      normalizeSettingsPath(settings.browserExecutablePaths.chromium) ||
    JSON.stringify(normalizeLinkedDeviceList(form.linkedDevices)) !==
      JSON.stringify(normalizeLinkedDeviceList(settings.linkedDevices))
  )
}

type LinkedDeviceEditorProps = {
  device: LinkedDevice
  onChange(device: LinkedDevice): void
  onRemove(): void
}

function LinkedDeviceEditor({
  device,
  onChange,
  onRemove,
}: LinkedDeviceEditorProps) {
  return (
    <div className="linked-device-row">
      <label>
        기기 이름
        <input
          value={device.name}
          onChange={(event) =>
            onChange({
              ...device,
              name: event.target.value,
            })
          }
        />
      </label>
      <label>
        기기 ID
        <input
          value={device.id}
          onChange={(event) =>
            onChange({
              ...device,
              id: event.target.value,
            })
          }
        />
      </label>
      <label>
        허용 수준
        <select
          value={device.accessLevel}
          onChange={(event) =>
            onChange({
              ...device,
              accessLevel: event.target.value as DeviceAccessLevel,
            })
          }
        >
          {(['blocked', 'visible', 'executable', 'trusted'] as const).map(
            (accessLevel) => (
              <option key={accessLevel} value={accessLevel}>
                {getDeviceAccessLevelLabel(accessLevel)}
              </option>
            ),
          )}
        </select>
      </label>
      <button className="danger-button" type="button" onClick={onRemove}>
        제거
      </button>
    </div>
  )
}

type PolicyFieldsProps = {
  currentDevice: CurrentDevice
  form: BrowserTaskFormState
  secrets: LocalSecretMetadata[]
  onChange(value: BrowserTaskFormState): void
}

function PolicyFields({
  currentDevice,
  form,
  onChange,
  secrets,
}: PolicyFieldsProps) {
  return (
    <fieldset className="settings-fieldset">
      <legend>작업 정책</legend>
      <div className="form-grid">
        <label>
          표시 정책
          <select
            value={form.visibility}
            onChange={(event) =>
              onChange({
                ...form,
                visibility: event.target.value as DeviceVisibilityPolicy,
              })
            }
          >
            {(
              [
                'all_devices',
                'trusted_devices',
                'specific_devices',
                'local_only',
              ] as const
            ).map((visibility) => (
              <option key={visibility} value={visibility}>
                {getDeviceVisibilityPolicyLabel(visibility)}
              </option>
            ))}
          </select>
        </label>
        <label>
          실행 정책
          <select
            value={form.execution}
            onChange={(event) =>
              onChange({
                ...form,
                execution: event.target.value as DeviceExecutionPolicy,
              })
            }
          >
            {(
              ['anywhere', 'trusted_only', 'specific_devices', 'local_only'] as const
            ).map((execution) => (
              <option key={execution} value={execution}>
                {getDeviceExecutionPolicyLabel(execution)}
              </option>
            ))}
          </select>
        </label>
        <label>
          현재 기기 ID
          <input value={currentDevice.id || '아직 없음'} readOnly />
        </label>
      </div>
      <label>
        허용 기기 ID
        <textarea
          value={form.allowedDeviceIds}
          onChange={(event) =>
            onChange({
              ...form,
              allowedDeviceIds: event.target.value,
            })
          }
          placeholder="한 줄에 하나씩 입력"
          rows={3}
        />
      </label>
      <label>
        Secret 참조
        <select
          multiple
          value={parseLines(form.secretRefIds)}
          onChange={(event) =>
            onChange({
              ...form,
              secretRefIds: Array.from(event.target.selectedOptions)
                .map((option) => option.value)
                .join('\n'),
            })
          }
        >
          {secrets.map((secret) => (
            <option key={secret.id} value={secret.id}>
              {secret.name}
            </option>
          ))}
        </select>
      </label>
    </fieldset>
  )
}

type TaskRunEventsPanelProps = {
  events: TaskRunEvent[]
}

function TaskRunEventsPanel({ events }: TaskRunEventsPanelProps) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskRunEventStatus | 'all'>(
    'all',
  )
  const filteredEvents = events.filter((event) => {
    const matchesStatus =
      statusFilter === 'all' || event.status === statusFilter
    const normalizedQuery = query.trim().toLowerCase()
    const matchesQuery =
      !normalizedQuery ||
      (event.message ?? '').toLowerCase().includes(normalizedQuery) ||
      event.deviceId.toLowerCase().includes(normalizedQuery)

    return matchesStatus && matchesQuery
  })

  return (
    <section className="run-events" aria-label="최근 실행 이벤트">
      <h3>최근 실행 이벤트</h3>
      <div className="run-event-filters">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="이벤트 검색"
        />
        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as TaskRunEventStatus | 'all')
          }
        >
          <option value="all">전체 상태</option>
          <option value="running">실행 중</option>
          <option value="idle">대기</option>
          <option value="failed">실패</option>
        </select>
      </div>
      {filteredEvents.length === 0 ? (
        <p className="muted-text">아직 실행 이벤트가 없습니다.</p>
      ) : (
        <div className="run-event-list">
          {filteredEvents.slice(0, 8).map((event) => (
            <div className="run-event-row" key={event.id}>
              <span className={`status-pill status-${event.status}`}>
                {getTaskStatusLabel(event.status)}
              </span>
              <div>
                <strong>{event.message ?? '상태 변경'}</strong>
                <small>{formatDate(event.createdAt)}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function normalizeSettingsPath(value: string | undefined): string {
  return value?.trim() ?? ''
}

function createEmptyLinkedDevice(): LinkedDevice {
  return {
    id: '',
    name: '',
    accessLevel: 'visible',
  }
}

function normalizeLinkedDeviceList(devices: LinkedDevice[]): LinkedDevice[] {
  return devices.map((device) => ({
    id: device.id.trim(),
    name: device.name.trim(),
    accessLevel: device.accessLevel,
  }))
}

function filterTasks(
  tasks: TaskTemplate[],
  category: NavigationCategory,
): TaskTemplate[] {
  switch (category) {
    case 'running':
      return tasks.filter((task) => task.state.status === 'running')
    case 'scheduled':
      return tasks.filter((task) => task.schedule?.enabled)
    case 'failed':
      return tasks.filter((task) => task.state.status === 'failed')
    case 'restricted':
      return tasks.filter((task) => isRestrictedDevicePolicy(task.permissions))
    case 'secret_required':
      return tasks.filter((task) => (task.permissions.secretRefs?.length ?? 0) > 0)
    case 'all':
      return tasks
  }
}

function getTaskTypeLabel(taskType: TaskType): string {
  switch (taskType) {
    case 'browser_tab_group':
      return '브라우저 탭 그룹'
    case 'discord_bot':
      return 'Discord bot'
    case 'crawler':
      return 'Crawler'
    case 'notion_sync':
      return 'Notion sync'
    case 'trading_bot':
      return 'Trading bot'
  }
}

function getActionTypeLabel(actionType: ActionDefinition['type']): string {
  switch (actionType) {
    case 'browser_action':
      return 'Browser Action'
    case 'crawler_action':
      return 'Crawler Action'
    case 'discord_dry_run_action':
      return 'Discord dry-run'
    case 'notion_dry_run_action':
      return 'Notion dry-run'
    case 'trading_dry_run_action':
      return 'Trading dry-run'
    case 'tool_action':
      return 'Tool Action'
  }
}

function getTaskConfigSummary(task: TaskTemplate): string {
  switch (task.type) {
    case 'browser_tab_group': {
      const config = normalizeBrowserTabGroupConfig(
        task.config as Partial<BrowserTabGroupConfig>,
      )
      return `${getBrowserKindLabel(config.browserKind)} · ${getBrowserRunModeLabel(
        config.runMode,
      )} · URL ${config.initialUrls.length}개`
    }
    case 'crawler': {
      const config = normalizeCrawlerConfig(task.config)
      return `URL ${config.urls.length}개 · 최대 ${config.maxBytes} bytes`
    }
    case 'discord_bot': {
      const config = task.config as Partial<DiscordBotConfig>
      return `dry-run · prefix ${config.commandPrefix ?? '!'}`
    }
    case 'notion_sync': {
      const config = task.config as Partial<NotionSyncConfig>
      return `dry-run · database ${config.databaseId || '미지정'}`
    }
    case 'trading_bot': {
      const config = task.config as Partial<TradingBotConfig>
      return `skeleton dry-run · 실제 주문 없음 · ${config.exchange || 'exchange 미지정'} / ${
        config.symbol || 'symbol 미지정'
      }`
    }
  }
}

function getSyncModeLabel(mode: SyncStatus['mode']): string {
  switch (mode) {
    case 'mock_file':
      return '로컬 mock 파일'
  }
}

function createToolInputDefaults(
  tool: RegisteredToolModule,
): Record<string, unknown> {
  return tool.manifest.inputs.reduce<Record<string, unknown>>(
    (defaults, field) => ({
      ...defaults,
      [field.key]: getToolFieldDefaultValue(field),
    }),
    {},
  )
}

function getToolFieldDefaultValue(field: ToolModuleField): unknown {
  if (field.default !== undefined) {
    return field.type === 'json'
      ? JSON.stringify(field.default, null, 2)
      : field.default
  }

  if (
    (field.ui?.control === 'select' || field.ui?.control === 'radio') &&
    field.ui.options?.[0]
  ) {
    return field.ui.options[0].value
  }

  switch (field.type) {
    case 'boolean':
      return false
    case 'json':
      return '{}'
    case 'number':
      return ''
    case 'number[]':
    case 'string[]':
      return ''
    case 'file':
    case 'string':
      return ''
  }
}

function getNavigationCategoryLabel(category: NavigationCategory): string {
  switch (category) {
    case 'all':
      return 'All templates'
    case 'running':
      return 'Running'
    case 'scheduled':
      return 'Scheduled'
    case 'failed':
      return 'Failed'
    case 'restricted':
      return 'Restricted'
    case 'secret_required':
      return 'Secret required'
  }
}

function getThemeModeLabel(themeMode: ThemeMode): string {
  switch (themeMode) {
    case 'system':
      return '시스템'
    case 'light':
      return '라이트'
    case 'dark':
      return '다크'
  }
}

function getWorkspaceModeLabel(workspaceMode: WorkspaceMode): string {
  switch (workspaceMode) {
    case 'run':
      return '실행'
    case 'actions':
      return 'Action'
    case 'workflows':
      return 'Workflow'
    case 'tools':
      return '도구'
    case 'settings':
      return '설정'
  }
}

function getTaskStatusLabel(status: TaskState['status']): string {
  switch (status) {
    case 'idle':
      return '대기'
    case 'running':
      return '실행 중'
    case 'failed':
      return '실패'
  }
}

function getBrowserKindLabel(browserKind: BrowserKind): string {
  switch (browserKind) {
    case 'chrome':
      return 'Chrome'
    case 'edge':
      return 'Edge'
    case 'chromium':
      return 'Chromium'
  }
}

function getBrowserProfileSourceLabel(
  profileSource: BrowserProfileSource,
): string {
  switch (profileSource) {
    case 'task_profile':
      return '작업 전용 프로필'
    case 'existing_profile':
      return '기존 브라우저 프로필'
  }
}

function getTabGroupSnapshotLabel(config: BrowserTabGroupConfig): string {
  if (!config.tabGroupSnapshot) {
    return '아직 없음'
  }

  return `${config.tabGroupSnapshot.groups.length}개 그룹, ${
    config.tabGroupSnapshot.tabs.length
  }개 탭 · ${formatDate(config.tabGroupSnapshot.capturedAt)}`
}

function getTaskScheduleLabel(schedule?: TaskSchedule): string {
  if (!schedule?.enabled) {
    return '사용 안 함'
  }

  switch (schedule.mode) {
    case 'daily':
      return `매일 ${schedule.timeOfDay ?? '09:00'} · 다음 실행 ${formatDate(
        schedule.nextRunAt,
      )}`
    case 'weekly':
      return `매주 ${formatDaysOfWeek(
        schedule.daysOfWeek,
      )} ${schedule.timeOfDay ?? '09:00'} · 다음 실행 ${formatDate(
        schedule.nextRunAt,
      )}`
    case 'interval':
      return `${schedule.intervalMinutes}분마다 · 다음 실행 ${formatDate(
        schedule.nextRunAt,
      )}`
  }
}

function getInitialScheduleRunAt(schedule: TaskSchedule): string {
  const now = new Date()

  switch (schedule.mode) {
    case 'daily':
      return getNextWallClockRunAt(now, schedule.timeOfDay, [
        0, 1, 2, 3, 4, 5, 6,
      ])
    case 'weekly':
      return getNextWallClockRunAt(now, schedule.timeOfDay, schedule.daysOfWeek)
    case 'interval':
      return new Date(
        now.getTime() + schedule.intervalMinutes * 60_000,
      ).toISOString()
  }
}

function getNextWallClockRunAt(
  date: Date,
  timeOfDay = '09:00',
  daysOfWeek: number[] | undefined,
): string {
  const allowedDays =
    daysOfWeek && daysOfWeek.length > 0
      ? new Set(daysOfWeek)
      : new Set([date.getDay()])
  const [hour, minute] = timeOfDay.split(':').map(Number)

  for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
    const candidate = new Date(date)
    candidate.setDate(date.getDate() + dayOffset)
    candidate.setHours(hour, minute, 0, 0)

    if (candidate <= date || !allowedDays.has(candidate.getDay())) {
      continue
    }

    return candidate.toISOString()
  }

  return new Date(date.getTime() + 24 * 60 * 60_000).toISOString()
}

function formatDaysOfWeek(daysOfWeek: TaskSchedule['daysOfWeek']): string {
  const labels = ['일', '월', '화', '수', '목', '금', '토']
  return daysOfWeek?.map((day) => labels[day]).join(', ') || '요일 미지정'
}

function formatDate(value?: string): string {
  if (!value) {
    return '아직 없음'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return '알 수 없는 오류가 발생했습니다.'
}

export default App
