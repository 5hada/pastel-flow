import type { TaskTemplate, WorkflowDefinition } from '../../../src/shared/tasks'
import type { TaskRunner } from '../../tasks/runner/taskRunner'
import type { TaskStore } from '../../tasks/store/taskStore'

export type WorkflowRunner = {
  getWorkflow(id: string): Promise<WorkflowDefinition>
  runWorkflow(id: string): Promise<TaskTemplate>
  stopWorkflow(id: string): Promise<TaskTemplate>
}

export type WorkflowRunnerOptions = {
  taskStore: TaskStore
  taskRunner: TaskRunner
}

export function createWorkflowRunner({
  taskRunner,
  taskStore,
}: WorkflowRunnerOptions): WorkflowRunner {
  async function getWorkflow(id: string): Promise<WorkflowDefinition> {
    const workflow = (await taskStore.listWorkflows()).find(
      (currentWorkflow) => currentWorkflow.id === id,
    )

    if (!workflow) {
      throw new Error(`Workflow not found: ${id}`)
    }

    return workflow
  }

  function getRunnableLegacyTaskId(workflow: WorkflowDefinition): string {
    const enabledActions = workflow.actionRefs
      .filter((actionRef) => actionRef.enabled)
      .sort((left, right) => left.order - right.order)

    if (enabledActions.length === 0) {
      throw new Error('실행 가능한 Action이 없는 Workflow입니다.')
    }

    if (!workflow.legacyTaskId) {
      throw new Error(
        '아직 legacy task에 연결되지 않은 Workflow 실행은 지원하지 않습니다.',
      )
    }

    return workflow.legacyTaskId
  }

  return {
    getWorkflow,
    async runWorkflow(id) {
      const workflow = await getWorkflow(id)
      return taskRunner.runTask(getRunnableLegacyTaskId(workflow))
    },
    async stopWorkflow(id) {
      const workflow = await getWorkflow(id)
      return taskRunner.stopTask(getRunnableLegacyTaskId(workflow))
    },
  }
}
