import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  defaultAppSettings,
  type AppSettings,
  type ThemeMode,
} from './shared/settings'
import {
  createDefaultBrowserTabGroupConfig,
  normalizeBrowserTabGroupConfig,
  type BrowserKind,
  type BrowserTabGroupConfig,
  type BrowserTabGroupTask,
  type TaskState,
  type TaskTemplate,
} from './shared/tasks'
import type { CreateBrowserTabGroupTaskInput } from './renderer/api/tasksApi'
import './App.css'

type BrowserTaskFormState = {
  name: string
  browserKind: BrowserKind
  initialUrls: string
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
  }
}

const initialSettingsSnapshot = {
  settings: defaultAppSettings,
  userDataPath: '',
}

const defaultEditForm: BrowserTaskFormState = {
  name: defaultAppSettings.defaultTaskName,
  browserKind: defaultAppSettings.defaultBrowserKind,
  initialUrls: '',
}

function App() {
  const [tasks, setTasks] = useState<TaskTemplate[]>([])
  const [appSettings, setAppSettings] = useState<AppSettings>(
    initialSettingsSnapshot.settings,
  )
  const [settingsForm, setSettingsForm] =
    useState<AppSettings>(defaultSettingsForm)
  const [userDataPath, setUserDataPath] = useState(
    initialSettingsSnapshot.userDataPath,
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
    void loadTasks()
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
      setSettingsSaveState('saved')
    } catch (error) {
      setSettingsSaveState('failed')
      setSettingsErrorMessage(getErrorMessage(error))
    }
  }

  function startEditing(task: BrowserTabGroupTask) {
    const config = normalizeBrowserTabGroupConfig(task.config)
    setConfirmDeleteTaskId(null)
    setEditForm({
      name: task.name,
      browserKind: config.browserKind,
      initialUrls: config.initialUrls.join('\n'),
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
          onCancel={openRunMode}
          onChange={setCreateForm}
          onSubmit={handleCreateTask}
        />
      ) : null}

      {workspaceMode === 'edit' ? (
        <EditWorkspace
          browserTasks={browserTasks}
          confirmDeleteTaskId={confirmDeleteTaskId}
          editForm={editForm}
          isLoading={isLoading}
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
            userDataPath={userDataPath}
          />
        </section>
      ) : null}
    </main>
  )
}

type TaskEditPanelProps = {
  editForm: BrowserTaskFormState
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
  onCancel(): void
  onChange(value: BrowserTaskFormState): void
  onSubmit(event: FormEvent<HTMLFormElement>): void
}

function CreateTaskPanel({
  createForm,
  onCancel,
  onChange,
  onSubmit,
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
  editForm: BrowserTaskFormState
  isLoading: boolean
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
  editForm,
  isLoading,
  onChange,
  onConfirmDelete,
  onDeleteRequest,
  onSelect,
  onSubmit,
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
          editForm={editForm}
          onChange={onChange}
          onSubmit={onSubmit}
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
  saveState: SettingsSaveState
  settingsErrorMessage: string | null
  userDataPath: string
  onChange(value: AppSettings): void
  onClose(): void
  onSubmit(event: FormEvent<HTMLFormElement>): void
}

function AppSettingsPanel({
  form,
  onChange,
  onClose,
  onSubmit,
  saveState,
  settingsErrorMessage,
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
          데이터 위치
          <input value={userDataPath || '아직 불러오지 못했습니다.'} readOnly />
        </label>

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
  editForm,
  onChange,
  onSubmit,
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
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function isSettingsDirty(form: AppSettings, settings: AppSettings): boolean {
  return (
    form.themeMode !== settings.themeMode ||
    form.defaultBrowserKind !== settings.defaultBrowserKind ||
    form.defaultTaskName.trim() !== settings.defaultTaskName ||
    form.initialUrlInputMode !== settings.initialUrlInputMode
  )
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
