import { randomUUID } from 'node:crypto'
import type {
  ActionDefinition,
  ActionRuntimeState,
  TaskState,
  TaskTemplate,
  WorkflowDefinition,
  WorkflowState,
} from '../../../src/shared/tasks'
import type { AppSettingsStore } from '../../settings/store/appSettingsStore'
import type { TaskAdapterRegistry } from '../../tasks/adapters/taskAdapterRegistry'
import type { TaskRunEventStore } from '../../tasks/store/taskRunEventStore'
import type { TaskStore } from '../../tasks/store/taskStore'
import type { ToolModuleRunner } from '../../tools/runner/toolModuleRunner'

export type WorkflowRunner = {
  getWorkflow(id: string): Promise<WorkflowDefinition>
  runWorkflow(id: string): Promise<WorkflowDefinition>
  stopWorkflow(id: string): Promise<WorkflowDefinition>
}

export type WorkflowRunnerOptions = {
  taskStore: TaskStore
  adapterRegistry: TaskAdapterRegistry
  appSettingsStore: AppSettingsStore
  toolModuleRunner: ToolModuleRunner
  taskRunEventStore: TaskRunEventStore
  dataDir: string
  deviceId: string
}

export function createWorkflowRunner({
  adapterRegistry,
  appSettingsStore,
  dataDir,
  deviceId,
  taskRunEventStore,
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

  function getRunnableActionRefs(workflow: WorkflowDefinition) {
    const enabledActions = workflow.actionRefs
      .filter((actionRef) => actionRef.enabled)
      .sort((left, right) => left.order - right.order)

    if (enabledActions.length === 0) {
      throw new Error('실행 가능한 Action이 없는 Workflow입니다.')
    }

    return enabledActions
  }

  return {
    getWorkflow,
    async runWorkflow(id) {
      const workflow = await getWorkflow(id)
      if (workflow.state.status === 'running') {
        return workflow
      }
      getRunnableActionRefs(workflow)
      return runActionWorkflow(workflow, await taskStore.listActions(), {
        adapterRegistry,
        dataDir,
        deviceId,
        appSettingsStore,
        taskRunEventStore,
        taskStore,
        toolModuleRunner,
      })
    },
    async stopWorkflow(id) {
      const workflow = await getWorkflow(id)
      const actions = await taskStore.listActions()
      const actionMap = new Map(actions.map((action) => [action.id, action]))

      for (const actionRef of getRunnableActionRefs(workflow)) {
        const action = actionMap.get(actionRef.actionId)
        if (!action || action.type === 'tool_action') {
          continue
        }

        const adapter = adapterRegistry.getAdapter(action.type)
        const stopResult = await adapter.stop?.(action.id).catch((error) => {
          if (isMissingBrowserActionGroupError(error)) {
            return {
              state: {
                status: 'idle' as const,
                lastError: undefined,
                lastMessage: '실행 세션이 없어 상태만 정리했습니다.',
              },
            }
          }

          throw error
        })
        if (stopResult && 'config' in stopResult && stopResult.config) {
          await taskStore.updateAction(action.id, {
            config: stopResult.config,
          })
        }
        if (stopResult && 'state' in stopResult && stopResult.state) {
          const latestWorkflow = await getWorkflow(workflow.id)
          await taskStore.updateWorkflow(workflow.id, {
            state: mergeActionState(
              latestWorkflow.state,
              action.id,
              stopResult.state as Partial<ActionRuntimeState>,
            ),
          })
        }
      }

      const latestWorkflow = await getWorkflow(workflow.id)
      return taskStore.updateWorkflow(workflow.id, {
        state: {
          ...latestWorkflow.state,
          status: 'idle',
          lastMessage: 'Workflow 중지를 요청했습니다.',
        },
      })
    },
  }
}

function isMissingBrowserActionGroupError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes('관리 중인 브라우저 Action 그룹을 찾지 못했습니다')
  )
}

async function runActionWorkflow(
  workflow: WorkflowDefinition,
  actions: ActionDefinition[],
  context: {
    adapterRegistry: TaskAdapterRegistry
    appSettingsStore: AppSettingsStore
    dataDir: string
    deviceId: string
    taskRunEventStore: TaskRunEventStore
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
  await context.taskRunEventStore.appendEvent({
    workflowId: workflow.id,
    deviceId: context.deviceId,
    status: 'running',
    message: 'Workflow 실행을 시작했습니다.',
  })

  try {
    for (const actionRef of enabledActionRefs) {
      const action = actionMap.get(actionRef.actionId)
      if (!action) {
        throw new Error(`Action을 찾을 수 없습니다: ${actionRef.actionId}`)
      }

      if (action.type !== 'tool_action') {
        const adapter = context.adapterRegistry.getAdapter(action.type)
        const actionRunId = randomUUID()
        await adapter.validateConfig(action.config)
        const appSettingsSnapshot = await context.appSettingsStore.getSnapshot()
        const result = await adapter.run({
          task: createRuntimeTask(action, workflow),
          deviceId: context.deviceId,
          dataDir: context.dataDir,
          appSettings: appSettingsSnapshot.settings,
          async updateConfig(config) {
            await context.taskStore.updateAction(action.id, { config })
          },
          async updateState(state) {
            const currentWorkflow = await context.taskStore
              .listWorkflows()
              .then((workflows) =>
                workflows.find(
                  (current) => current.id === workflow.id,
                ),
              )
            const nextActionState = mergeActionState(
              currentWorkflow?.state ?? workflow.state,
              action.id,
              state as Partial<ActionRuntimeState>,
            )
            await context.taskStore.updateWorkflow(workflow.id, {
              state: {
                ...(currentWorkflow?.state ?? workflow.state),
                ...(state as Partial<TaskState>),
                actionStates: nextActionState.actionStates,
              },
            })
          },
        })
        const resultState = result.state as TaskState
        const currentWorkflow = await context.taskStore
          .listWorkflows()
          .then((workflows) =>
            workflows.find((current) => current.id === workflow.id),
          )
        const stateWithAction = mergeActionState(
          currentWorkflow?.state ?? workflow.state,
          action.id,
          resultState,
        )
        outputScope = {
          ...outputScope,
          [actionRef.id]: resultState,
        }
        await context.taskRunEventStore.appendEvent({
          workflowId: workflow.id,
          actionRunId,
          deviceId: context.deviceId,
          status: resultState.status,
          message: result.message ?? `${action.name} Action 실행을 처리했습니다.`,
        })
        if (resultState.status === 'running') {
          const runningWorkflow = await context.taskStore.updateWorkflow(
            workflow.id,
            {
              state: {
                ...stateWithAction,
                ...resultState,
                lastMessage:
                  result.message ?? `${action.name} Action 실행 중입니다.`,
              },
            },
          )

          return runningWorkflow
        }
        continue
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
      await context.taskRunEventStore.appendEvent({
        workflowId: workflow.id,
        actionRunId: actionRef.id,
        deviceId: context.deviceId,
        status: 'idle',
        message: `${action.name} Tool Action 실행을 완료했습니다.`,
      })
    }

    const completedWorkflow = await context.taskStore.updateWorkflow(workflow.id, {
      state: {
        ...(await getLatestWorkflowState(context.taskStore, workflow.id)),
        status: 'idle',
        lastRunAt: new Date().toISOString(),
        lastMessage: `${enabledActionRefs.length}개 Action 실행을 완료했습니다.`,
      },
    })
    await context.taskRunEventStore.appendEvent({
      workflowId: workflow.id,
      deviceId: context.deviceId,
      status: 'idle',
      message: completedWorkflow.state.lastMessage,
    })

    return completedWorkflow
  } catch (error) {
    const failedWorkflow = await context.taskStore.updateWorkflow(workflow.id, {
      state: {
        ...(await getLatestWorkflowState(context.taskStore, workflow.id)),
        status: 'failed',
        lastRunAt: new Date().toISOString(),
        lastError: getErrorMessage(error),
      },
    })
    await context.taskRunEventStore.appendEvent({
      workflowId: workflow.id,
      deviceId: context.deviceId,
      status: 'failed',
      message: failedWorkflow.state.lastError,
    })

    return failedWorkflow
  }
}

async function getLatestWorkflowState(
  taskStore: TaskStore,
  workflowId: string,
): Promise<WorkflowState> {
  const workflows = await taskStore.listWorkflows()
  const workflow = workflows.find((current) => current.id === workflowId)

  if (!workflow) {
    throw new Error(`Workflow not found: ${workflowId}`)
  }

  return workflow.state
}

function mergeActionState(
  workflowState: WorkflowState,
  actionId: string,
  actionState: Partial<ActionRuntimeState>,
): WorkflowState {
  return {
    ...workflowState,
    actionStates: {
      ...(workflowState.actionStates ?? {}),
      [actionId]: {
        ...(workflowState.actionStates?.[actionId] ?? { status: 'idle' }),
        ...actionState,
      },
    },
  }
}

function createRuntimeTask(
  action: ActionDefinition,
  workflow: WorkflowDefinition,
): TaskTemplate {
  return {
    id: action.id,
    name: action.name,
    type: getRuntimeTaskType(action),
    config: action.config,
    state: workflow.state,
    permissions: workflow.permissions,
    schedule: workflow.schedule,
    createdAt: action.createdAt,
    updatedAt: action.updatedAt,
  }
}

function getRuntimeTaskType(action: ActionDefinition): TaskTemplate['type'] {
  switch (action.type) {
    case 'browser_action':
      return 'browser_tab_group'
    case 'crawler_action':
      return 'crawler'
    case 'discord_dry_run_action':
      return 'discord_bot'
    case 'notion_dry_run_action':
      return 'notion_sync'
    case 'trading_dry_run_action':
      return 'trading_bot'
    case 'tool_action':
      throw new Error('tool_action은 Task 호환 런타임 타입이 없습니다.')
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
