import type { FormEvent } from 'react'
import type { CurrentDevice } from '../../../../shared/devices'
import type { LocalSecretMetadata } from '../../../../shared/secrets'
import {
  getBrowserRunModeLabel,
  getDeviceExecutionPolicyLabel,
  getDeviceVisibilityPolicyLabel,
  normalizeBrowserTabGroupConfig,
  type ActionDefinition,
  type BrowserTabGroupConfig,
  type TaskTemplate,
  type WorkflowDefinition,
} from '../../../../shared/tasks'
import type { TaskRunEvent } from '../../../../shared/taskRunEvents'
import type { BrowserTaskFormState } from '../../taskFormState'
import { DetailItem } from './DetailItem'
import { TaskEditPanel } from './TaskEditPanel'
import { TaskRunEventsPanel } from './TaskRunEventsPanel'
import { WorkflowActionList } from '../actions/ActionWorkspacePanel'
import {
  formatDate,
  getBrowserKindLabel,
  getBrowserProfileSourceLabel,
  getTabGroupSnapshotLabel,
  getTaskConfigSummary,
  getTaskScheduleLabel,
  getTaskStatusLabel,
  getTaskTypeLabel,
} from '../../utils/viewLabels'

export type EditWorkspaceProps = {
  actions: ActionDefinition[]
  confirmDeleteTaskId: string | null
  currentDevice: CurrentDevice
  editForm: BrowserTaskFormState
  isLoading: boolean
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
  onSelectWorkflow(workflowId: string | null): void
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
  isLoading,
  onChange,
  onConfirmDelete,
  onConfirmDeleteWorkflow,
  onCreateWorkflow,
  onDeleteRequest,
  onSelectWorkflow,
  onSubmit,
  onUpdateWorkflow,
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
      <section className="mode-panel">
        <p className="empty-state">작업을 불러오는 중입니다.</p>
      </section>
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

  return (
    <section aria-label="기존 작업 수정">
      <section className="mode-panel workflow-builder" aria-label="Workflow 작성">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Workflows</p>
            <h2>{selectedWorkflow?.name ?? '새 Workflow'}</h2>
          </div>
          <button
            aria-label="새 Workflow"
            type="button"
            onClick={() => void onCreateWorkflow()}
          >
            +
          </button>
        </div>
        <div className="editor-detail">
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow">Action order</p>
                <h3>{selectedWorkflow?.name ?? '새 Workflow'}</h3>
              </div>
            </div>
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
            {selectedWorkflow ? (
              <section className="danger-zone" aria-label="Workflow 삭제">
                {isConfirmingWorkflowDelete ? (
                  <>
                    <p>이 Workflow를 삭제할까요? 연결된 Action은 유지됩니다.</p>
                    <div className="form-actions">
                      <button
                        className="danger-button"
                        type="button"
                        onClick={() => void onConfirmDeleteWorkflow(selectedWorkflow.id)}
                      >
                        삭제 확정
                      </button>
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => onDeleteRequest(null)}
                      >
                        취소
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    className="danger-button"
                    type="button"
                    onClick={() => onDeleteRequest(selectedWorkflow.id)}
                  >
                    Workflow 삭제
                  </button>
                )}
              </section>
            ) : null}
        </div>
      </section>
      {selectedTask ? (
      <section className="mode-panel" aria-label="선택한 작업 수정">
        <TaskEditPanel
          currentDevice={currentDevice}
          editForm={editForm}
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
              <DetailItem label="프로필 ID" value={config.profileId || '없음'} />
            </>
          ) : null}
          <DetailItem label="예약" value={getTaskScheduleLabel(selectedTask.schedule)} />
          <DetailItem label="상태" value={getTaskStatusLabel(selectedTask.state.status)} />
          <DetailItem label="마지막 실행" value={formatDate(selectedTask.state.lastRunAt)} />
          <DetailItem
            label="마지막 메시지"
            value={selectedTask.state.lastMessage ?? '아직 없음'}
          />
          <DetailItem
            label="출력 경로"
            value={
              selectedTask.state.outputPath ??
              selectedTask.state.localProfilePath ??
              '아직 없음'
            }
          />
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
          <section className="last-error" aria-label="마지막 오류">
            <h3>마지막 오류</h3>
            <p>{selectedTask.state.lastError}</p>
          </section>
        ) : null}

        <TaskRunEventsPanel events={taskRunEvents} />

        <section className="danger-zone" aria-label="작업 삭제">
          {isConfirmingDelete ? (
            <>
              <p>이 작업을 삭제할까요? 저장된 템플릿 설정이 목록에서 사라집니다.</p>
              <div className="form-actions">
                <button
                  className="danger-button"
                  type="button"
                  onClick={() => void onConfirmDelete(selectedTask.id)}
                >
                  삭제 확정
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => onDeleteRequest(null)}
                >
                  취소
                </button>
              </div>
            </>
          ) : (
            <button
              className="danger-button"
              type="button"
              onClick={() => onDeleteRequest(selectedTask.id)}
            >
              삭제
            </button>
          )}
        </section>
      </section>
      ) : (
        <section className="mode-panel">
          <div className="empty-state empty-state-action">
            <p>좌측 패널에서 Workflow를 선택하거나 새 Workflow를 만드세요.</p>
            <button type="button" onClick={() => onSelectWorkflow(null)}>
              +
            </button>
          </div>
        </section>
      )}
    </section>
  )
}

function moveWorkflowActionRef(
  actionRefs: WorkflowDefinition['actionRefs'],
  actionRefId: string,
  direction: 'up' | 'down',
): WorkflowDefinition['actionRefs'] {
  const sortedActionRefs = [...actionRefs].sort(
    (left, right) => left.order - right.order,
  )
  const index = sortedActionRefs.findIndex(
    (actionRef) => actionRef.id === actionRefId,
  )
  const nextIndex = direction === 'up' ? index - 1 : index + 1

  if (index < 0 || nextIndex < 0 || nextIndex >= sortedActionRefs.length) {
    return sortedActionRefs
  }

  const nextActionRefs = [...sortedActionRefs]
  const currentActionRef = nextActionRefs[index]
  nextActionRefs[index] = nextActionRefs[nextIndex]
  nextActionRefs[nextIndex] = currentActionRef

  return nextActionRefs.map((actionRef, currentIndex) => ({
    ...actionRef,
    order: currentIndex,
  }))
}
