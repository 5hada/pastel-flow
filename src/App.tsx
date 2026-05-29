import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  createDefaultBrowserTabGroupConfig,
  type BrowserTabGroupTask,
  type TaskTemplate,
} from './shared/tasks'
import type { CreateBrowserTabGroupTaskInput } from './renderer/api/tasksApi'
import './App.css'

const defaultTaskName = '새 브라우저 작업'

function App() {
  const [tasks, setTasks] = useState<TaskTemplate[]>([])
  const [taskName, setTaskName] = useState(defaultTaskName)
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

    const trimmedName = taskName.trim()
    if (!trimmedName || !window.pastelFlow) {
      return
    }

    const profileId = `browser-${crypto.randomUUID()}`
    const input: CreateBrowserTabGroupTaskInput = {
      name: trimmedName,
      type: 'browser_tab_group',
      config: createDefaultBrowserTabGroupConfig(profileId),
    }

    try {
      setErrorMessage(null)
      const createdTask = await window.pastelFlow.tasks.create(input)
      setTasks((currentTasks) => [...currentTasks, createdTask])
      setTaskName(defaultTaskName)
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
          <label htmlFor="task-name">브라우저 탭 그룹 이름</label>
          <div className="create-row">
            <input
              id="task-name"
              value={taskName}
              onChange={(event) => setTaskName(event.target.value)}
              placeholder="예: 리서치 세션"
            />
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
            {browserTasks.map((task) => (
              <article className="task-card" key={task.id}>
                <div>
                  <h3>{task.name}</h3>
                  <p>{task.config.browserKind} 전용 프로필</p>
                </div>
                <dl>
                  <div>
                    <dt>상태</dt>
                    <dd>{task.state.status}</dd>
                  </div>
                  <div>
                    <dt>프로필</dt>
                    <dd>{task.config.profileId}</dd>
                  </div>
                  <div>
                    <dt>마지막 실행</dt>
                    <dd>{task.state.lastRunAt ?? '아직 없음'}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return '알 수 없는 오류가 발생했습니다.'
}

export default App
