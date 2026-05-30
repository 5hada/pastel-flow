import type { FormEvent } from 'react'
import type { CurrentDevice } from '../../../../shared/devices'
import type { LocalSecretMetadata } from '../../../../shared/secrets'
import type { ActionDefinition, WorkflowDefinition } from '../../../../shared/tasks'
import type { BrowserTaskFormState } from '../../taskFormState'
import { CreateTaskPanel } from '../tasks/CreateTaskPanel'
import { DetailItem } from '../tasks/DetailItem'
import { getActionTypeLabel, formatDate } from '../../utils/viewLabels'

export type ActionWorkspacePanelProps = {
  actions: ActionDefinition[]
  createForm: BrowserTaskFormState
  currentDevice: CurrentDevice
  selectedActionId: string | null
  secrets: LocalSecretMetadata[]
  onChange(value: BrowserTaskFormState): void
  onSelectAction(actionId: string | null): void
  onSubmit(event: FormEvent<HTMLFormElement>): void
}

export function ActionWorkspacePanel({
  actions,
  createForm,
  currentDevice,
  onChange,
  onSelectAction,
  onSubmit,
  secrets,
  selectedActionId,
}: ActionWorkspacePanelProps) {
  const selectedAction =
    actions.find((action) => action.id === selectedActionId) ?? null

  return (
    <section className="mode-panel action-workspace" aria-label="Action 편집">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Actions</p>
          <h2>{selectedAction ? selectedAction.name : '새 Action'}</h2>
        </div>
        <button
          aria-label="새 Action"
          type="button"
          onClick={() => onSelectAction(null)}
        >
          +
        </button>
      </div>
      <div className="editor-detail">
          {selectedAction ? (
            <>
              <div className="section-heading compact-heading">
                <div>
                  <p className="eyebrow">{getActionTypeLabel(selectedAction.type)}</p>
                  <h3>{selectedAction.name}</h3>
                </div>
              </div>
              <dl className="detail-list">
                <DetailItem label="Action ID" value={selectedAction.id} />
                <DetailItem
                  label="수정 시간"
                  value={formatDate(selectedAction.updatedAt)}
                />
                <DetailItem
                  label="Secret"
                  value={`${selectedAction.secretRefs?.length ?? 0}개`}
                />
                <DetailItem
                  label="입력 / 출력"
                  value={`${selectedAction.inputSchema?.length ?? 0} / ${
                    selectedAction.outputSchema?.length ?? 0
                  }`}
                />
              </dl>
            </>
          ) : (
            <CreateTaskPanel
              createForm={createForm}
              currentDevice={currentDevice}
              secrets={secrets}
              onCancel={() => onSelectAction(actions[0]?.id ?? null)}
              onChange={onChange}
              onSubmit={onSubmit}
            />
          )}
      </div>
    </section>
  )
}

export type WorkflowActionListProps = {
  actions: ActionDefinition[]
  workflow: WorkflowDefinition | null
}

export function WorkflowActionList({ actions, workflow }: WorkflowActionListProps) {
  if (!workflow) {
    return (
      <div className="empty-state-action">
        <p className="empty-state">선택된 Workflow가 없습니다.</p>
        <button type="button">+</button>
      </div>
    )
  }

  const actionMap = new Map(actions.map((action) => [action.id, action]))
  const sortedActionRefs = [...workflow.actionRefs].sort(
    (left, right) => left.order - right.order,
  )

  return (
    <div className="workflow-action-list">
      {sortedActionRefs.length === 0 ? (
        <p className="empty-state">이 Workflow에는 아직 Action이 없습니다.</p>
      ) : (
        sortedActionRefs.map((actionRef, index) => {
          const action = actionMap.get(actionRef.actionId)

          return (
            <div className="workflow-action-row" key={actionRef.id}>
              <span>{index + 1}</span>
              <div>
                <strong>{action?.name ?? actionRef.actionId}</strong>
                <small>
                  {action ? getActionTypeLabel(action.type) : '연결 끊김'}
                </small>
              </div>
              <label className="toggle-switch">
                <input checked={actionRef.enabled} readOnly type="checkbox" />
                <span />
              </label>
              <button className="icon-button" disabled type="button">
                ↑
              </button>
              <button className="icon-button" disabled type="button">
                ↓
              </button>
            </div>
          )
        })
      )}
    </div>
  )
}
