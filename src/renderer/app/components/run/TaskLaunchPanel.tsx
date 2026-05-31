import type { CSSProperties } from 'react'
import type { TaskListDisplayMode } from '../../../../shared/settings'
import {
  isRestrictedDevicePolicy,
  type WorkflowDefinition,
} from '../../../../shared/tasks'
import { TaskListDisplayToggle } from './TaskListDisplayToggle'
import {
  formatDate,
  getTaskScheduleLabel,
  getTaskStatusLabel,
} from '../../utils/viewLabels'

export type TaskLaunchPanelProps = {
  categoryLabel: string
  displayMode: TaskListDisplayMode
  gridColumnCount: number
  isLoading: boolean
  runningWorkflowId: string | null
  selectedWorkflowId: string | null
  stoppingWorkflowId: string | null
  workflows: WorkflowDefinition[]
  workflowHierarchy: string[]
  onCreate(): void
  onDisplayModeChange(displayMode: TaskListDisplayMode): Promise<void>
  onGridColumnCountChange(columnCount: number): Promise<void>
  onRun(workflowId: string): Promise<void>
  onSelect(workflow: WorkflowDefinition): void
  onStop(workflowId: string): Promise<void>
}

export function TaskLaunchPanel({
  workflows,
  workflowHierarchy,
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
  runningWorkflowId,
  selectedWorkflowId,
  stoppingWorkflowId,
}: TaskLaunchPanelProps) {
  return (
    <section className="task-section launch-section" aria-label="Workflow 실행">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{categoryLabel}</p>
          <h2>실행할 Workflow</h2>
        </div>
        <div className="section-actions">
          {displayMode === 'grid' ? (
            <div className="grid-column-stepper" aria-label="그리드 열 수">
              <button
                aria-label="그리드 열 수 줄이기"
                disabled={gridColumnCount <= 2}
                type="button"
                onClick={() =>
                  void onGridColumnCountChange(Math.max(2, gridColumnCount - 1))
                }
              >
                -
              </button>
              <span aria-label={`${gridColumnCount}열`}>{gridColumnCount}</span>
              <button
                aria-label="그리드 열 수 늘리기"
                disabled={gridColumnCount >= 8}
                type="button"
                onClick={() =>
                  void onGridColumnCountChange(Math.min(8, gridColumnCount + 1))
                }
              >
                +
              </button>
            </div>
          ) : null}
          <TaskListDisplayToggle
            value={displayMode}
            onChange={onDisplayModeChange}
          />
        </div>
      </div>

      {isLoading ? (
        <p className="empty-state">작업을 불러오는 중입니다.</p>
      ) : workflows.length === 0 ? (
        <div className="empty-state empty-state-action">
          <p>아직 저장된 Workflow가 없습니다.</p>
          <button type="button" onClick={onCreate}>
            Workflow 만들기
          </button>
        </div>
      ) : (
        <div
          className="task-list workflow-grouped-list"
          style={
            displayMode === 'grid'
              ? ({
                  '--workflow-grid-columns': gridColumnCount,
                } as CSSProperties)
              : undefined
          }
        >
          {groupWorkflows(workflows, workflowHierarchy).map((group) => (
            <section className="workflow-run-group" key={group.name}>
              <h3>{group.name}</h3>
              <div className={`workflow-run-group-items task-list-${displayMode}`}>
          {group.workflows.map((workflow) => {
            const isRunning = runningWorkflowId === workflow.id
            const isStopping = stoppingWorkflowId === workflow.id
            const isSelected = selectedWorkflowId === workflow.id
            const canStop = workflow.state.status === 'running'

            return (
              <article
                className={`task-row${isSelected ? ' is-selected' : ''}`}
                key={workflow.id}
              >
                {displayMode === 'list' ? (
                  <button
                    className="task-select-button"
                    type="button"
                    onClick={() => onSelect(workflow)}
                  >
                    <span className="task-row-title">{workflow.name}</span>
                    <span className="task-row-meta">
                      Action {workflow.actionRefs.length}개 · 마지막 실행{' '}
                      {formatDate(workflow.state.lastRunAt)} ·{' '}
                      {getTaskScheduleLabel(workflow.schedule)}
                    </span>
                    <span className="task-row-meta">
                      {workflow.state.lastError ??
                        workflow.state.lastMessage ??
                        '아직 실행 결과가 없습니다.'}
                    </span>
                  </button>
                ) : (
                  <button
                    className={`workflow-grid-button status-${workflow.state.status}`}
                    disabled={isRunning || isStopping}
                    type="button"
                    onClick={() =>
                      void (canStop ? onStop(workflow.id) : onRun(workflow.id))
                    }
                  >
                    <span>{workflow.name}</span>
                    {canStop || isStopping || isRunning ? (
                      <small>
                        {isStopping
                          ? '중지 중'
                          : canStop
                            ? '중지'
                            : '실행 중'}
                      </small>
                    ) : null}
                  </button>
                )}
                {displayMode === 'list' &&
                isRestrictedDevicePolicy(workflow.permissions) ? (
                  <span className="sensitive-pill">제한됨</span>
                ) : null}
                {displayMode === 'list' ? (
                  <span className={`status-pill status-${workflow.state.status}`}>
                  {getTaskStatusLabel(workflow.state.status)}
                  </span>
                ) : null}
                {displayMode === 'list' ? (
                  <button
                    type="button"
                    disabled={isRunning || isStopping}
                    onClick={() =>
                      void (canStop ? onStop(workflow.id) : onRun(workflow.id))
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
            </section>
          ))}
        </div>
      )}
    </section>
  )
}

function groupWorkflows(
  workflows: WorkflowDefinition[],
  workflowHierarchy: string[],
): { name: string; workflows: WorkflowDefinition[] }[] {
  const fallbackGroup = workflowHierarchy[0] ?? '기본'
  const groups = workflowHierarchy.map((name) => ({
    name,
    workflows: [] as WorkflowDefinition[],
  }))

  workflows.forEach((workflow) => {
    const group =
      groups.find((currentGroup) =>
        workflow.name.toLowerCase().startsWith(currentGroup.name.toLowerCase()),
      ) ?? groups[0]

    ;(group ?? { name: fallbackGroup, workflows: [] }).workflows.push(workflow)
  })

  return groups.filter((group) => group.workflows.length > 0)
}
