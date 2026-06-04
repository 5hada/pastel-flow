import { Button, Card } from '@heroui/react'
import {Pencil} from '@gravity-ui/icons';
import type {
  BrowserProfilePreset,
  DeveloperVisibilitySettings,
} from '../../../../shared/settings'
import {
  getDeviceExecutionPolicyLabel,
  getDeviceVisibilityPolicyLabel,
} from '../../../../shared/devices'
import type { ActionDefinition } from '../../../../shared/actions'
import type { WorkflowDefinition } from '../../../../shared/workflows'
import type { WorkflowRunEvent } from '../../../../shared/runStatus'
import { WorkflowRunEventsPanel } from './WorkflowRunEventsPanel'
import { WorkflowActionList } from './WorkflowActionList'
import {
  formatDate,
  getTaskScheduleLabel,
  getTaskStatusLabel,
} from '../../../shared/utils/viewLabels'
import { DetailItem } from '../../../shared/components/DetailItem'

export type EditWorkspaceProps = {
  actions: ActionDefinition[]
  developerVisibility: DeveloperVisibilitySettings
  isLoading: boolean
  profilePresets: BrowserProfilePreset[]
  selectedWorkflowId: string | null
  workflowRunEvents: WorkflowRunEvent[]
  workflows: WorkflowDefinition[]
  onCreateWorkflow(): Promise<void>
  onConfirmDeleteWorkflow(workflowId: string): Promise<void>
  onUpdateWorkflow(
    workflowId: string,
    input: Partial<WorkflowDefinition>,
  ): Promise<void>
}

export function EditWorkspace({
  actions,
  developerVisibility,
  isLoading,
  onConfirmDeleteWorkflow,
  onCreateWorkflow,
  onUpdateWorkflow,
  selectedWorkflowId,
  workflowRunEvents,
  workflows,
}: EditWorkspaceProps) {
  const selectedWorkflow =
    workflows.find((workflow) => workflow.id === selectedWorkflowId) ?? null

  if (isLoading) {
    return (
      <Card className="mode-panel">
        <p className="empty-state">작업을 불러오는 중입니다.</p>
      </Card>
    )
  }

  if (!selectedWorkflow) {
    return (
      <Card className="mode-panel workflow-empty-panel" aria-label="Workflow 선택">
        <div className="empty-state empty-state-action">
          <div>
            <p className="eyebrow">Workflows</p>
            <h2>Workflow를 선택하세요</h2>
          </div>
          <p>좌측 패널에서 Workflow를 선택하거나 새 Workflow를 만드세요.</p>
          <Button
            variant="primary"
            type="button"
            onClick={() => void onCreateWorkflow()}
          >
            새 Workflow
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <section aria-label="기존 작업 수정">
      <Card className="mode-panel workflow-builder" aria-label="Workflow 작성">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Workflows</p>
            <div className='grid-cols-2'>
              <h2>{selectedWorkflow.name}</h2>
              <Button
                isIconOnly
                variant="ghost"
                type="button"
                onClick={() => void{}}
              >
                <Pencil/>
              </Button>
            </div>
          </div>
          <Button
            aria-label="새 Workflow"
            isIconOnly
            variant="ghost"
            type="button"
            onClick={() => void onCreateWorkflow()}
          >
            +
          </Button>
        </div>
        <div className="editor-detail">
            <WorkflowActionList
              actions={actions}
              workflow={selectedWorkflow}
              onAddAction={(actionId) => {
                if (!selectedWorkflow) {
                  return
                }
                void onUpdateWorkflow(selectedWorkflow.id, {
                  actionRefs: [
                    ...selectedWorkflow.actionRefs,
                    {
                      id: crypto.randomUUID(),
                      actionId,
                      order: selectedWorkflow.actionRefs.length,
                      enabled: true,
                    },
                  ],
                })
              }}
              onMoveAction={(actionRefId, direction) => {
                if (!selectedWorkflow) {
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
                if (!selectedWorkflow) {
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
                if (!selectedWorkflow) {
                  return
                }
                void onUpdateWorkflow(selectedWorkflow.id, {
                  actionRefs: selectedWorkflow.actionRefs.filter(
                    (actionRef) => actionRef.id !== actionRefId,
                  ),
                })
              }}
              onToggleAction={(actionRefId) => {
                if (!selectedWorkflow) {
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
