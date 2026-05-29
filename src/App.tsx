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
  type ThemeMode,
} from './shared/settings'
import {
  createDefaultBrowserTabGroupConfig,
  getDeviceExecutionPolicyLabel,
  getDeviceVisibilityPolicyLabel,
  isRestrictedDevicePolicy,
  normalizeDevicePolicy,
  normalizeBrowserTabGroupConfig,
  type BrowserKind,
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
import type { CreateBrowserTabGroupTaskInput } from './renderer/api/tasksApi'
import './App.css'

type BrowserTaskFormState = {
  name: string
  browserKind: BrowserKind
  initialUrls: string
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

type WorkspaceMode = 'run' | 'create' | 'edit' | 'settings'

const defaultSettingsForm: AppSettings = {
  ...defaultAppSettings,
}

function createBrowserTaskForm(settings: AppSettings): BrowserTaskFormState {
  return {
    name: settings.defaultTaskName,
    browserKind: settings.defaultBrowserKind,
    initialUrls: '',
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
  initialUrls: '',
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

function App() {
  const [tasks, setTasks] = useState<TaskTemplate[]>([])
  const [secrets, setSecrets] = useState<LocalSecretMetadata[]>([])
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

  useEffect(() => {
    void loadAppSettings()
    void loadSecrets()
    void loadTasks()
  }, [])

  useEffect(() => {
    if (!window.pastelFlow) {
      return undefined
    }

    return window.pastelFlow.tasks.onChanged((updatedTask) => {
      setTasks((currentTasks) => {
        if (!currentTasks.some((task) => task.id === updatedTask.id)) {
          return [...currentTasks, updatedTask]
        }

        return currentTasks.map((task) =>
          task.id === updatedTask.id ? updatedTask : task,
        )
      })
    })
  }, [])

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
      initialUrls: parseInitialUrls(createForm.initialUrls),
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
      initialUrls: config.initialUrls.join('\n'),
      visibility: permissions.visibility,
      execution: permissions.execution,
      allowedDeviceIds: permissions.allowedDeviceIds?.join('\n') ?? '',
      secretRefIds:
        permissions.secretRefs?.map((secretRef) => secretRef.id).join('\n') ??
        '',
    })
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
      initialUrls: parseInitialUrls(editForm.initialUrls),
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

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">저장된 브라우저 작업 공간</p>
          <h1>Pastel Flow</h1>
        </div>
        <p className="mode-label">{getWorkspaceModeLabel(workspaceMode)}</p>
        <div className="header-actions">
          <button
            aria-label="작업 목록 새로고침"
            className="icon-button"
            type="button"
            disabled={isLoading}
            title="새로고침"
            onClick={loadTasks}
          >
            {isLoading ? '...' : '↻'}
          </button>
          <button
            aria-label="실행 화면"
            className={`icon-button${workspaceMode === 'run' ? ' is-active' : ''}`}
            type="button"
            title="실행"
            onClick={openRunMode}
          >
            ▶
          </button>
          <button
            aria-label="새 작업 정의"
            className={`icon-button${workspaceMode === 'create' ? ' is-active' : ''}`}
            type="button"
            title="새 작업"
            onClick={openCreateMode}
          >
            +
          </button>
          <button
            aria-label="기존 작업 수정"
            className={`icon-button${workspaceMode === 'edit' ? ' is-active' : ''}`}
            type="button"
            title="수정"
            onClick={openEditMode}
          >
            ✎
          </button>
          <button
            aria-label="앱 설정"
            className={`icon-button${workspaceMode === 'settings' ? ' is-active' : ''}`}
            type="button"
            title="설정"
            onClick={openSettingsMode}
          >
            ⚙
          </button>
        </div>
      </header>

      {errorMessage ? <p className="error-message">{errorMessage}</p> : null}

      {workspaceMode === 'run' ? (
        <TaskLaunchPanel
          browserTasks={browserTasks}
          isLoading={isLoading}
          runningTaskId={runningTaskId}
          selectedTaskId={selectedTaskId}
          onCreate={openCreateMode}
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
          browserTasks={browserTasks}
          confirmDeleteTaskId={confirmDeleteTaskId}
          currentDevice={currentDevice}
          editForm={editForm}
          isLoading={isLoading}
          secrets={secrets}
          onChange={setEditForm}
          onConfirmDelete={handleDeleteTask}
          onDeleteRequest={setConfirmDeleteTaskId}
          onSelect={(task) => {
            setSelectedTaskId(task.id)
            startEditing(task)
          }}
          onSubmit={handleUpdateTask}
          selectedTask={selectedTask}
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
            secrets={secrets}
            currentDevice={currentDevice}
            userDataPath={userDataPath}
            onCreateSecret={handleCreateSecret}
            onDeleteSecret={handleDeleteSecret}
            onSecretFormChange={setSecretForm}
          />
        </section>
      ) : null}
    </main>
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
  isLoading: boolean
  runningTaskId: string | null
  selectedTaskId: string | null
  onCreate(): void
  onRun(taskId: string): Promise<void>
  onSelect(task: BrowserTabGroupTask): void
}

function TaskLaunchPanel({
  browserTasks,
  isLoading,
  onCreate,
  onRun,
  onSelect,
  runningTaskId,
  selectedTaskId,
}: TaskLaunchPanelProps) {
  return (
    <section className="task-section launch-section" aria-label="작업 실행">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Run templates</p>
          <h2>실행할 작업</h2>
        </div>
        <span>{browserTasks.length}개</span>
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
        <div className="task-list">
          {browserTasks.map((task) => {
            const config = normalizeBrowserTabGroupConfig(task.config)
            const isRunning = runningTaskId === task.id
            const isSelected = selectedTaskId === task.id

            return (
              <article
                className={`task-row${isSelected ? ' is-selected' : ''}`}
                key={task.id}
              >
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
            <input value="전용 프로필" readOnly />
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
  browserTasks: BrowserTabGroupTask[]
  confirmDeleteTaskId: string | null
  currentDevice: CurrentDevice
  editForm: BrowserTaskFormState
  isLoading: boolean
  secrets: LocalSecretMetadata[]
  selectedTask: BrowserTabGroupTask | null
  onChange(value: BrowserTaskFormState): void
  onConfirmDelete(taskId: string): Promise<void>
  onDeleteRequest(taskId: string | null): void
  onSelect(task: BrowserTabGroupTask): void
  onSubmit(event: FormEvent<HTMLFormElement>): void
}

function EditWorkspace({
  browserTasks,
  confirmDeleteTaskId,
  currentDevice,
  editForm,
  isLoading,
  onChange,
  onConfirmDelete,
  onDeleteRequest,
  onSelect,
  onSubmit,
  secrets,
  selectedTask,
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
    <section className="workspace-grid" aria-label="기존 작업 수정">
      <aside className="task-section" aria-label="수정할 작업 선택">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Edit target</p>
            <h2>수정 대상</h2>
          </div>
          <span>{browserTasks.length}개</span>
        </div>
        <div className="task-list compact-list">
          {browserTasks.map((task) => (
            <button
              className={`task-picker${
                selectedTask.id === task.id ? ' is-selected' : ''
              }`}
              key={task.id}
              type="button"
              onClick={() => onSelect(task)}
            >
              <span>{task.name}</span>
              <small>{getTaskStatusLabel(task.state.status)}</small>
            </button>
          ))}
        </div>
      </aside>

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
          <DetailItem label="실행 방식" value="전용 프로필" />
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

        <section className="settings-subsection" aria-label="로컬 Secret">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">Secrets</p>
              <h3>로컬 Secret</h3>
            </div>
            <span>{secrets.length}개</span>
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
          <input value="전용 프로필" readOnly />
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
