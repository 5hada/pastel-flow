import { Button, Card, Chip } from '@heroui/react'
import type { CSSProperties, ReactNode } from 'react'
import type { WorkflowListDisplayMode } from '../../../shared/settings'
import { isRestrictedDevicePolicy } from '../../../shared/devices'
import type { WorkflowDefinition } from '../../../shared/workflows'
import { TaskListDisplayToggle } from './TaskListDisplayToggle'
import {
  formatDate,
  getTaskScheduleLabel,
  getTaskStatusLabel,
} from '../../shared/utils/viewLabels'

const statusChipColor = {
  failed: 'danger',
  idle: 'default',
  running: 'warning',
  succeeded: 'success',
} as const

export type TaskLaunchPanelProps = {
  categoryLabel: string
  displayMode: WorkflowListDisplayMode
  gridColumnCount: number
  isLoading: boolean
  runningWorkflowId: string | null
  selectedWorkflowId: string | null
  stoppingWorkflowId: string | null
  workflows: WorkflowDefinition[]
  workflowHierarchy: string[]
  onCreate(): void
  onDisplayModeChange(displayMode: WorkflowListDisplayMode): Promise<void>
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
    <Card className="task-section launch-section" aria-label="Workflow 실행">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{categoryLabel}</p>
          <h2>실행할 Workflow</h2>
        </div>
        <div className="section-actions">
          {displayMode === 'grid' ? (
            <div aria-label="그리드 열 수" className="grid-column-stepper">
              <Button
                aria-label="그리드 열 수 줄이기"
                isDisabled={gridColumnCount <= 2}
                isIconOnly
                variant="ghost"
                onClick={() =>
                  void onGridColumnCountChange(Math.max(2, gridColumnCount - 1))
                }
              >
                -
              </Button>
              <span aria-label={`${gridColumnCount}열`}>{gridColumnCount}</span>
              <Button
                aria-label="그리드 열 수 늘리기"
                isDisabled={gridColumnCount >= 8}
                isIconOnly
                variant="ghost"
                onClick={() =>
                  void onGridColumnCountChange(Math.min(8, gridColumnCount + 1))
                }
              >
                +
              </Button>
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
          <Button variant="primary" type="button" onClick={onCreate}>
            Workflow 만들기
          </Button>
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
            <Card className="workflow-run-group" key={group.name}>
              <h3>{group.name}</h3>
              <div className={`workflow-run-group-items task-list-${displayMode}`}>
          {group.workflows.map((workflow) => {
            const isRunning = runningWorkflowId === workflow.id
            const isStopping = stoppingWorkflowId === workflow.id
            const isSelected = selectedWorkflowId === workflow.id
            const canStop = workflow.state.status === 'running'

            if (displayMode === 'grid') {
              return (
                <WorkflowRunCard
                  key={workflow.id}
                  status={workflow.state.status}
                  subtitle={
                    canStop || isStopping || isRunning
                      ? isStopping
                        ? '중지 중'
                        : canStop
                          ? '실행 중'
                          : '실행 준비'
                      : undefined
                  }
                  title={workflow.name}
                  actionLabel={
                    isStopping
                      ? '중지 중'
                      : canStop
                        ? '중지'
                        : isRunning
                          ? '실행 중'
                          : '실행'
                  }
                  actionVariant={canStop || isStopping ? 'danger' : 'primary'}
                  isActionDisabled={isRunning || isStopping}
                  onAction={() =>
                    void (canStop ? onStop(workflow.id) : onRun(workflow.id))
                  }
                />
              )
            }

            return (
              <article
                className={`task-row${isSelected ? ' is-selected' : ''}`}
                key={workflow.id}
              >
                <div className="task-row-summary">
                    <span className="task-row-title">{workflow.name}</span>
                    <span className="task-row-meta">
                      Action {workflow.actionRefs.length}개 · 마지막 실행{' '}
                      {formatDate(workflow.state.endedAt)} ·{' '}
                      {getTaskScheduleLabel(workflow.schedule)}
                    </span>
                    <span className="task-row-meta">
                      {workflow.state.lastError ??
                        workflow.state.lastMessage ??
                        '아직 실행 결과가 없습니다.'}
                    </span>
                </div>
                {displayMode === 'list' &&
                isRestrictedDevicePolicy(workflow.permissions) ? (
                  <Chip color="warning" size="sm" variant="soft">제한됨</Chip>
                ) : null}
                {displayMode === 'list' ? (
                  <Chip
                    color={statusChipColor[workflow.state.status]}
                    size="sm"
                    variant="soft"
                  >
                    {getTaskStatusLabel(workflow.state.status)}
                  </Chip>
                ) : null}
                <Button
                  variant={isSelected ? 'secondary' : 'ghost'}
                  type="button"
                  onClick={() => onSelect(workflow)}
                >
                  선택
                </Button>
                {displayMode === 'list' ? (
                  <Button
                    type="button"
                    variant={canStop || isStopping ? 'danger' : 'primary'}
                    isDisabled={isRunning || isStopping}
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
                  </Button>
                ) : null}
              </article>
            )
          })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </Card>
  )
}

function WorkflowRunCard({
  actionLabel,
  actionVariant,
  isActionDisabled,
  onAction,
  status,
  subtitle,
  title,
}: {
  actionLabel: ReactNode
  actionVariant: 'danger' | 'primary'
  isActionDisabled: boolean
  status: string
  subtitle?: ReactNode
  title: ReactNode
  onAction(): void
}) {
  return (
    <Card className={`workflow-run-card status-${status}`}>
      <Card.Header>
        <Card.Title>{title}</Card.Title>
        {subtitle ? <small>{subtitle}</small> : null}
      </Card.Header>
      <Card.Footer>
        <Button
          isDisabled={isActionDisabled}
          type="button"
          variant={actionVariant}
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      </Card.Footer>
    </Card>
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
