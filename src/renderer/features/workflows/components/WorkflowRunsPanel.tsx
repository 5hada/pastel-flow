import { Button } from '@heroui/react'
import type { ActionRun, WorkflowRun } from '../../../../shared/runStatus'
import { formatDate } from '../../../shared/utils/viewLabels'

export type WorkflowRunsPanelProps = {
  actionRuns: ActionRun[]
  runs: WorkflowRun[]
  selectedRunId: string | null
  onSelectRun(runId: string): void
}

export function WorkflowRunsPanel({
  actionRuns,
  runs,
  selectedRunId,
  onSelectRun,
}: WorkflowRunsPanelProps) {
  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? null

  return (
    <section className="workflow-runs" aria-label="Workflow 실행 이력">
      <div className="section-heading">
        <div>
          <h3>실행 이력</h3>
          <p className="muted-text">최근 WorkflowRun과 ActionRun 기록</p>
        </div>
      </div>

      {runs.length === 0 ? (
        <p className="muted-text">아직 실행 이력이 없습니다.</p>
      ) : (
        <div className="workflow-run-history">
          <div className="workflow-run-list">
            {runs.slice(0, 8).map((run) => (
              <Button
                className={`workflow-run-history-row${
                  run.id === selectedRunId ? ' is-selected' : ''
                }`}
                key={run.id}
                variant="ghost"
                type="button"
                onClick={() => onSelectRun(run.id)}
              >
                <span className={`status-pill status-${run.status}`}>
                  {getWorkflowRunStatusLabel(run.status)}
                </span>
                <span>
                  <strong>{run.summary ?? getWorkflowRunStatusLabel(run.status)}</strong>
                  <small>
                    {formatDate(run.startedAt ?? run.createdAt)}
                    {run.endedAt ? ` - ${formatDate(run.endedAt)}` : ''}
                  </small>
                </span>
              </Button>
            ))}
          </div>

          <div className="action-run-list" aria-label="Action 실행 이력">
            {selectedRun ? (
              <div className="action-run-heading">
                <strong>{formatDate(selectedRun.startedAt ?? selectedRun.createdAt)}</strong>
                <small>{selectedRun.id}</small>
              </div>
            ) : null}

            {actionRuns.length === 0 ? (
              <p className="muted-text">선택한 실행의 Action 기록이 없습니다.</p>
            ) : (
              actionRuns.map((actionRun) => (
                <div className="action-run-row" key={actionRun.id}>
                  <span className={`status-pill status-${actionRun.status}`}>
                    {getActionRunStatusLabel(actionRun.status)}
                  </span>
                  <div>
                    <strong>#{actionRun.order + 1} Action</strong>
                    <small>
                      {formatDate(actionRun.startedAt ?? actionRun.createdAt)}
                      {actionRun.endedAt ? ` - ${formatDate(actionRun.endedAt)}` : ''}
                    </small>
                    {actionRun.error ? <small>{actionRun.error}</small> : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function getWorkflowRunStatusLabel(status: WorkflowRun['status']): string {
  switch (status) {
    case 'pending_confirmation':
      return '확인 대기'
    case 'running':
      return '실행 중'
    case 'succeeded':
      return '완료'
    case 'failed':
      return '실패'
    case 'cancelled':
      return '취소'
    case 'skipped':
      return '건너뜀'
  }
}

function getActionRunStatusLabel(status: ActionRun['status']): string {
  switch (status) {
    case 'running':
      return '실행 중'
    case 'succeeded':
      return '완료'
    case 'failed':
      return '실패'
    case 'cancelled':
      return '취소'
    case 'skipped':
      return '건너뜀'
  }
}
