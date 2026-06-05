import { Button, Card, Input, ListBox, Select } from '@heroui/react'
import { useEffect, useState, type FormEvent } from 'react'
import type { CurrentDevice } from '../../../../shared/devices'
import type { LocalSecretMetadata } from '../../../../shared/secrets'
import type {
  BrowserProfilePreset,
  DeveloperVisibilitySettings,
} from '../../../../shared/settings'
import type { ActionDefinition } from '../../../../shared/actions'
import type { WorkflowDefinition } from '../../../../shared/workflows'
import {
  taskTypeOptions,
  type BrowserTaskFormState,
} from '../../../shared/state/taskFormState'
import {
  createActionEditForm,
  createActionUpdateInputFromForm,
  getTaskTypeForActionType,
  parseLines,
} from '../../../shared/utils/taskFormTransforms'
import { CreateTaskPanel } from './CreateTaskPanel'
import { TaskTypeConfigFields } from '../../../shared/task-fields'
import { getActionTypeLabel, formatDate } from '../../../shared/utils/viewLabels'

export type ActionWorkspacePanelProps = {
  actions: ActionDefinition[]
  createForm: BrowserTaskFormState
  currentDevice: CurrentDevice
  developerVisibility: DeveloperVisibilitySettings
  profilePresets: BrowserProfilePreset[]
  selectedActionId: string | null
  secrets: LocalSecretMetadata[]
  workflows: WorkflowDefinition[]
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
  workflows,
}: ActionWorkspacePanelProps) {
  const selectedAction =
    actions.find((action) => action.id === selectedActionId) ?? null
  const isSelectedActionLocked =
    selectedAction !== null &&
    workflows.some(
      (workflow) =>
        workflow.state.status === 'running' &&
        workflow.actionRefs.some(
          (actionRef) => actionRef.actionId === selectedAction.id,
        ),
    )
  const [editForm, setEditForm] = useState<BrowserTaskFormState | null>(null)
  const editableTaskType = selectedAction
    ? getTaskTypeForActionType(selectedAction.type)
    : null

  useEffect(() => {
    setEditForm(selectedAction ? createActionEditForm(selectedAction) : null)
  }, [selectedAction])

  return (
    <Card
      className={`mode-panel action-workspace${isSelectedActionLocked ? ' is-edit-locked' : ''}`}
      aria-label="Action 편집"
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Actions</p>
          <h2>{selectedAction ? selectedAction.name : '새 Action'}</h2>
        </div>
        <Button
          aria-label="새 Action"
          isIconOnly
          variant="ghost"
          type="button"
          onClick={() => onSelectAction(null)}
        >
          +
        </Button>
      </div>
      <div className="editor-detail">
          {selectedAction ? (
            <div>
              {editForm ? (
                <form
                  className="task-form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (isSelectedActionLocked) {
                      return
                    }
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
                      <Input
                        disabled={isSelectedActionLocked}
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
                        <Select
                          isDisabled={isSelectedActionLocked}
                          selectedKey={editForm.taskType}
                          onSelectionChange={(key) =>
                            setEditForm({
                              ...editForm,
                              taskType: String(key) as typeof editForm.taskType,
                            })
                          }
                        >
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              {taskTypeOptions.map((taskType) => (
                                <ListBox.Item
                                  id={taskType}
                                  key={taskType}
                                  textValue={getActionTypeLabel(
                                    createActionUpdateInputFromForm(
                                      { ...editForm, taskType },
                                      selectedAction,
                                    ).type ?? selectedAction.type,
                                  )}
                                >
                                  {getActionTypeLabel(
                                    createActionUpdateInputFromForm(
                                      { ...editForm, taskType },
                                      selectedAction,
                                    ).type ?? selectedAction.type,
                                  )}
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      </label>
                    ) : null}
                  </div>
                  {editableTaskType ? (
                    <TaskTypeConfigFields
                      form={editForm}
                      isDisabled={isSelectedActionLocked}
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
                    <Select
                      isDisabled={isSelectedActionLocked}
                      selectionMode="multiple"
                      value={parseLines(editForm.secretRefIds)}
                      onChange={(keys) =>
                        setEditForm({
                          ...editForm,
                          secretRefIds: Array.from(keys).map(String).join('\n'),
                        })
                      }
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox selectionMode="multiple">
                          {secrets.map((secret) => (
                            <ListBox.Item
                              id={secret.id}
                              key={secret.id}
                              textValue={secret.name}
                            >
                              {secret.name}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </label>
                  <div className="form-actions">
                    <Button
                      isDisabled={isSelectedActionLocked}
                      variant="primary"
                      type="submit"
                    >
                      저장
                    </Button>
                    <Button
                      className="danger-button"
                      isDisabled={isSelectedActionLocked}
                      variant="danger"
                      type="button"
                      onClick={() => void onDeleteAction(selectedAction.id)}
                    >
                      삭제
                    </Button>
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
    </Card>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <Card className="detail-item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </Card>
  )
}
