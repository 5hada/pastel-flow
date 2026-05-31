import { useEffect, useState, type FormEvent } from 'react'
import type { CurrentDevice } from '../../../../shared/devices'
import type { LocalSecretMetadata } from '../../../../shared/secrets'
import type {
  BrowserProfilePreset,
  DeveloperVisibilitySettings,
} from '../../../../shared/settings'
import type { ActionDefinition, WorkflowDefinition } from '../../../../shared/tasks'
import {
  taskTypeOptions,
  type BrowserTaskFormState,
} from '../../taskFormState'
import {
  createActionEditForm,
  createActionUpdateInputFromForm,
  getTaskTypeForActionType,
  parseLines,
} from '../../utils/taskFormTransforms'
import { CreateTaskPanel } from '../tasks/CreateTaskPanel'
import { DetailItem } from '../tasks/DetailItem'
import { TaskTypeConfigFields } from '../tasks/TaskFormFields'
import { getActionTypeLabel, formatDate } from '../../utils/viewLabels'

export type ActionWorkspacePanelProps = {
  actions: ActionDefinition[]
  createForm: BrowserTaskFormState
  currentDevice: CurrentDevice
  developerVisibility: DeveloperVisibilitySettings
  profilePresets: BrowserProfilePreset[]
  selectedActionId: string | null
  secrets: LocalSecretMetadata[]
  onChange(value: BrowserTaskFormState): void
  onDeleteAction(actionId: string): Promise<void>
  onSelectAction(actionId: string | null): void
  onSubmit(event: FormEvent<HTMLFormElement>): void
  onUpdateAction(
    actionId: string,
    input: Partial<ActionDefinition>,
  ): Promise<void>
}

export function ActionWorkspacePanel({
  actions,
  createForm,
  currentDevice,
  developerVisibility,
  onChange,
  onDeleteAction,
  onSelectAction,
  onSubmit,
  onUpdateAction,
  secrets,
  profilePresets,
  selectedActionId,
}: ActionWorkspacePanelProps) {
  const selectedAction =
    actions.find((action) => action.id === selectedActionId) ?? null
  const [editForm, setEditForm] = useState<BrowserTaskFormState | null>(null)
  const editableTaskType = selectedAction
    ? getTaskTypeForActionType(selectedAction.type)
    : null

  useEffect(() => {
    setEditForm(selectedAction ? createActionEditForm(selectedAction) : null)
  }, [selectedAction])

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
            <div>
              {editForm ? (
                <form
                  className="task-form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (!editForm.name.trim()) {
                      return
                    }
                    void onUpdateAction(
                      selectedAction.id,
                      selectedAction.type === 'tool_action'
                        ? {
                            name: editForm.name.trim(),
                            secretRefs: parseLines(editForm.secretRefIds).map(
                              (secretId) => ({
                                id: secretId,
                                scope: 'local_device',
                              }),
                            ),
                          }
                        : createActionUpdateInputFromForm(editForm, selectedAction),
                    )
                  }}
                >
                  <div className="form-grid">
                    <label>
                      이름
                      <input
                        value={editForm.name}
                        onChange={(event) =>
                          setEditForm({
                            ...editForm,
                            name: event.target.value,
                          })
                        }
                      />
                    </label>
                    {editableTaskType ? (
                      <label>
                        Action 타입
                        <select
                          value={editForm.taskType}
                          onChange={(event) =>
                            setEditForm({
                              ...editForm,
                              taskType: event.target
                                .value as BrowserTaskFormState['taskType'],
                            })
                          }
                        >
                          {taskTypeOptions.map((taskType) => (
                            <option key={taskType} value={taskType}>
                              {getActionTypeLabel(
                                createActionUpdateInputFromForm(
                                  { ...editForm, taskType },
                                  selectedAction,
                                ).type ?? selectedAction.type,
                              )}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </div>
                  {editableTaskType ? (
                    <TaskTypeConfigFields
                      form={editForm}
                      profilePresets={profilePresets}
                      onChange={setEditForm}
                    />
                  ) : (
                    <p className="muted-text">
                      Tool Action 설정은 도구 모듈 정의를 기준으로 관리됩니다.
                    </p>
                  )}
                  <label>
                    Secret 참조
                    <select
                      multiple
                      value={parseLines(editForm.secretRefIds)}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          secretRefIds: Array.from(event.target.selectedOptions)
                            .map((option) => option.value)
                            .join('\n'),
                        })
                      }
                    >
                      {secrets.map((secret) => (
                        <option key={secret.id} value={secret.id}>
                          {secret.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="form-actions">
                    <button type="submit">저장</button>
                    <button
                      className="danger-button"
                      type="button"
                      onClick={() => void onDeleteAction(selectedAction.id)}
                    >
                      삭제
                    </button>
                  </div>
                </form>
              ) : null}
              <dl className="detail-list">
                {developerVisibility.showIds ? (
                  <DetailItem label="Action ID" value={selectedAction.id} />
                ) : null}
                <DetailItem
                  label="Action 타입"
                  value={getActionTypeLabel(selectedAction.type)}
                />
                <DetailItem
                  label="수정 시간"
                  value={formatDate(selectedAction.updatedAt)}
                />
                <DetailItem
                  label="Secret"
                  value={`${selectedAction.secretRefs?.length ?? 0}개`}
                />
                {developerVisibility.showToolMetadata ? (
                  <DetailItem
                    label="입력 / 출력"
                    value={`${selectedAction.inputSchema?.length ?? 0} / ${
                      selectedAction.outputSchema?.length ?? 0
                    }`}
                  />
                ) : null}
              </dl>
            </div>
          ) : (
            <CreateTaskPanel
              createForm={createForm}
              currentDevice={currentDevice}
              isEmbedded
              profilePresets={profilePresets}
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
  onAddAction(actionId: string): void
  onMoveAction(actionRefId: string, position: 'top' | 'bottom'): void
  onRemoveAction(actionRefId: string): void
  onReorderActions(actionRefIds: string[]): void
  onToggleAction(actionRefId: string): void
}

export function WorkflowActionList({
  actions,
  onAddAction,
  onMoveAction,
  onReorderActions,
  onRemoveAction,
  onToggleAction,
  workflow,
}: WorkflowActionListProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [actionTypeFilter, setActionTypeFilter] = useState<ActionDefinition['type'] | 'all'>(
    'all',
  )
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!isPickerOpen) {
      return undefined
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsPickerOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isPickerOpen])

  if (!workflow) {
    return (
      <div className="empty-state-action">
        <p className="empty-state">선택된 Workflow가 없습니다.</p>
      </div>
    )
  }

  const actionMap = new Map(actions.map((action) => [action.id, action]))
  const sortedActionRefs = [...workflow.actionRefs].sort(
    (left, right) => left.order - right.order,
  )
  const actionTypes = Array.from(new Set(actions.map((action) => action.type)))
  const filteredActions = actions.filter((action) => {
    const matchesType =
      actionTypeFilter === 'all' || action.type === actionTypeFilter
    const normalizedQuery = query.trim().toLowerCase()
    const matchesQuery =
      !normalizedQuery ||
      action.name.toLowerCase().includes(normalizedQuery) ||
      getActionTypeLabel(action.type).toLowerCase().includes(normalizedQuery)

    return matchesType && matchesQuery
  })

  return (
    <div className="workflow-action-list">
      <div className="detail-actions">
        <button type="button" onClick={() => setIsPickerOpen(true)}>
          Action 추가
        </button>
      </div>
      {sortedActionRefs.length === 0 ? (
        <p className="empty-state">이 Workflow에는 아직 Action이 없습니다.</p>
      ) : (
        sortedActionRefs.map((actionRef, index) => {
          const action = actionMap.get(actionRef.actionId)

          return (
            <div
              className="workflow-action-row"
              draggable
              key={actionRef.id}
              onDragStart={(event) => {
                event.dataTransfer.setData('text/plain', actionRef.id)
                event.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                const sourceActionRefId = event.dataTransfer.getData('text/plain')
                if (!sourceActionRefId || sourceActionRefId === actionRef.id) {
                  return
                }
                onReorderActions(
                  moveActionRefByDrop(
                    sortedActionRefs.map((currentActionRef) => currentActionRef.id),
                    sourceActionRefId,
                    actionRef.id,
                  ),
                )
              }}
            >
              <span>{index + 1}</span>
              <div>
                <strong>{action?.name ?? actionRef.actionId}</strong>
                <small>
                  {action ? getActionTypeLabel(action.type) : '연결 끊김'}
                </small>
              </div>
              <label className="toggle-switch">
                <input
                  checked={actionRef.enabled}
                  type="checkbox"
                  onChange={() => onToggleAction(actionRef.id)}
                />
                <span />
              </label>
              <button
                className="icon-button"
                disabled={index === 0}
                type="button"
                onClick={() => onMoveAction(actionRef.id, 'top')}
              >
                ⇤
              </button>
              <button
                className="icon-button"
                disabled={index === sortedActionRefs.length - 1}
                type="button"
                onClick={() => onMoveAction(actionRef.id, 'bottom')}
              >
                ⇥
              </button>
              <button
                className="icon-button danger-button"
                type="button"
                onClick={() => onRemoveAction(actionRef.id)}
              >
                ×
              </button>
            </div>
          )
        })
      )}
      {isPickerOpen ? (
        <div className="action-picker-backdrop" role="presentation">
          <section
            aria-label="Action 추가"
            className="action-picker-dialog"
            role="dialog"
            aria-modal="true"
          >
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Add actions</p>
                <h2>Action 추가</h2>
              </div>
              <button
                aria-label="닫기"
                className="icon-button"
                type="button"
                onClick={() => setIsPickerOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="action-picker-controls">
              <input
                autoFocus
                placeholder="키워드 검색"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <select
                value={actionTypeFilter}
                onChange={(event) =>
                  setActionTypeFilter(
                    event.target.value as ActionDefinition['type'] | 'all',
                  )
                }
              >
                <option value="all">전체</option>
                {actionTypes.map((actionType) => (
                  <option key={actionType} value={actionType}>
                    {getActionTypeLabel(actionType)}
                  </option>
                ))}
              </select>
            </div>
            <div className="action-picker-list">
              {filteredActions.map((action) => (
                <div className="action-picker-row" key={action.id}>
                  <div>
                    <strong>{action.name}</strong>
                    <small>{getActionTypeLabel(action.type)}</small>
                  </div>
                  <button type="button" onClick={() => onAddAction(action.id)}>
                    추가
                  </button>
                </div>
              ))}
              {filteredActions.length === 0 ? (
                <p className="empty-state">조건에 맞는 Action이 없습니다.</p>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

function moveActionRefByDrop(
  ids: string[],
  sourceId: string,
  targetId: string,
): string[] {
  const nextIds = ids.filter((id) => id !== sourceId)
  const targetIndex = nextIds.indexOf(targetId)

  if (targetIndex === -1) {
    return ids
  }

  nextIds.splice(targetIndex, 0, sourceId)
  return nextIds
}
