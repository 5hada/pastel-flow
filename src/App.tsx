import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  createDefaultBrowserTabGroupConfig,
  getBrowserRunModeLabel,
  normalizeBrowserTabGroupConfig,
  type BrowserKind,
  type BrowserRunMode,
  type BrowserTabGroupConfig,
  type BrowserTabGroupTask,
  type TaskTemplate,
} from './shared/tasks'
import type { CreateBrowserTabGroupTaskInput } from './renderer/api/tasksApi'
import './App.css'

const defaultTaskName = '새 브라우저 작업'

type BrowserTaskFormState = {
  name: string
  browserKind: BrowserKind
  runMode: BrowserRunMode
  initialUrls: string
}

const defaultCreateForm: BrowserTaskFormState = {
  name: defaultTaskName,
  browserKind: 'chrome',
  runMode: 'dedicated_profile',
  initialUrls: '',
}

function App() {
  const [tasks, setTasks] = useState<TaskTemplate[]>([])
  const [createForm, setCreateForm] =
    useState<BrowserTaskFormState>(defaultCreateForm)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editForm, setEditForm] =
    useState<BrowserTaskFormState>(defaultCreateForm)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const browserTasks = useMemo(
    () =>
      tasks.filter(
        (task): task is BrowserTabGroupTask => task.type === 'browser_tab_group',
      ),
    [tasks],
  )

  useEffect(() => {
    void loadTasks()
  }, [])

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
      runMode: createForm.runMode,
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
      setCreateForm(defaultCreateForm)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  function startEditing(task: BrowserTabGroupTask) {
    const config = normalizeBrowserTabGroupConfig(task.config)
    setEditingTaskId(task.id)
    setEditForm({
      name: task.name,
      browserKind: config.browserKind,
      runMode: config.runMode,
      initialUrls: config.initialUrls.join('\n'),
    })
  }

  async function handleUpdateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!editingTaskId || !window.pastelFlow) {
      return
    }

    const currentTask = browserTasks.find((task) => task.id === editingTaskId)
    const trimmedName = editForm.name.trim()
    if (!currentTask || !trimmedName) {
      return
    }

    const currentConfig = normalizeBrowserTabGroupConfig(currentTask.config)
    const config: BrowserTabGroupConfig = {
      ...currentConfig,
      browserKind: editForm.browserKind,
      runMode: editForm.runMode,
      initialUrls: parseInitialUrls(editForm.initialUrls),
    }

    try {
      setErrorMessage(null)
      const updatedTask = await window.pastelFlow.tasks.update(editingTaskId, {
        name: trimmedName,
        config,
      })
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === updatedTask.id ? updatedTask : task,
        ),
      )
      setEditingTaskId(null)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!window.pastelFlow) {
      return
    }

    try {
      setErrorMessage(null)
      await window.pastelFlow.tasks.delete(taskId)
      setTasks((currentTasks) =>
        currentTasks.filter((task) => task.id !== taskId),
      )
      if (editingTaskId === taskId) {
        setEditingTaskId(null)
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Local-first workspace templates</p>
          <h1>Pastel Flow</h1>
        </div>
        <button className="ghost-button" type="button" onClick={loadTasks}>
          새로고침
        </button>
      </header>

      <section className="toolbar" aria-label="작업 생성">
        <form className="create-form" onSubmit={handleCreateTask}>
          <div className="form-grid">
            <label>
              브라우저 탭 그룹 이름
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
              <select
                value={createForm.runMode}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    runMode: event.target.value as BrowserRunMode,
                  }))
                }
              >
                <option value="dedicated_profile">전용 프로필</option>
                <option value="extension_controlled">확장 프로그램</option>
                <option value="default_browser_deeplink">
                  기본 브라우저 연결
                </option>
              </select>
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

      {errorMessage ? <p className="error-message">{errorMessage}</p> : null}

      <section className="task-section" aria-label="작업 목록">
        <div className="section-heading">
          <h2>브라우저 작업</h2>
          <span>{browserTasks.length}개</span>
        </div>

        {isLoading ? (
          <p className="empty-state">작업을 불러오는 중입니다.</p>
        ) : browserTasks.length === 0 ? (
          <p className="empty-state">
            아직 저장된 브라우저 탭 그룹 템플릿이 없습니다.
          </p>
        ) : (
          <div className="task-list">
            {browserTasks.map((task) => {
              const config = normalizeBrowserTabGroupConfig(task.config)
              const isEditing = editingTaskId === task.id

              return (
                <article className="task-card" key={task.id}>
                  {isEditing ? (
                    <form className="edit-form" onSubmit={handleUpdateTask}>
                      <div className="form-grid">
                        <label>
                          이름
                          <input
                            value={editForm.name}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                name: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label>
                          브라우저
                          <select
                            value={editForm.browserKind}
                            onChange={(event) =>
                              setEditForm((current) => ({
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
                          <select
                            value={editForm.runMode}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                runMode: event.target.value as BrowserRunMode,
                              }))
                            }
                          >
                            <option value="dedicated_profile">전용 프로필</option>
                            <option value="extension_controlled">
                              확장 프로그램
                            </option>
                            <option value="default_browser_deeplink">
                              기본 브라우저 연결
                            </option>
                          </select>
                        </label>
                      </div>
                      <label>
                        초기 URL
                        <textarea
                          value={editForm.initialUrls}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              initialUrls: event.target.value,
                            }))
                          }
                          rows={3}
                        />
                      </label>
                      <div className="form-actions">
                        <button type="submit">저장</button>
                        <button
                          className="ghost-button"
                          type="button"
                          onClick={() => setEditingTaskId(null)}
                        >
                          취소
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="task-summary">
                        <div>
                          <h3>{task.name}</h3>
                          <p>
                            {config.browserKind} ·{' '}
                            {getBrowserRunModeLabel(config.runMode)}
                          </p>
                        </div>
                        <div className="task-actions">
                          <button type="button" onClick={() => startEditing(task)}>
                            수정
                          </button>
                          <button
                            className="danger-button"
                            type="button"
                            onClick={() => void handleDeleteTask(task.id)}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                      <dl>
                        <div>
                          <dt>상태</dt>
                          <dd>{task.state.status}</dd>
                        </div>
                        <div>
                          <dt>실행 방식</dt>
                          <dd>{getBrowserRunModeLabel(config.runMode)}</dd>
                        </div>
                        <div>
                          <dt>프로필</dt>
                          <dd>{config.profileId}</dd>
                        </div>
                        <div>
                          <dt>초기 URL</dt>
                          <dd>{config.initialUrls.length}개</dd>
                        </div>
                        <div>
                          <dt>마지막 실행</dt>
                          <dd>{task.state.lastRunAt ?? '아직 없음'}</dd>
                        </div>
                      </dl>
                    </>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}

function parseInitialUrls(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return '알 수 없는 오류가 발생했습니다.'
}

export default App
