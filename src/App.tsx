import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  getDeviceAccessLevelLabel,
  type CurrentDevice,
  type DeviceAccessLevel,
  type LinkedDevice,
} from './shared/devices'
import {
  defaultAppSettings,
  type AppSettings,
  type TaskListDisplayMode,
  type ThemeMode,
} from './shared/settings'
import {
  createDefaultBrowserTabGroupConfig,
  getDeviceExecutionPolicyLabel,
  getDeviceVisibilityPolicyLabel,
  getBrowserRunModeLabel,
  isRestrictedDevicePolicy,
  normalizeDevicePolicy,
  normalizeBrowserTabGroupConfig,
  type BrowserKind,
  type BrowserRunMode,
  type BrowserTabGroupConfig,
  type BrowserTabGroupTask,
  type DeviceExecutionPolicy,
  type DevicePolicy,
  type DeviceVisibilityPolicy,
  type SecretRef,
  type TaskState,
  type TaskTemplate,
} from './shared/tasks'
import type { LocalSecretMetadata } from './shared/secrets'
import type { SecretStorageStatus } from './shared/secrets'
import type { SyncImportResult, SyncStatus } from './shared/sync'
import type { TaskRunEvent, TaskRunEventStatus } from './shared/taskRunEvents'
import type { CreateBrowserTabGroupTaskInput } from './renderer/api/tasksApi'
import './App.css'

type BrowserTaskFormState = {
  name: string
  browserKind: BrowserKind
  runMode: BrowserRunMode
  initialUrls: string
  dynamicTemplateUpdates: boolean
  visibility: DeviceVisibilityPolicy
  execution: DeviceExecutionPolicy
  allowedDeviceIds: string
  secretRefIds: string
}

type SecretFormState = {
  name: string
  value: string
  description: string
}

const defaultCreateForm = createBrowserTaskForm(defaultAppSettings)

type SettingsSaveState = 'saved' | 'failed' | null

type WorkspaceMode = 'run' | 'create' | 'edit' | 'tools' | 'settings'
type NavigationCategory =
  | 'all'
  | 'running'
  | 'folders'
  | 'favorites'
  | 'restricted'
type SettingsCategory = 'general' | 'devices' | 'secrets'

const defaultSettingsForm: AppSettings = {
  ...defaultAppSettings,
}

function createBrowserTaskForm(settings: AppSettings): BrowserTaskFormState {
  return {
    name: settings.defaultTaskName,
    browserKind: settings.defaultBrowserKind,
    runMode: 'dedicated_profile',
    initialUrls: '',
    dynamicTemplateUpdates: false,
    visibility: 'local_only',
    execution: 'local_only',
    allowedDeviceIds: '',
    secretRefIds: '',
  }
}

const initialSettingsSnapshot = {
  settings: defaultAppSettings,
  userDataPath: '',
  currentDevice: {
    id: '',
    name: '',
  },
}

const defaultEditForm: BrowserTaskFormState = {
  name: defaultAppSettings.defaultTaskName,
  browserKind: defaultAppSettings.defaultBrowserKind,
  runMode: 'dedicated_profile',
  initialUrls: '',
  dynamicTemplateUpdates: false,
  visibility: 'local_only',
  execution: 'local_only',
  allowedDeviceIds: '',
  secretRefIds: '',
}

const defaultSecretForm: SecretFormState = {
  name: '',
  value: '',
  description: '',
}

const defaultSecretStorageStatus: SecretStorageStatus = {
  encryptionAvailable: false,
  backend: 'unknown',
  message: 'Secret 암호화 상태를 아직 불러오지 못했습니다.',
}

const defaultSyncStatus: SyncStatus = {
  exportPath: '',
}

function App() {
  const [tasks, setTasks] = useState<TaskTemplate[]>([])
  const [taskRunEvents, setTaskRunEvents] = useState<TaskRunEvent[]>([])
  const [secrets, setSecrets] = useState<LocalSecretMetadata[]>([])
  const [secretStorageStatus, setSecretStorageStatus] =
    useState<SecretStorageStatus>(defaultSecretStorageStatus)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(defaultSyncStatus)
  const [syncResult, setSyncResult] = useState<SyncImportResult | null>(null)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
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
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [settingsSaveState, setSettingsSaveState] =
    useState<SettingsSaveState>(null)
  const [settingsErrorMessage, setSettingsErrorMessage] = useState<
    string | null
  >(null)
  const [secretForm, setSecretForm] =
    useState<SecretFormState>(defaultSecretForm)

  const browserTasks = useMemo(
    () =>
      tasks.filter(
        (task): task is BrowserTabGroupTask => task.type === 'browser_tab_group',
      ),
    [tasks],
  )

  const selectedTask = useMemo(
    () => browserTasks.find((task) => task.id === selectedTaskId) ?? null,
    [browserTasks, selectedTaskId],
  )

  const visibleBrowserTasks = useMemo(
    () => filterBrowserTasks(browserTasks, selectedCategory),
    [browserTasks, selectedCategory],
  )

  useEffect(() => {
    void loadAppSettings()
    void loadSecrets()
    void loadSecretStorageStatus()
    void loadSyncStatus()
    void loadTasks()
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

    if (browserTasks.length === 0) {
      setSelectedTaskId(null)
      setConfirmDeleteTaskId(null)
      if (workspaceMode === 'edit') {
        setWorkspaceMode('run')
      }
      return
    }

    if (!selectedTaskId || !browserTasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(browserTasks[0].id)
    }
  }, [browserTasks, isLoading, selectedTaskId, workspaceMode])

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

    const profileId = `browser-${crypto.randomUUID()}`
    const config = {
      ...createDefaultBrowserTabGroupConfig(profileId),
      browserKind: createForm.browserKind,
      runMode: createForm.runMode,
      initialUrls: parseInitialUrls(createForm.initialUrls),
      dynamicTemplateUpdates: createForm.dynamicTemplateUpdates,
    }
    const input: CreateBrowserTabGroupTaskInput = {
      name: trimmedName,
      type: 'browser_tab_group',
      config,
      permissions: createDevicePolicyFromForm(createForm, currentDevice),
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

  function openCreateMode() {
    setCreateForm(createBrowserTaskForm(appSettings))
    setWorkspaceMode('create')
    setConfirmDeleteTaskId(null)
  }

  function openEditMode() {
    if (selectedTask) {
      startEditing(selectedTask)
    }
    setWorkspaceMode('edit')
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

  function startEditing(task: BrowserTabGroupTask) {
    const config = normalizeBrowserTabGroupConfig(task.config)
    const permissions = normalizeDevicePolicy(task.permissions)
    setConfirmDeleteTaskId(null)
    setEditForm({
      name: task.name,
      browserKind: config.browserKind,
      runMode: config.runMode,
      initialUrls: config.initialUrls.join('\n'),
      dynamicTemplateUpdates: config.dynamicTemplateUpdates,
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

  async function handleUpdateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedTask || !window.pastelFlow) {
      return
    }

    const trimmedName = editForm.name.trim()
    if (!trimmedName) {
      return
    }

    const currentConfig = normalizeBrowserTabGroupConfig(selectedTask.config)
    const config: BrowserTabGroupConfig = {
      ...currentConfig,
      browserKind: editForm.browserKind,
      runMode: editForm.runMode,
      initialUrls: parseInitialUrls(editForm.initialUrls),
      dynamicTemplateUpdates: editForm.dynamicTemplateUpdates,
    }

    try {
      setErrorMessage(null)
      const updatedTask = await window.pastelFlow.tasks.update(selectedTask.id, {
        name: trimmedName,
        config,
        permissions: createDevicePolicyFromForm(editForm, currentDevice),
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

    const nextTask = browserTasks.find((task) => task.id !== taskId) ?? null

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

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>Pastel Flow</h1>
          <p>{getWorkspaceModeLabel(workspaceMode)}</p>
        </div>
        <TopModeBar
          currentMode={workspaceMode}
          onCreate={openCreateMode}
          onEdit={openEditMode}
          onRun={openRunMode}
          onSettings={openSettingsMode}
          onTools={openToolsMode}
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
            browserTasks={browserTasks}
            currentMode={workspaceMode}
            selectedCategory={selectedCategory}
            selectedSettingsCategory={selectedSettingsCategory}
            selectedTask={selectedTask}
            onCategorySelect={openCategory}
            onClose={() => setIsSidebarOpen(false)}
            onSelectSettingsCategory={setSelectedSettingsCategory}
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
              browserTasks={visibleBrowserTasks}
              categoryLabel={getNavigationCategoryLabel(selectedCategory)}
              displayMode={appSettings.taskListDisplayMode}
              isLoading={isLoading}
              runningTaskId={runningTaskId}
              selectedTaskId={selectedTaskId}
              onCreate={openCreateMode}
              onDisplayModeChange={handleTaskListDisplayModeChange}
              onRun={handleRunTask}
              onSelect={(task) => {
                setSelectedTaskId(task.id)
                setConfirmDeleteTaskId(null)
                startEditing(task)
              }}
            />
          ) : null}

          {workspaceMode === 'create' ? (
            <CreateTaskPanel
              createForm={createForm}
              currentDevice={currentDevice}
              secrets={secrets}
              onCancel={openRunMode}
              onChange={setCreateForm}
              onSubmit={handleCreateTask}
            />
          ) : null}

          {workspaceMode === 'edit' ? (
            <EditWorkspace
              confirmDeleteTaskId={confirmDeleteTaskId}
              currentDevice={currentDevice}
              editForm={editForm}
              isLoading={isLoading}
              secrets={secrets}
              onChange={setEditForm}
              onConfirmDelete={handleDeleteTask}
              onDeleteRequest={setConfirmDeleteTaskId}
              onSubmit={handleUpdateTask}
              selectedTask={selectedTask}
              taskRunEvents={taskRunEvents}
            />
          ) : null}

          {workspaceMode === 'tools' ? (
            <ToolsPanel
              syncMessage={syncMessage}
              syncResult={syncResult}
              syncStatus={syncStatus}
              onExportSyncSnapshot={handleExportSyncSnapshot}
              onImportSyncSnapshot={handleImportSyncSnapshot}
            />
          ) : null}

          {workspaceMode === 'settings' ? (
            <section className="mode-panel" aria-label="앱 설정">
              <AppSettingsPanel
                form={settingsForm}
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
  onCreate(): void
  onEdit(): void
  onRun(): void
  onSettings(): void
  onTools(): void
}

function TopModeBar({
  currentMode,
  onCreate,
  onEdit,
  onRun,
  onSettings,
  onTools,
}: TopModeBarProps) {
  const modes: {
    id: WorkspaceMode
    icon: string
    label: string
    onClick(): void
  }[] = [
    { id: 'run', icon: '▶', label: '실행', onClick: onRun },
    { id: 'create', icon: '+', label: '새 작업', onClick: onCreate },
    { id: 'edit', icon: '✎', label: '수정', onClick: onEdit },
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
  browserTasks: BrowserTabGroupTask[]
  currentMode: WorkspaceMode
  selectedCategory: NavigationCategory
  selectedSettingsCategory: SettingsCategory
  selectedTask: BrowserTabGroupTask | null
  onCategorySelect(category: NavigationCategory): void
  onClose(): void
  onSelectSettingsCategory(category: SettingsCategory): void
  onSelectTask(task: BrowserTabGroupTask): void
}

function WorkspaceSidebar({
  browserTasks,
  currentMode,
  selectedCategory,
  selectedSettingsCategory,
  selectedTask,
  onCategorySelect,
  onClose,
  onSelectSettingsCategory,
  onSelectTask,
}: WorkspaceSidebarProps) {
  const restrictedCount = browserTasks.filter((task) =>
    isRestrictedDevicePolicy(task.permissions),
  ).length
  const runningCount = browserTasks.filter(
    (task) => task.state.status === 'running',
  ).length
  const runCategories: {
    id: NavigationCategory
    icon: string
    label: string
    count: number
  }[] = [
    { id: 'all', icon: '□', label: '전체', count: browserTasks.length },
    { id: 'running', icon: '●', label: '실행 중', count: runningCount },
    { id: 'folders', icon: '▣', label: '폴더', count: browserTasks.length },
    { id: 'favorites', icon: '☆', label: '즐겨찾기', count: 0 },
    { id: 'restricted', icon: '◇', label: '제한됨', count: restrictedCount },
  ]
  const settingsCategories: {
    id: SettingsCategory
    icon: string
    label: string
  }[] = [
    { id: 'general', icon: '◌', label: '일반' },
    { id: 'devices', icon: '▣', label: '기기' },
    { id: 'secrets', icon: '◆', label: 'Secret' },
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

        {currentMode === 'create' ? (
          <div className="sidebar-empty">
            <strong>브라우저 작업</strong>
            <span>전용 프로필 템플릿을 만듭니다.</span>
          </div>
        ) : null}

        {currentMode === 'edit'
          ? browserTasks.map((task) => (
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
                <em>{getTaskStatusLabel(task.state.status)}</em>
              </button>
            ))
          : null}

        {currentMode === 'tools' ? (
          <div className="sidebar-empty">
            <strong>도구 페이지</strong>
            <span>포함 범위는 추후 확정합니다.</span>
          </div>
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
  syncMessage: string | null
  syncResult: SyncImportResult | null
  syncStatus: SyncStatus
  onExportSyncSnapshot(): Promise<void>
  onImportSyncSnapshot(): Promise<void>
}

function ToolsPanel({
  onExportSyncSnapshot,
  onImportSyncSnapshot,
  syncMessage,
  syncResult,
  syncStatus,
}: ToolsPanelProps) {
  return (
    <section className="mode-panel tool-panel" aria-label="도구">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Tools</p>
          <h2>도구</h2>
        </div>
      </div>
      <section className="settings-subsection" aria-label="mock sync">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow">Mock sync</p>
            <h3>로컬 동기화 스냅샷</h3>
          </div>
        </div>
        <dl className="detail-list">
          <DetailItem
            label="내보내기 파일"
            value={syncStatus.exportPath || '아직 없음'}
          />
          <DetailItem
            label="마지막 내보내기"
            value={formatDate(syncStatus.lastExportedAt)}
          />
        </dl>
        <div className="form-actions">
          <button type="button" onClick={() => void onExportSyncSnapshot()}>
            내보내기
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => void onImportSyncSnapshot()}
          >
            가져오기
          </button>
        </div>
        {syncMessage ? <p className="panel-success">{syncMessage}</p> : null}
        {syncResult ? (
          <p className="panel-success">
            가져오기 완료: 생성 {syncResult.tasksCreated}개, 업데이트{' '}
            {syncResult.tasksUpdated}개, 이벤트 {syncResult.taskRunEventsAdded}개
          </p>
        ) : null}
      </section>
    </section>
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

type TaskLaunchPanelProps = {
  browserTasks: BrowserTabGroupTask[]
  categoryLabel: string
  displayMode: TaskListDisplayMode
  isLoading: boolean
  runningTaskId: string | null
  selectedTaskId: string | null
  onCreate(): void
  onDisplayModeChange(value: TaskListDisplayMode): void
  onRun(taskId: string): Promise<void>
  onSelect(task: BrowserTabGroupTask): void
}

function TaskLaunchPanel({
  browserTasks,
  categoryLabel,
  displayMode,
  isLoading,
  onCreate,
  onDisplayModeChange,
  onRun,
  onSelect,
  runningTaskId,
  selectedTaskId,
}: TaskLaunchPanelProps) {
  return (
    <section className="task-section launch-section" aria-label="작업 실행">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{categoryLabel}</p>
          <h2>실행할 작업</h2>
        </div>
        <div className="section-actions">
          <TaskListDisplayToggle
            value={displayMode}
            onChange={onDisplayModeChange}
          />
          <span>{browserTasks.length}개</span>
        </div>
      </div>

      {isLoading ? (
        <p className="empty-state">작업을 불러오는 중입니다.</p>
      ) : browserTasks.length === 0 ? (
        <div className="empty-state empty-state-action">
          <p>아직 저장된 브라우저 탭 그룹 템플릿이 없습니다.</p>
          <button type="button" onClick={onCreate}>
            새 작업 만들기
          </button>
        </div>
      ) : (
        <div className={`task-list task-list-${displayMode}`}>
          {browserTasks.map((task) => {
            const config = normalizeBrowserTabGroupConfig(task.config)
            const isRunning = runningTaskId === task.id
            const isSelected = selectedTaskId === task.id

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
                      {getBrowserKindLabel(config.browserKind)} · 마지막 실행{' '}
                      {formatDate(task.state.lastRunAt)}
                    </span>
                  </button>
                ) : (
                  <div className="task-card-title">
                    <strong>{task.name}</strong>
                  </div>
                )}
                {isRestrictedDevicePolicy(task.permissions) ? (
                  <span className="sensitive-pill">제한됨</span>
                ) : null}
                <span className={`status-pill status-${task.state.status}`}>
                  {getTaskStatusLabel(task.state.status)}
                </span>
                <button
                  type="button"
                  disabled={isRunning}
                  onClick={() => void onRun(task.id)}
                >
                  {isRunning ? '실행 중' : '실행'}
                </button>
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
          <h2>새 브라우저 작업</h2>
        </div>
        <button className="ghost-button" type="button" onClick={onCancel}>
          닫기
        </button>
      </div>
      <form className="task-form" onSubmit={onSubmit}>
        <div className="form-grid">
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
          <label>
            브라우저
            <select
              value={createForm.browserKind}
              onChange={(event) =>
                onChange({
                  ...createForm,
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
              value={createForm.runMode}
              onChange={(event) =>
                onChange({
                  ...createForm,
                  runMode: event.target.value as BrowserRunMode,
                })
              }
            >
              <option value="dedicated_profile">전용 프로필</option>
              <option value="extension_controlled">확장 프로그램 제어</option>
            </select>
          </label>
        </div>
        <label>
          초기 URL
          <textarea
            value={createForm.initialUrls}
            onChange={(event) =>
              onChange({
                ...createForm,
                initialUrls: event.target.value,
              })
            }
            placeholder="한 줄에 하나씩 입력"
            rows={5}
          />
        </label>
        <label className="inline-check">
          <input
            checked={createForm.dynamicTemplateUpdates}
            type="checkbox"
            onChange={(event) =>
              onChange({
                ...createForm,
                dynamicTemplateUpdates: event.target.checked,
              })
            }
          />
          실행 후 열린 탭 URL을 템플릿에 반영
        </label>
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
  confirmDeleteTaskId: string | null
  currentDevice: CurrentDevice
  editForm: BrowserTaskFormState
  isLoading: boolean
  secrets: LocalSecretMetadata[]
  selectedTask: BrowserTabGroupTask | null
  taskRunEvents: TaskRunEvent[]
  onChange(value: BrowserTaskFormState): void
  onConfirmDelete(taskId: string): Promise<void>
  onDeleteRequest(taskId: string | null): void
  onSubmit(event: FormEvent<HTMLFormElement>): void
}

function EditWorkspace({
  confirmDeleteTaskId,
  currentDevice,
  editForm,
  isLoading,
  onChange,
  onConfirmDelete,
  onDeleteRequest,
  onSubmit,
  secrets,
  selectedTask,
  taskRunEvents,
}: EditWorkspaceProps) {
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

  const config = normalizeBrowserTabGroupConfig(selectedTask.config)
  const isConfirmingDelete = confirmDeleteTaskId === selectedTask.id

  return (
    <section aria-label="기존 작업 수정">
      <section className="mode-panel" aria-label="선택한 작업 수정">
        <TaskEditPanel
          currentDevice={currentDevice}
          editForm={editForm}
          onChange={onChange}
          onSubmit={onSubmit}
          secrets={secrets}
        />

        <dl className="detail-list">
          <DetailItem label="브라우저" value={getBrowserKindLabel(config.browserKind)} />
          <DetailItem label="실행 방식" value={getBrowserRunModeLabel(config.runMode)} />
          <DetailItem
            label="동적 업데이트"
            value={config.dynamicTemplateUpdates ? '사용' : '사용 안 함'}
          />
          <DetailItem
            label="탭 그룹 스냅샷"
            value={getTabGroupSnapshotLabel(config)}
          />
          <DetailItem label="상태" value={getTaskStatusLabel(selectedTask.state.status)} />
          <DetailItem label="마지막 실행" value={formatDate(selectedTask.state.lastRunAt)} />
          <DetailItem label="프로필 ID" value={config.profileId || '없음'} />
          <DetailItem
            label="로컬 프로필 경로"
            value={selectedTask.state.localProfilePath ?? '아직 없음'}
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
  secretForm: SecretFormState
  secretStorageStatus: SecretStorageStatus
  selectedCategory: SettingsCategory
  secrets: LocalSecretMetadata[]
  saveState: SettingsSaveState
  settingsErrorMessage: string | null
  userDataPath: string
  onChange(value: AppSettings): void
  onClose(): void
  onCreateSecret(): void
  onDeleteSecret(secretId: string): void
  onSecretFormChange(value: SecretFormState): void
  onSubmit(event: FormEvent<HTMLFormElement>): void
}

function AppSettingsPanel({
  currentDevice,
  form,
  secretForm,
  secretStorageStatus,
  selectedCategory,
  onChange,
  onClose,
  onCreateSecret,
  onDeleteSecret,
  onSecretFormChange,
  onSubmit,
  saveState,
  settingsErrorMessage,
  secrets,
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
              새 작업 기본 이름
              <input
                value={form.defaultTaskName}
                onChange={(event) =>
                  onChange({
                    ...form,
                    defaultTaskName: event.target.value,
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
              초기 URL 입력 방식
              <input value="줄 단위 입력" readOnly />
            </label>

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

            <label>
              데이터 위치
              <input value={userDataPath || '아직 불러오지 못했습니다.'} readOnly />
            </label>
          </>
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
        <label>
          브라우저
          <select
            value={editForm.browserKind}
            onChange={(event) =>
              onChange({
                ...editForm,
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
            value={editForm.runMode}
            onChange={(event) =>
              onChange({
                ...editForm,
                runMode: event.target.value as BrowserRunMode,
              })
            }
          >
            <option value="dedicated_profile">전용 프로필</option>
            <option value="extension_controlled">확장 프로그램 제어</option>
          </select>
        </label>
        <label>
          초기 URL
          <textarea
            value={editForm.initialUrls}
            onChange={(event) =>
              onChange({
                ...editForm,
                initialUrls: event.target.value,
              })
            }
            rows={5}
          />
        </label>
        <label className="inline-check">
          <input
            checked={editForm.dynamicTemplateUpdates}
            type="checkbox"
            onChange={(event) =>
              onChange({
                ...editForm,
                dynamicTemplateUpdates: event.target.checked,
              })
            }
          />
          실행 후 열린 탭 URL을 템플릿에 반영
        </label>
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

function isSettingsDirty(form: AppSettings, settings: AppSettings): boolean {
  return (
    form.themeMode !== settings.themeMode ||
    form.defaultBrowserKind !== settings.defaultBrowserKind ||
    form.defaultTaskName.trim() !== settings.defaultTaskName ||
    form.initialUrlInputMode !== settings.initialUrlInputMode ||
    form.taskListDisplayMode !== settings.taskListDisplayMode ||
    form.taskRunEventRetentionLimit !== settings.taskRunEventRetentionLimit ||
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

function filterBrowserTasks(
  tasks: BrowserTabGroupTask[],
  category: NavigationCategory,
): BrowserTabGroupTask[] {
  switch (category) {
    case 'running':
      return tasks.filter((task) => task.state.status === 'running')
    case 'restricted':
      return tasks.filter((task) => isRestrictedDevicePolicy(task.permissions))
    case 'favorites':
      return []
    case 'folders':
    case 'all':
      return tasks
  }
}

function getNavigationCategoryLabel(category: NavigationCategory): string {
  switch (category) {
    case 'all':
      return 'All templates'
    case 'running':
      return 'Running'
    case 'folders':
      return 'Folders'
    case 'favorites':
      return 'Favorites'
    case 'restricted':
      return 'Restricted'
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
    case 'create':
      return '새 작업'
    case 'edit':
      return '수정'
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

function getTabGroupSnapshotLabel(config: BrowserTabGroupConfig): string {
  if (!config.tabGroupSnapshot) {
    return '아직 없음'
  }

  return `${config.tabGroupSnapshot.groups.length}개 그룹, ${
    config.tabGroupSnapshot.tabs.length
  }개 탭 · ${formatDate(config.tabGroupSnapshot.capturedAt)}`
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
