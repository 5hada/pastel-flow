import { Button } from '@heroui/react'
import type { ActionRun, WorkflowRun } from '../../../../shared/runStatus'
import type { WorkflowArtifact } from '../../../../shared/artifacts'
import { formatDate } from '../../../shared/utils/viewLabels'

export type WorkflowRunsPanelProps = {
  actionRuns: ActionRun[]
  artifacts: WorkflowArtifact[]
  runs: WorkflowRun[]
  selectedRunId: string | null
  onSelectRun(runId: string): void
}

export function WorkflowRunsPanel({
  actionRuns,
  artifacts,
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

            {artifacts.length > 0 ? (
              <div className="artifact-list" aria-label="Artifact 목록">
                <strong>Artifacts</strong>
                {artifacts.map((artifact) => (
                  <div className="artifact-row" key={artifact.id}>
                    <span className="status-pill">{artifact.type}</span>
                    <div>
                      <strong>{artifact.summary ?? artifact.path}</strong>
                      <small>
                        {formatArtifactSize(artifact.size)} · {formatDate(artifact.createdAt)}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  )
}

function formatArtifactSize(size?: number): string {
  if (size === undefined) {
    return '크기 미기록'
  }

  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`
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
