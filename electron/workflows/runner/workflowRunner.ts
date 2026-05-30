import type {
  ActionDefinition,
  TaskTemplate,
  WorkflowDefinition,
} from '../../../src/shared/tasks'
import type { TaskRunner } from '../../tasks/runner/taskRunner'
import type { TaskStore } from '../../tasks/store/taskStore'
import type { ToolModuleRunner } from '../../tools/runner/toolModuleRunner'

export type WorkflowRunner = {
  getWorkflow(id: string): Promise<WorkflowDefinition>
  runWorkflow(id: string): Promise<TaskTemplate | WorkflowDefinition>
  stopWorkflow(id: string): Promise<TaskTemplate | WorkflowDefinition>
}

export type WorkflowRunnerOptions = {
  taskStore: TaskStore
  taskRunner: TaskRunner
  toolModuleRunner: ToolModuleRunner
}

export function createWorkflowRunner({
  taskRunner,
  taskStore,
  toolModuleRunner,
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
      if (!workflow.legacyTaskId) {
        return runActionWorkflow(workflow, await taskStore.listActions(), {
          taskStore,
          toolModuleRunner,
        })
      }
      return taskRunner.runTask(getRunnableLegacyTaskId(workflow))
    },
    async stopWorkflow(id) {
      const workflow = await getWorkflow(id)
      if (!workflow.legacyTaskId) {
        return taskStore.updateWorkflow(workflow.id, {
          state: {
            ...workflow.state,
            status: 'idle',
            lastMessage: 'Workflow 중지를 요청했습니다.',
          },
        })
      }
      return taskRunner.stopTask(getRunnableLegacyTaskId(workflow))
    },
  }
}

async function runActionWorkflow(
  workflow: WorkflowDefinition,
  actions: ActionDefinition[],
  context: {
    taskStore: TaskStore
    toolModuleRunner: ToolModuleRunner
  },
): Promise<WorkflowDefinition> {
  const actionMap = new Map(actions.map((action) => [action.id, action]))
  const enabledActionRefs = workflow.actionRefs
    .filter((actionRef) => actionRef.enabled)
    .sort((left, right) => left.order - right.order)
  let outputScope: Record<string, unknown> = {}

  await context.taskStore.updateWorkflow(workflow.id, {
    state: {
      ...workflow.state,
      status: 'running',
      lastRunAt: new Date().toISOString(),
      lastMessage: 'Workflow 실행을 시작했습니다.',
      lastError: undefined,
    },
  })

  try {
    for (const actionRef of enabledActionRefs) {
      const action = actionMap.get(actionRef.actionId)
      if (!action) {
        throw new Error(`Action을 찾을 수 없습니다: ${actionRef.actionId}`)
      }

      if (action.type !== 'tool_action') {
        throw new Error(
          `순수 Workflow runner는 아직 ${action.type} 실행을 지원하지 않습니다.`,
        )
      }

      const config = action.config as {
        toolId?: string
        inputDefaults?: Record<string, unknown>
      }
      if (!config.toolId) {
        throw new Error('tool_action config.toolId가 필요합니다.')
      }

      const result = await context.toolModuleRunner.runTool(config.toolId, {
        ...(config.inputDefaults ?? {}),
        ...resolveInputMapping(actionRef.inputMapping, outputScope),
      })
      outputScope = {
        ...outputScope,
        [actionRef.id]: result.output,
      }
    }

    return context.taskStore.updateWorkflow(workflow.id, {
      state: {
        status: 'idle',
        lastRunAt: new Date().toISOString(),
        lastMessage: `${enabledActionRefs.length}개 Action 실행을 완료했습니다.`,
      },
    })
  } catch (error) {
    return context.taskStore.updateWorkflow(workflow.id, {
      state: {
        status: 'failed',
        lastRunAt: new Date().toISOString(),
        lastError: getErrorMessage(error),
      },
    })
  }
}

function resolveInputMapping(
  inputMapping: Record<string, string> | undefined,
  outputScope: Record<string, unknown>,
): Record<string, unknown> {
  if (!inputMapping) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(inputMapping).map(([inputKey, outputPath]) => [
      inputKey,
      outputScope[outputPath],
    ]),
  )
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : '알 수 없는 Workflow 실행 오류가 발생했습니다.'
}
