import { Card } from "@heroui/react"
import { ListRunButtons } from "./ListRunButtons"
import { GridRunButton } from "./GridRunButton"
import { ListRunStateChips } from "./ListRunStateChips"
import { WorkflowListDisplayMode } from "../../../../shared/settings"
import { isRestrictedDevicePolicy } from '../../../../shared/devices'
import { WorkflowDefinition } from "../../../../shared/workflows"
import {
  formatDate,
  getTaskScheduleLabel,
} from '../../../shared/utils/viewLabels'



export type LaunchPanelProps = {
  displayMode: WorkflowListDisplayMode
  runningWorkflowId: string | null
  selectedWorkflowId: string | null
  stoppingWorkflowId: string | null
  workflows: WorkflowDefinition[]
  workflowHierarchy: string[]
  onRun(workflowId: string): Promise<void>
  onSelect(workflow: WorkflowDefinition): void
  onStop(workflowId: string): Promise<void>
}



export function LaunchPanel({
  displayMode,
  runningWorkflowId,
  selectedWorkflowId,
  stoppingWorkflowId,
  workflows,
  workflowHierarchy,
  onRun,
  onSelect,
  onStop,
}:LaunchPanelProps) {
    const isGridMode = displayMode === 'grid'
    return (
    <>
        {groupWorkflows(workflows, workflowHierarchy).map((group) => (
            <Card className="workflow-run-group" key={group.name}>
              <h3 className='py-1'>{group.name}</h3>
              <div className={`workflow-run-group-items task-list-${displayMode}`}>
          {group.workflows.map((workflow) => {
              const isRunning = runningWorkflowId === workflow.id
              const isStopping = stoppingWorkflowId === workflow.id
              const isSelected = selectedWorkflowId === workflow.id
              const canStop = workflow.state.status === 'running'
              const workflowId = workflow.id
              const workflowName = workflow.name
              const onPressEdit = (() => onSelect(workflow))
              const onPressRun = (() => onRun(workflowId))
              const onPressStop = (() => onStop(workflowId))
              if (isGridMode) {
              return (
                  <GridRunButton
                  canStop={canStop}
                  isRunning={isRunning}
                  isStopping={isStopping}
                  workflowId={workflowId}
                  workflowName={workflowName}
                  onPressRun={onPressRun}
                  onPressStop={onPressStop}
                  />
              )
              }
              return (
              <article
                  className='
                  gap-2
                  grid grid-cols-[minmax(0,1fr)_max-content]
                  md:grid-cols-[max-content_minmax(0,1fr)_max-content]
                  '
                  key={workflowId}
              >
                  <div className=''>
                  <ListRunStateChips
                      currentStatus={workflow.state.status}
                      isListMode={!isGridMode}
                      isRestricted={isRestrictedDevicePolicy(workflow.permissions)}
                  />
                  </div>
                  <div className="task-row-summary">
                      <span className="task-row-title">{workflow.name}</span>
                      <span className="task-row-meta truncate">
                      Action {workflow.actionRefs.length}개 · 마지막 실행{' '}
                      {formatDate(workflow.state.endedAt).value} ·{' '}
                      {getTaskScheduleLabel(workflow.schedule)}
                      </span>
                      <span className="task-row-meta">
                      {workflow.state.lastError ??
                          workflow.state.lastMessage ??
                          '아직 실행 결과가 없습니다.'}
                      </span>
                  </div>
                  <div className='grid grid-rows-2 space-y-4 justify-end-safe'>
                  <ListRunButtons
                      canStop={canStop}
                      isListMode={!isGridMode}
                      isRunning={isRunning}
                      isSelected={isSelected}
                      isStopping={isStopping}
                      onPressEdit={onPressEdit}
                      onPressRun={onPressRun}
                      onPressStop={onPressStop}
                  />
                  </div>
              </article>
              )
          })}
              </div>
            </Card>
        ))}
    </>
  )
}

function groupWorkflows(
  workflows: WorkflowDefinition[],
  workflowHierarchy: string[],
): { name: string; workflows: WorkflowDefinition[] }[] {
  return [
    {
      name: workflowHierarchy[0] ?? '전체 Workflow',
      workflows,
    },
  ]
}