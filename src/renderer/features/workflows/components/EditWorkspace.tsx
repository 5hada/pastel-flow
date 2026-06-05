import { Button, Card } from '@heroui/react'
import { useEffect, useState, type FormEvent } from 'react'
import type {
  BrowserProfilePreset,
  DeveloperVisibilitySettings,
  WorkspaceFolder,
} from '../../../../shared/settings'
import {
  getDeviceExecutionPolicyLabel,
  getDeviceVisibilityPolicyLabel,
} from '../../../../shared/devices'
import type {
  ActionDefinition,
  TransformActionConfig,
} from '../../../../shared/actions'
import type { WorkflowDefinition } from '../../../../shared/workflows'
import type {
  ActionRun,
  WorkflowRun,
  WorkflowRunEvent,
} from '../../../../shared/runStatus'
import {
  canMapActionField,
  getActionInputSchema,
  getActionOutputSchema,
} from '../../../../shared/actions'
import type { WorkflowArtifact } from '../../../../shared/artifacts'
import { WorkflowRunEventsPanel } from './WorkflowRunEventsPanel'
import { WorkflowRunsPanel } from './WorkflowRunsPanel'
import { WorkflowActionList } from './WorkflowActionList'
import { CollectionListPanel } from '../../../shared/components/CollectionListPanel'
import { getCommonIcon } from '../../../shared/assets/icon'
import {
  formatDate,
  getTaskScheduleLabel,
  getTaskStatusLabel,
} from '../../../shared/utils/viewLabels'
import { DetailItem } from '../../../shared/components/DetailItem'
import { getWorkspaceFolderPathLabel } from '../../../shared/utils/workspaceFolderLabels'

export type EditWorkspaceProps = {
  actions: ActionDefinition[]
  defaultWorkflowName: string
  developerVisibility: DeveloperVisibilitySettings
  isLoading: boolean
  profilePresets: BrowserProfilePreset[]
  selectedCollectionFolderId: string
  selectedWorkflowId: string | null
  runningWorkflowId: string | null
  actionRuns: ActionRun[]
  selectedWorkflowRunId: string | null
  workflowArtifacts: WorkflowArtifact[]
  workflowRuns: WorkflowRun[]
  workflowRunEvents: WorkflowRunEvent[]
  workspaceFolderAssignments: Record<string, string>
  workspaceFolders: WorkspaceFolder[]
  workflows: WorkflowDefinition[]
  onCreateTransformAction(
    mode: TransformActionConfig['mode'],
  ): Promise<ActionDefinition | null>
  onCreateWorkflow(name?: string): Promise<void>
  onConfirmDeleteWorkflow(workflowId: string): Promise<void>
  onStartCreateWorkflow(): void
  onSelectWorkflow(workflowId: string): void
  onSelectWorkflowRun(runId: string): void
  onUpdateWorkflow(
    workflowId: string,
    input: Partial<WorkflowDefinition>,
  ): Promise<void>
  onUpdateAction(
    actionId: string,
    input: Partial<ActionDefinition>,
  ): Promise<void>
}

export function EditWorkspace({
  actions,
  defaultWorkflowName,
  developerVisibility,
  isLoading,
  onConfirmDeleteWorkflow,
  onCreateTransformAction,
  onCreateWorkflow,
  onSelectWorkflow,
  onStartCreateWorkflow,
  onUpdateWorkflow,
  onUpdateAction,
  runningWorkflowId,
  actionRuns,
  selectedCollectionFolderId,
  selectedWorkflowRunId,
  selectedWorkflowId,
  onSelectWorkflowRun,
  workflowArtifacts,
  workflowRunEvents,
  workflowRuns,
  workspaceFolderAssignments,
  workspaceFolders,
  workflows,
}: EditWorkspaceProps) {
  const selectedWorkflow =
    workflows.find((workflow) => workflow.id === selectedWorkflowId) ?? null
  const isSelectedWorkflowLocked =
    selectedWorkflow?.state.status === 'running' ||
    selectedWorkflow?.id === runningWorkflowId
  const [createName, setCreateName] = useState(defaultWorkflowName)
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false)
  const visibleWorkflows = filterByFolder(
    workflows,
    selectedCollectionFolderId,
    workspaceFolderAssignments,
  )

  useEffect(() => {
    if (!selectedWorkflow) {
      setCreateName(defaultWorkflowName)
      setEditingWorkflowId(null)
      setEditName('')
      return
    }

    setEditingWorkflowId(null)
    setEditName(selectedWorkflow.name)
    setIsCreatingWorkflow(false)
  }, [defaultWorkflowName, selectedWorkflow])

  async function handleCreateWorkflow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = createName.trim()

    if (!trimmedName) {
      return
    }

    await onCreateWorkflow(trimmedName)
  }

  async function handleRenameWorkflow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedWorkflow || isSelectedWorkflowLocked) {
      return
    }

    const trimmedName = editName.trim()
    if (!trimmedName || trimmedName === selectedWorkflow.name) {
      setEditingWorkflowId(null)
      setEditName(selectedWorkflow.name)
      return
    }

    await onUpdateWorkflow(selectedWorkflow.id, {
      name: trimmedName,
    })
    setEditingWorkflowId(null)
  }

  if (isLoading) {
    return (
      <Card className="mode-panel">
        <p className="empty-state">작업을 불러오는 중입니다.</p>
      </Card>
    )
  }

  if (!selectedWorkflow && isCreatingWorkflow) {
    return (
      <Card className="mode-panel workflow-empty-panel" aria-label="Workflow 생성">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Workflows</p>
            <h2>새 Workflow</h2>
          </div>
          <Button
            aria-label="목록으로 돌아가기"
            isIconOnly
            variant="ghost"
            type="button"
            onClick={() => setIsCreatingWorkflow(false)}
          >
            {getCommonIcon('close')}
          </Button>
        </div>
        <div className="empty-state empty-state-action">
          <form className="workflow-name-form" onSubmit={handleCreateWorkflow}>
            <label>
              이름
              <input
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                placeholder="Workflow 이름"
              />
            </label>
            <Button
              variant="primary"
              type="submit"
              isDisabled={!createName.trim()}
            >
              생성
            </Button>
          </form>
        </div>
      </Card>
    )
  }

  if (!selectedWorkflow) {
    return (
      <CollectionListPanel
        emptyText="표시할 Workflow가 없습니다."
        eyebrow="WORKFLOWS"
        folderLabel={getWorkspaceFolderPathLabel(
          selectedCollectionFolderId,
          workspaceFolders,
        )}
        headerAction={
          <Button
            aria-label="Workflow 추가"
            isIconOnly
            variant="ghost"
            type="button"
            onClick={() => setIsCreatingWorkflow(true)}
          >
            {getCommonIcon('add')}
          </Button>
        }
        items={visibleWorkflows.map((workflow) => ({
          id: workflow.id,
          title: workflow.name,
          meta: `Action ${workflow.actionRefs.length}개 · ${getTaskStatusLabel(
            workflow.state.status,
          )}`,
          message:
            workflow.state.lastError ??
            workflow.state.lastMessage ??
            '아직 실행 결과가 없습니다.',
        }))}
        title="Workflow 목록"
        onEdit={onSelectWorkflow}
      />
    )
  }

  return (
    <section aria-label="기존 작업 수정">
      <Card
        className={`mode-panel workflow-builder${isSelectedWorkflowLocked ? ' is-edit-locked' : ''}`}
        aria-label="Workflow 작성"
      >
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Workflows</p>
            {editingWorkflowId === selectedWorkflow.id ? (
              <form
                className="workflow-title-form"
                onSubmit={handleRenameWorkflow}
              >
                <input
                  aria-label="Workflow 이름"
                  value={editName}
                  disabled={isSelectedWorkflowLocked}
                  onChange={(event) => setEditName(event.target.value)}
                />
                <Button
                  variant="primary"
                  type="submit"
                  isDisabled={isSelectedWorkflowLocked || !editName.trim()}
                >
                  저장
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    setEditingWorkflowId(null)
                    setEditName(selectedWorkflow.name)
                  }}
                >
                  취소
                </Button>
              </form>
            ) : (
              <div className="workflow-title-row">
                <h2>{selectedWorkflow.name}</h2>
                <Button
                  aria-label="Workflow 이름 변경"
                  isIconOnly
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    if (!isSelectedWorkflowLocked) {
                      setEditingWorkflowId(selectedWorkflow.id)
                      setEditName(selectedWorkflow.name)
                    }
                  }}
                  isDisabled={isSelectedWorkflowLocked}
                >
                  {getCommonIcon('edit')}
                </Button>
              </div>
            )}
          </div>
          <Button
            aria-label="목록으로 돌아가기"
            isIconOnly
            variant="ghost"
            type="button"
            onClick={onStartCreateWorkflow}
          >
            {getCommonIcon('close')}
          </Button>
        </div>
        <div className="editor-detail">
            <WorkflowActionList
              actions={actions}
              workflow={selectedWorkflow}
              isLocked={isSelectedWorkflowLocked}
              onAddAction={(actionId) => {
                if (!selectedWorkflow || isSelectedWorkflowLocked) {
                  return
                }
                const actionRefs = selectedWorkflow.actionRefs
                const actionRefId = crypto.randomUUID()
                void onUpdateWorkflow(selectedWorkflow.id, {
                  actionRefs: [
                    ...actionRefs,
                    {
                      id: actionRefId,
                      actionId,
                      order: actionRefs.length,
                      inputMapping: createAutoInputMapping(
                        actionId,
                        actionRefs,
                        actions,
                      ),
                      enabled: true,
                    },
                  ],
                })
              }}
              onMoveAction={(actionRefId, direction) => {
                if (!selectedWorkflow || isSelectedWorkflowLocked) {
                  return
                }
                void onUpdateWorkflow(selectedWorkflow.id, {
                  actionRefs: moveWorkflowActionRef(
                    selectedWorkflow.actionRefs,
                    actionRefId,
                    direction,
                  ),
                })
              }}
              onReorderActions={(actionRefIds) => {
                if (!selectedWorkflow || isSelectedWorkflowLocked) {
                  return
                }
                void onUpdateWorkflow(selectedWorkflow.id, {
                  actionRefs: reorderWorkflowActionRefs(
                    selectedWorkflow.actionRefs,
                    actionRefIds,
                  ),
                })
              }}
              onRemoveAction={(actionRefId) => {
                if (!selectedWorkflow || isSelectedWorkflowLocked) {
                  return
                }
                void onUpdateWorkflow(selectedWorkflow.id, {
                  actionRefs: selectedWorkflow.actionRefs.filter(
                    (actionRef) => actionRef.id !== actionRefId,
                  ),
                })
              }}
              onUpdateInputMapping={(actionRefId, inputMapping) => {
                if (!selectedWorkflow || isSelectedWorkflowLocked) {
                  return
                }
                void onUpdateWorkflow(selectedWorkflow.id, {
                  actionRefs: selectedWorkflow.actionRefs.map((actionRef) =>
                    actionRef.id === actionRefId
                      ? { ...actionRef, inputMapping }
                      : actionRef,
                  ),
                })
              }}
              onCreateTransformAction={async (mode) => {
                if (!selectedWorkflow || isSelectedWorkflowLocked) {
                  return
                }

                const action = await onCreateTransformAction(mode)
                if (!action) {
                  return
                }

                const actionRefs = selectedWorkflow.actionRefs
                void onUpdateWorkflow(selectedWorkflow.id, {
                  actionRefs: [
                    ...actionRefs,
                    {
                      id: crypto.randomUUID(),
                      actionId: action.id,
                      order: actionRefs.length,
                      inputMapping: createAutoInputMapping(
                        action.id,
                        actionRefs,
                        [...actions, action],
                      ),
                      enabled: true,
                    },
                  ],
                })
              }}
              onUpdateActionConfig={(actionId, config) => {
                void onUpdateAction(actionId, { config })
              }}
              onToggleAction={(actionRefId) => {
                if (!selectedWorkflow || isSelectedWorkflowLocked) {
                  return
                }
                void onUpdateWorkflow(selectedWorkflow.id, {
                  actionRefs: selectedWorkflow.actionRefs.map((actionRef) =>
                    actionRef.id === actionRefId
                      ? { ...actionRef, enabled: !actionRef.enabled }
                      : actionRef,
                  ),
                })
              }}
            />
            <Card className="danger-zone" aria-label="Workflow 삭제">
              <Button
                className="danger-button"
                isDisabled={isSelectedWorkflowLocked}
                variant="danger"
                type="button"
                onClick={() => void onConfirmDeleteWorkflow(selectedWorkflow.id)}
              >
                Workflow 삭제
              </Button>
            </Card>
        </div>
      </Card>

      <Card className="mode-panel" aria-label="선택한 Workflow 상세">
        <dl className="detail-list">
          {developerVisibility.showIds ? (
            <DetailItem label="Workflow ID" value={selectedWorkflow.id} />
          ) : null}
          <DetailItem label="Action" value={`${selectedWorkflow.actionRefs.length}개`} />
          <DetailItem label="예약" value={getTaskScheduleLabel(selectedWorkflow.schedule)} />
          <DetailItem label="상태" value={getTaskStatusLabel(selectedWorkflow.state.status)} />
          <DetailItem label="마지막 실행" value={formatDate(selectedWorkflow.state.endedAt)} />
          <DetailItem
            label="마지막 메시지"
            value={selectedWorkflow.state.lastMessage ?? '아직 없음'}
          />
          <DetailItem label="생성 시간" value={formatDate(selectedWorkflow.createdAt)} />
          <DetailItem label="수정 시간" value={formatDate(selectedWorkflow.updatedAt)} />
          <DetailItem
            label="표시 정책"
            value={getDeviceVisibilityPolicyLabel(selectedWorkflow.permissions.visibility)}
          />
          <DetailItem
            label="실행 정책"
            value={getDeviceExecutionPolicyLabel(selectedWorkflow.permissions.execution)}
          />
        </dl>

        {selectedWorkflow.state.lastError ? (
          <Card className="last-error" aria-label="마지막 오류">
            <h3>마지막 오류</h3>
            <p>{selectedWorkflow.state.lastError}</p>
          </Card>
        ) : null}

        <WorkflowRunsPanel
          actionRuns={actionRuns}
          artifacts={workflowArtifacts}
          runs={workflowRuns}
          selectedRunId={selectedWorkflowRunId}
          onSelectRun={onSelectWorkflowRun}
        />
        <WorkflowRunEventsPanel events={workflowRunEvents} />
      </Card>
    </section>
  )
}

function moveWorkflowActionRef(
  actionRefs: WorkflowDefinition['actionRefs'],
  actionRefId: string,
  position: 'top' | 'bottom',
): WorkflowDefinition['actionRefs'] {
  const sortedActionRefs = [...actionRefs].sort(
    (left, right) => left.order - right.order,
  )
  const index = sortedActionRefs.findIndex(
    (actionRef) => actionRef.id === actionRefId,
  )

  if (index < 0) {
    return sortedActionRefs
  }

  const nextActionRefs = [...sortedActionRefs]
  const [currentActionRef] = nextActionRefs.splice(index, 1)
  if (!currentActionRef) {
    return sortedActionRefs
  }

  if (position === 'top') {
    nextActionRefs.unshift(currentActionRef)
  } else {
    nextActionRefs.push(currentActionRef)
  }

  return nextActionRefs.map((actionRef, currentIndex) => ({
    ...actionRef,
    order: currentIndex,
  }))
}

function reorderWorkflowActionRefs(
  actionRefs: WorkflowDefinition['actionRefs'],
  actionRefIds: string[],
): WorkflowDefinition['actionRefs'] {
  const actionRefMap = new Map(
    actionRefs.map((actionRef) => [actionRef.id, actionRef]),
  )
  const reorderedActionRefs = actionRefIds
    .map((actionRefId) => actionRefMap.get(actionRefId))
    .filter((actionRef): actionRef is WorkflowDefinition['actionRefs'][number] =>
      Boolean(actionRef),
    )
  const reorderedIds = new Set(reorderedActionRefs.map((actionRef) => actionRef.id))
  const retainedActionRefs = [...actionRefs]
    .sort((left, right) => left.order - right.order)
    .filter((actionRef) => !reorderedIds.has(actionRef.id))

  return [...reorderedActionRefs, ...retainedActionRefs]
    .map((actionRef, index) => ({
      ...actionRef,
      order: index,
    }))
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

function createAutoInputMapping(
  actionId: string,
  previousActionRefs: WorkflowDefinition['actionRefs'],
  actions: ActionDefinition[],
): Record<string, string> | undefined {
  const actionMap = new Map(actions.map((action) => [action.id, action]))
  const action = actionMap.get(actionId)
  if (!action) {
    return undefined
  }

  const mapping = Object.fromEntries(
    getActionInputSchema(action).flatMap((inputField) => {
      const candidates = previousActionRefs.flatMap((actionRef) => {
        const sourceAction = actionMap.get(actionRef.actionId)
        if (!sourceAction) {
          return []
        }

        return getActionOutputSchema(sourceAction)
          .filter((outputField) => canMapActionField(outputField, inputField))
          .map((outputField) => `${actionRef.id}.${outputField.id}`)
      })

      return candidates.length === 1 ? [[inputField.id, candidates[0]]] : []
    }),
  )

  return Object.keys(mapping).length > 0 ? mapping : undefined
}
