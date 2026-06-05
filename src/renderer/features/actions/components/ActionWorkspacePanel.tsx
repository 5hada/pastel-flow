import { Button, Card, ListBox, Select } from '@heroui/react'
import { useEffect, useState, type FormEvent } from 'react'
import type { CurrentDevice } from '../../../../shared/devices'
import type { LocalSecretMetadata } from '../../../../shared/secrets'
import type {
  BrowserProfilePreset,
  DeveloperVisibilitySettings,
  WorkspaceFolder,
} from '../../../../shared/settings'
import {
  getActionInputSchema,
  getActionOutputSchema,
  type ActionDefinition,
  type ActionIOField,
} from '../../../../shared/actions'
import type { WorkflowDefinition } from '../../../../shared/workflows'
import type { UrlGroup } from '../../../../shared/urlGroups'
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
import { getCommonIcon } from '../../../shared/assets/icon'
import { CollectionListPanel } from '../../../shared/components/CollectionListPanel'
import { getWorkspaceFolderPathLabel } from '../../../shared/utils/workspaceFolderLabels'

export type ActionWorkspacePanelProps = {
  actions: ActionDefinition[]
  createForm: BrowserTaskFormState
  currentDevice: CurrentDevice
  developerVisibility: DeveloperVisibilitySettings
  profilePresets: BrowserProfilePreset[]
  urlGroups: UrlGroup[]
  selectedCollectionFolderId: string
  selectedActionId: string | null
  secrets: LocalSecretMetadata[]
  workspaceFolderAssignments: Record<string, string>
  workspaceFolders: WorkspaceFolder[]
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
  urlGroups,
  selectedCollectionFolderId,
  selectedActionId,
  workspaceFolderAssignments,
  workspaceFolders,
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
  const [editingActionNameId, setEditingActionNameId] = useState<string | null>(
    null,
  )
  const [editName, setEditName] = useState('')
  const [isCreatingAction, setIsCreatingAction] = useState(false)
  const editableTaskType = selectedAction
    ? getTaskTypeForActionType(selectedAction.type)
    : null
  const visibleActions = filterByFolder(
    actions,
    selectedCollectionFolderId,
    workspaceFolderAssignments,
  )
  const selectedActionInputSchema = selectedAction
    ? getActionInputSchema(selectedAction)
    : []
  const selectedActionOutputSchema = selectedAction
    ? getActionOutputSchema(selectedAction)
    : []

  useEffect(() => {
    setEditForm(selectedAction ? createActionEditForm(selectedAction) : null)
    setEditingActionNameId(null)
    setEditName(selectedAction?.name ?? '')
    if (selectedAction) {
      setIsCreatingAction(false)
    }
  }, [selectedAction])

  async function handleRenameAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedAction || isSelectedActionLocked) {
      return
    }

    const trimmedName = editName.trim()
    if (!trimmedName || trimmedName === selectedAction.name) {
      setEditingActionNameId(null)
      setEditName(selectedAction.name)
      return
    }

    await onUpdateAction(selectedAction.id, {
      name: trimmedName,
    })
    setEditForm((currentForm) =>
      currentForm ? { ...currentForm, name: trimmedName } : currentForm,
    )
    setEditingActionNameId(null)
  }

  if (!selectedAction && !isCreatingAction) {
    return (
      <CollectionListPanel
        emptyText="표시할 Action이 없습니다."
        eyebrow="ACTIONS"
        folderLabel={getWorkspaceFolderPathLabel(
          selectedCollectionFolderId,
          workspaceFolders,
        )}
        headerAction={
          <Button
            aria-label="Action 추가"
            isIconOnly
            variant="ghost"
            type="button"
            onClick={() => setIsCreatingAction(true)}
          >
            {getCommonIcon('add')}
          </Button>
        }
        items={visibleActions.map((action) => ({
          id: action.id,
          title: action.name,
          meta: getActionTypeLabel(action.type),
          message: `${action.secretRefs?.length ?? 0}개 Secret`,
        }))}
        title="Action 목록"
        onEdit={onSelectAction}
      />
    )
  }

  return (
    <Card
      className={`mode-panel action-workspace${isSelectedActionLocked ? ' is-edit-locked' : ''}`}
      aria-label="Action 편집"
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Actions</p>
          {selectedAction && editingActionNameId === selectedAction.id ? (
            <form className="workflow-title-form" onSubmit={handleRenameAction}>
              <input
                aria-label="Action 이름"
                disabled={isSelectedActionLocked}
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
              />
              <Button
                isDisabled={isSelectedActionLocked || !editName.trim()}
                variant="primary"
                type="submit"
              >
                저장
              </Button>
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  setEditingActionNameId(null)
                  setEditName(selectedAction.name)
                }}
              >
                취소
              </Button>
            </form>
          ) : selectedAction ? (
            <div className="workflow-title-row">
              <h2>{selectedAction.name}</h2>
              <Button
                aria-label="Action 이름 변경"
                isDisabled={isSelectedActionLocked}
                isIconOnly
                variant="ghost"
                type="button"
                onClick={() => {
                  if (isSelectedActionLocked) {
                    return
                  }
                  setEditingActionNameId(selectedAction.id)
                  setEditName(selectedAction.name)
                }}
              >
                {getCommonIcon('edit')}
              </Button>
            </div>
          ) : (
            <h2>새 Action</h2>
          )}
        </div>
        {selectedAction || isCreatingAction ? (
          <Button
            aria-label="목록으로 돌아가기"
            isIconOnly
            variant="ghost"
            type="button"
            onClick={() => {
              setIsCreatingAction(false)
              onSelectAction(null)
            }}
          >
            {getCommonIcon('close')}
          </Button>
        ) : null}
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
                      urlGroups={urlGroups}
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
                    value={`${selectedActionInputSchema.length} / ${
                      selectedActionOutputSchema.length
                    }`}
                  />
                ) : null}
              </dl>
              <ActionSchemaDetail
                inputSchema={selectedActionInputSchema}
                outputSchema={selectedActionOutputSchema}
              />
            </div>
          ) : isCreatingAction ? (
            <CreateTaskPanel
              createForm={createForm}
              currentDevice={currentDevice}
              isEmbedded
              profilePresets={profilePresets}
              urlGroups={urlGroups}
              secrets={secrets}
              onCancel={() => setIsCreatingAction(false)}
              onChange={onChange}
              onSubmit={onSubmit}
            />
          ) : null}
      </div>
    </Card>
  )
}

function ActionSchemaDetail({
  inputSchema,
  outputSchema,
}: {
  inputSchema: ActionIOField[]
  outputSchema: ActionIOField[]
}) {
  return (
    <section className="action-schema-detail" aria-label="Action 입출력">
      <h3>입출력</h3>
      <div className="action-schema-columns">
        <ActionSchemaList fields={inputSchema} title="Input" />
        <ActionSchemaList fields={outputSchema} title="Output" />
      </div>
    </section>
  )
}

function ActionSchemaList({
  fields,
  title,
}: {
  fields: ActionIOField[]
  title: string
}) {
  return (
    <div className="action-schema-list">
      <strong>{title}</strong>
      {fields.length === 0 ? (
        <small>없음</small>
      ) : (
        fields.map((field) => (
          <span className="schema-pill" key={field.id}>
            {field.id}:{field.type}
            {field.required ? ' *' : ''}
          </span>
        ))
      )}
    </div>
  )
}

function filterByFolder<TItem extends { id: string }>(
  items: TItem[],
  folderId: string,
  assignments: Record<string, string>,
): TItem[] {
  if (folderId === 'all') {
    return items
  }

  if (folderId === 'favorites') {
    return []
  }

  return items.filter((item) => assignments[item.id] === folderId)
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <Card className="detail-item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </Card>
  )
}
