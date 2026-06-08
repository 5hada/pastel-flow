import { DetailItem } from "../../../shared/components/DetailItem"
import { getTaskStatusLabel, getTaskScheduleLabel } from "../../../shared/utils/viewLabels"
import { getDeviceExecutionPolicyLabel, getDeviceVisibilityPolicyLabel } from "../../../../shared/devices"
import { getWorkflowRunPolicyLabel } from "../../../shared/utils/viewLabels"
import { formatDate } from "../../../shared/utils/viewLabels"
import type { WorkflowDefinition } from "../../../../shared/workflows"


export function WorkflowDetailList({
    selectedWorkflow,
    visibleId
}: {
    selectedWorkflow: WorkflowDefinition
    visibleId: boolean
}) {
    return (
            <dl className="detail-list">
            {visibleId ? (
                <DetailItem label="Workflow ID" value={selectedWorkflow.id} />
            ) : null}
            <DetailItem label="Action" value={`${selectedWorkflow.actionRefs.length}개`} />
            <DetailItem label="예약" value={getTaskScheduleLabel(selectedWorkflow.schedule)} />
            <DetailItem
                label="Run policy"
                value={getWorkflowRunPolicyLabel(selectedWorkflow.runPolicy)}
            />
            <DetailItem label="상태" value={getTaskStatusLabel(selectedWorkflow.state.status)} />
            <DetailItem label="마지막 실행" value={formatDate(selectedWorkflow.state.endedAt).value} />
            <DetailItem
                label="마지막 메시지"
                value={selectedWorkflow.state.lastMessage ?? '아직 없음'}
            />
            <DetailItem label="생성 시간" value={formatDate(selectedWorkflow.createdAt).value} />
            <DetailItem label="수정 시간" value={formatDate(selectedWorkflow.updatedAt).value} />
            <DetailItem
                label="표시 정책"
                value={getDeviceVisibilityPolicyLabel(selectedWorkflow.permissions.visibility)}
            />
            <DetailItem
                label="실행 정책"
                value={getDeviceExecutionPolicyLabel(selectedWorkflow.permissions.execution)}
            />
            </dl>
    )
}