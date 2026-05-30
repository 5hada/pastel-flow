import type { CSSProperties } from 'react'
import type { TaskListDisplayMode } from '../../../../shared/settings'
import {
  isRestrictedDevicePolicy,
  normalizeBrowserTabGroupConfig,
  type BrowserTabGroupConfig,
  type TaskTemplate,
} from '../../../../shared/tasks'
import { TaskListDisplayToggle } from './TaskListDisplayToggle'
import {
  formatDate,
  getBrowserKindLabel,
  getTaskScheduleLabel,
  getTaskStatusLabel,
  getTaskTypeLabel,
} from '../../utils/viewLabels'

export type TaskLaunchPanelProps = {
  categoryLabel: string
  displayMode: TaskListDisplayMode
  gridColumnCount: number
  isLoading: boolean
  runningTaskId: string | null
  selectedTaskId: string | null
  stoppingTaskId: string | null
  tasks: TaskTemplate[]
  onCreate(): void
  onDisplayModeChange(displayMode: TaskListDisplayMode): Promise<void>
  onGridColumnCountChange(columnCount: number): Promise<void>
  onRun(taskId: string): Promise<void>
  onSelect(task: TaskTemplate): void
  onStop(taskId: string): Promise<void>
}

export function TaskLaunchPanel({
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
                        : getTaskTypeLabel(task.type)} · Action 1개 · 마지막 실행{' '}
                      {formatDate(task.state.lastRunAt)} ·{' '}
                      {getTaskScheduleLabel(task.schedule)}
                    </span>
                    <span className="task-row-meta">
                      {task.state.lastError ??
                        task.state.lastMessage ??
                        '아직 실행 결과가 없습니다.'}
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
