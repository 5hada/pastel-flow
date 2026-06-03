import { Button, Card } from '@heroui/react'
import type { FormEvent } from 'react'
import type { CurrentDevice } from '../../../../shared/devices'
import type { LocalSecretMetadata } from '../../../../shared/secrets'
import type {
  BrowserProfilePreset,
  DeveloperVisibilitySettings,
} from '../../../../shared/settings'
import {
  getBrowserRunModeLabel,
  normalizeBrowserTabGroupConfig,
  type BrowserTabGroupConfig,
} from '../../../../shared/browsers'
import {
  getDeviceExecutionPolicyLabel,
  getDeviceVisibilityPolicyLabel,
} from '../../../../shared/devices'
import type { ActionDefinition } from '../../../../shared/actions'
import type { WorkflowDefinition } from '../../../../shared/workflows'
import type { TaskTemplate } from '../../../shared/state/taskTypes'
import type { TaskRunEvent } from '../../../../shared/taskRunEvents'
import type { BrowserTaskFormState } from '../../../shared/state/taskFormState'
import { TaskEditPanel } from './TaskEditPanel'
import { TaskRunEventsPanel } from './TaskRunEventsPanel'
import { WorkflowActionList } from '../../actions/components/ActionWorkspacePanel'
import {
  formatDate,
  getBrowserKindLabel,
  getBrowserProfileSourceLabel,
  getTabGroupSnapshotLabel,
  getTaskConfigSummary,
  getTaskScheduleLabel,
  getTaskStatusLabel,
  getTaskTypeLabel,
} from '../../../shared/utils/viewLabels'

export type EditWorkspaceProps = {
  actions: ActionDefinition[]
  confirmDeleteTaskId: string | null
  currentDevice: CurrentDevice
  editForm: BrowserTaskFormState
  developerVisibility: DeveloperVisibilitySettings
  isLoading: boolean
  profilePresets: BrowserProfilePreset[]
  secrets: LocalSecretMetadata[]
  selectedTask: TaskTemplate | null
  selectedWorkflowId: string | null
  taskRunEvents: TaskRunEvent[]
  workflows: WorkflowDefinition[]
  onCreateWorkflow(): Promise<void>
  onChange(value: BrowserTaskFormState): void
  onConfirmDelete(taskId: string): Promise<void>
  onConfirmDeleteWorkflow(workflowId: string): Promise<void>
  onDeleteRequest(taskId: string | null): void
  onSubmit(event: FormEvent<HTMLFormElement>): void
  onUpdateWorkflow(
    workflowId: string,
    input: Partial<WorkflowDefinition>,
  ): Promise<void>
}

export function EditWorkspace({
  actions,
  confirmDeleteTaskId,
  currentDevice,
  editForm,
  developerVisibility,
  isLoading,
  onChange,
  onConfirmDelete,
  onConfirmDeleteWorkflow,
  onCreateWorkflow,
  onDeleteRequest,
  onSubmit,
  onUpdateWorkflow,
  profilePresets,
  secrets,
  selectedWorkflowId,
  selectedTask,
  taskRunEvents,
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

  const config =
    selectedTask?.type === 'browser_tab_group'
      ? normalizeBrowserTabGroupConfig(
          selectedTask.config as Partial<BrowserTabGroupConfig>,
        )
      : null
  const isConfirmingDelete = confirmDeleteTaskId === selectedTask?.id
  const isConfirmingWorkflowDelete = confirmDeleteTaskId === selectedWorkflow?.id

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
            <h2>{selectedWorkflow.name}</h2>
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
              {isConfirmingWorkflowDelete ? (
                <>
                  <p>이 Workflow를 삭제할까요? 연결된 Action은 유지됩니다.</p>
                  <div className="form-actions">
                    <Button
                      className="danger-button"
                      variant="danger"
                      type="button"
                      onClick={() => void onConfirmDeleteWorkflow(selectedWorkflow.id)}
                    >
                      삭제 확정
                    </Button>
                    <Button
                      className="ghost-button"
                      variant="ghost"
                      type="button"
                      onClick={() => onDeleteRequest(null)}
                    >
                      취소
                    </Button>
                  </div>
                </>
              ) : (
                <Button
                  className="danger-button"
                  variant="danger"
                  type="button"
                  onClick={() => onDeleteRequest(selectedWorkflow.id)}
                >
                  Workflow 삭제
                </Button>
              )}
            </Card>
        </div>
      </Card>
      {selectedTask ? (
      <Card className="mode-panel" aria-label="선택한 작업 수정">
        <TaskEditPanel
          currentDevice={currentDevice}
          editForm={editForm}
          profilePresets={profilePresets}
          onChange={onChange}
          onSubmit={onSubmit}
          secrets={secrets}
        />

        <dl className="detail-list">
          <DetailItem label="작업 타입" value={getTaskTypeLabel(selectedTask.type)} />
          <DetailItem label="설정 요약" value={getTaskConfigSummary(selectedTask)} />
          {config ? (
            <>
              <DetailItem label="브라우저" value={getBrowserKindLabel(config.browserKind)} />
              <DetailItem label="실행 방식" value={getBrowserRunModeLabel(config.runMode)} />
              <DetailItem
                label="프로필 소스"
                value={getBrowserProfileSourceLabel(config.profileSource)}
              />
              <DetailItem
                label="동적 업데이트"
                value={config.dynamicTemplateUpdates ? '사용' : '사용 안 함'}
              />
              <DetailItem
                label="탭 그룹 스냅샷"
                value={getTabGroupSnapshotLabel(config)}
              />
              {developerVisibility.showIds ? (
                <DetailItem label="프로필 ID" value={config.profileId || '없음'} />
              ) : null}
            </>
          ) : null}
          <DetailItem label="예약" value={getTaskScheduleLabel(selectedTask.schedule)} />
          <DetailItem label="상태" value={getTaskStatusLabel(selectedTask.state.status)} />
          <DetailItem label="마지막 실행" value={formatDate(selectedTask.state.endedAt)} />
          <DetailItem
            label="마지막 메시지"
            value={selectedTask.state.lastMessage ?? '아직 없음'}
          />
          {developerVisibility.showPaths ? (
            <DetailItem
              label="출력 경로"
              value={
                '아직 없음'
              }
            />
          ) : null}
          <DetailItem label="생성 시간" value={formatDate(selectedTask.createdAt)} />
          <DetailItem label="수정 시간" value={formatDate(selectedTask.updatedAt)} />
          <DetailItem
            label="표시 정책"
            value={getDeviceVisibilityPolicyLabel(selectedTask.permissions.visibility)}
          />
          <DetailItem
            label="실행 정책"
            value={getDeviceExecutionPolicyLabel(selectedTask.permissions.execution)}
          />
        </dl>

        {selectedTask.state.lastError ? (
          <Card className="last-error" aria-label="마지막 오류">
            <h3>마지막 오류</h3>
            <p>{selectedTask.state.lastError}</p>
          </Card>
        ) : null}

        <TaskRunEventsPanel events={taskRunEvents} />

        <Card className="danger-zone" aria-label="작업 삭제">
          {isConfirmingDelete ? (
            <>
              <p>이 작업을 삭제할까요? 저장된 템플릿 설정이 목록에서 사라집니다.</p>
              <div className="form-actions">
                <Button
                  className="danger-button"
                  variant="danger"
                  type="button"
                  onClick={() => void onConfirmDelete(selectedTask.id)}
                >
                  삭제 확정
                </Button>
                <Button
                  className="ghost-button"
                  variant="ghost"
                  type="button"
                  onClick={() => onDeleteRequest(null)}
                >
                  취소
                </Button>
              </div>
            </>
          ) : (
            <Button
              className="danger-button"
              variant="danger"
              type="button"
              onClick={() => onDeleteRequest(selectedTask.id)}
            >
              삭제
            </Button>
          )}
        </Card>
      </Card>
      ) : null}
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

  return actionRefIds
    .map((actionRefId) => actionRefMap.get(actionRefId))
    .filter((actionRef): actionRef is WorkflowDefinition['actionRefs'][number] =>
      Boolean(actionRef),
    )
    .map((actionRef, index) => ({
      ...actionRef,
      order: index,
    }))
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <Card className="detail-item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </Card>
  )
}
