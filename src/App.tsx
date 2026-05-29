import { FormEvent, useEffect, useMemo, useState } from 'react'
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

const defaultTaskName = '새 브라우저 작업'

type BrowserTaskFormState = {
  name: string
  browserKind: BrowserKind
  initialUrls: string
}

const defaultCreateForm: BrowserTaskFormState = {
  name: defaultTaskName,
  browserKind: 'chrome',
  initialUrls: '',
}

function App() {
  const [tasks, setTasks] = useState<TaskTemplate[]>([])
  const [createForm, setCreateForm] =
    useState<BrowserTaskFormState>(defaultCreateForm)
  const [editForm, setEditForm] =
    useState<BrowserTaskFormState>(defaultCreateForm)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false)
  const [isEditingDetails, setIsEditingDetails] = useState(false)
  const [confirmDeleteTaskId, setConfirmDeleteTaskId] = useState<string | null>(
    null,
  )
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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
    void loadTasks()
  }, [])

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (browserTasks.length === 0) {
      setSelectedTaskId(null)
      setIsEditingDetails(false)
      setConfirmDeleteTaskId(null)
      return
    }

    if (!selectedTaskId || !browserTasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(browserTasks[0].id)
    }
  }, [browserTasks, isLoading, selectedTaskId])

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
      setCreateForm(defaultCreateForm)
      setIsCreatePanelOpen(false)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  function openCreatePanel() {
    setCreateForm(defaultCreateForm)
    setIsCreatePanelOpen(true)
    setIsEditingDetails(false)
    setConfirmDeleteTaskId(null)
  }

  function startEditing(task: BrowserTabGroupTask) {
    const config = normalizeBrowserTabGroupConfig(task.config)
    setIsEditingDetails(true)
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
      setIsEditingDetails(false)
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
      setIsEditingDetails(false)
      setConfirmDeleteTaskId(null)
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
          <p className="eyebrow">Local-first workspace templates</p>
          <h1>Pastel Flow</h1>
        </div>
        <div className="header-actions">
          <button className="ghost-button" type="button" onClick={loadTasks}>
            새로고침
          </button>
          <button type="button" onClick={openCreatePanel}>
            새 작업
          </button>
        </div>
      </header>

      {errorMessage ? <p className="error-message">{errorMessage}</p> : null}

      {isCreatePanelOpen ? (
        <section className="create-panel" aria-label="새 브라우저 작업 생성">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">New template</p>
              <h2>새 브라우저 작업</h2>
            </div>
            <button
              className="ghost-button"
              type="button"
              onClick={() => setIsCreatePanelOpen(false)}
            >
              닫기
            </button>
          </div>
          <form className="task-form" onSubmit={handleCreateTask}>
            <div className="form-grid">
              <label>
                이름
                <input
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="예: 리서치 세션"
                />
              </label>
              <label>
                브라우저
                <select
                  value={createForm.browserKind}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      browserKind: event.target.value as BrowserKind,
                    }))
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
                  setCreateForm((current) => ({
                    ...current,
                    initialUrls: event.target.value,
                  }))
                }
                placeholder="한 줄에 하나씩 입력"
                rows={3}
              />
            </label>
            <div className="form-actions">
              <button type="submit">생성</button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="workspace-grid">
        <section className="task-section" aria-label="작업 목록">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Saved templates</p>
              <h2>브라우저 작업</h2>
            </div>
            <span>{browserTasks.length}개</span>
          </div>

          {isLoading ? (
            <p className="empty-state">작업을 불러오는 중입니다.</p>
          ) : browserTasks.length === 0 ? (
            <div className="empty-state empty-state-action">
              <p>아직 저장된 브라우저 탭 그룹 템플릿이 없습니다.</p>
              <button type="button" onClick={openCreatePanel}>
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
                      onClick={() => {
                        setSelectedTaskId(task.id)
                        setIsEditingDetails(false)
                        setConfirmDeleteTaskId(null)
                      }}
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
                      onClick={() => void handleRunTask(task.id)}
                    >
                      {isRunning ? '실행 중' : '실행'}
                    </button>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <aside className="detail-panel" aria-label="선택한 작업 상세">
          {isLoading ? (
            <p className="empty-state">상세 정보를 불러오는 중입니다.</p>
          ) : selectedTask ? (
            isEditingDetails ? (
              <TaskEditPanel
                editForm={editForm}
                onCancel={() => setIsEditingDetails(false)}
                onChange={setEditForm}
                onSubmit={handleUpdateTask}
              />
            ) : (
              <TaskDetailPanel
                confirmDeleteTaskId={confirmDeleteTaskId}
                isRunning={runningTaskId === selectedTask.id}
                onConfirmDelete={handleDeleteTask}
                onDeleteRequest={setConfirmDeleteTaskId}
                onEdit={startEditing}
                onRun={handleRunTask}
                task={selectedTask}
              />
            )
          ) : (
            <div className="empty-state empty-state-action">
              <p>선택된 작업이 없습니다.</p>
              <button type="button" onClick={openCreatePanel}>
                새 작업 만들기
              </button>
            </div>
          )}
        </aside>
      </section>
    </main>
  )
}

type TaskEditPanelProps = {
  editForm: BrowserTaskFormState
  onCancel(): void
  onChange(value: BrowserTaskFormState): void
  onSubmit(event: FormEvent<HTMLFormElement>): void
}

function TaskEditPanel({
  editForm,
  onCancel,
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
          <button className="ghost-button" type="button" onClick={onCancel}>
            취소
          </button>
        </div>
      </form>
    </>
  )
}

type TaskDetailPanelProps = {
  confirmDeleteTaskId: string | null
  isRunning: boolean
  task: BrowserTabGroupTask
  onConfirmDelete(taskId: string): Promise<void>
  onDeleteRequest(taskId: string | null): void
  onEdit(task: BrowserTabGroupTask): void
  onRun(taskId: string): Promise<void>
}

function TaskDetailPanel({
  confirmDeleteTaskId,
  isRunning,
  onConfirmDelete,
  onDeleteRequest,
  onEdit,
  onRun,
  task,
}: TaskDetailPanelProps) {
  const config = normalizeBrowserTabGroupConfig(task.config)
  const isConfirmingDelete = confirmDeleteTaskId === task.id

  return (
    <>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Selected template</p>
          <h2>{task.name}</h2>
        </div>
        <span className={`status-pill status-${task.state.status}`}>
          {getTaskStatusLabel(task.state.status)}
        </span>
      </div>

      <div className="detail-actions">
        <button
          type="button"
          disabled={isRunning}
          onClick={() => void onRun(task.id)}
        >
          {isRunning ? '실행 중' : '실행'}
        </button>
        <button className="ghost-button" type="button" onClick={() => onEdit(task)}>
          수정
        </button>
      </div>

      <dl className="detail-list">
        <DetailItem label="브라우저" value={getBrowserKindLabel(config.browserKind)} />
        <DetailItem label="실행 방식" value="전용 프로필" />
        <DetailItem label="상태" value={getTaskStatusLabel(task.state.status)} />
        <DetailItem label="마지막 실행" value={formatDate(task.state.lastRunAt)} />
        <DetailItem label="프로필 ID" value={config.profileId || '없음'} />
        <DetailItem
          label="로컬 프로필 경로"
          value={task.state.localProfilePath ?? '아직 없음'}
        />
        <DetailItem label="생성 시간" value={formatDate(task.createdAt)} />
        <DetailItem label="수정 시간" value={formatDate(task.updatedAt)} />
      </dl>

      <section className="url-section" aria-label="초기 URL 목록">
        <h3>초기 URL</h3>
        {config.initialUrls.length > 0 ? (
          <ul>
            {config.initialUrls.map((url) => (
              <li key={url}>{url}</li>
            ))}
          </ul>
        ) : (
          <p className="muted-text">저장된 초기 URL이 없습니다.</p>
        )}
      </section>

      {task.state.lastError ? (
        <section className="last-error" aria-label="마지막 오류">
          <h3>마지막 오류</h3>
          <p>{task.state.lastError}</p>
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
                onClick={() => void onConfirmDelete(task.id)}
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
            onClick={() => onDeleteRequest(task.id)}
          >
            삭제
          </button>
        )}
      </section>
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
