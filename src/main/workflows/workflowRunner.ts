import { randomUUID } from 'node:crypto'
import type { WorkflowDefinition, WorkflowState } from '../../shared/workflows'
import type { ActionDefinition, ActionRuntimeState } from '../../shared/actions'
import type { AppSettingsStore } from '../settings/store/appSettingsStore'
import type { ActionAdapterRegistry } from '../actions/adapters/actionAdapterRegistry'
import type { WorkflowRunEventStore } from './store/workflowRunEventStore'
import type { WorkflowStore } from './store/workflowStore'
import type { ToolModuleRunner } from '../tools/runner/toolModuleRunner'


export type WorkflowRunner = {
  getWorkflow(id: string): Promise<WorkflowDefinition>
  runWorkflow(id: string): Promise<WorkflowDefinition>
  stopWorkflow(id: string): Promise<WorkflowDefinition>
}

export type WorkflowRunnerOptions = {
  workflowStore: WorkflowStore
  adapterRegistry: ActionAdapterRegistry
  appSettingsStore: AppSettingsStore
  toolModuleRunner: ToolModuleRunner
  workflowRunEventStore: WorkflowRunEventStore
  dataDir: string
  deviceId: string
}

export function createWorkflowRunner({
  adapterRegistry,
  appSettingsStore,
  dataDir,
  deviceId,
  workflowRunEventStore,
  workflowStore,
  toolModuleRunner,
}: WorkflowRunnerOptions): WorkflowRunner {
  async function getWorkflow(id: string): Promise<WorkflowDefinition> {
    const workflow = (await workflowStore.listWorkflows()).find(
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
      return runActionWorkflow(workflow, await workflowStore.listActions(), {
        adapterRegistry,
        dataDir,
        deviceId,
        appSettingsStore,
        workflowRunEventStore,
        workflowStore,
        toolModuleRunner,
      })
    },
    async stopWorkflow(id) {
      const workflow = await getWorkflow(id)
      const actions = await workflowStore.listActions()
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
          await workflowStore.updateAction(action.id, {
            config: stopResult.config,
          })
        }
        if (stopResult && 'state' in stopResult && stopResult.state) {
          const latestWorkflow = await getWorkflow(workflow.id)
          const existingActionState = latestWorkflow.state.actionStates?.[action.id]
          await workflowStore.updateWorkflow(workflow.id, {
            state: mergeWorkflowState(
              latestWorkflow.state,
              action.id,
              {
                ...existingActionState,
                ...(stopResult.state as Partial<ActionRuntimeState>),
                endedAt: new Date().toISOString(),
              },
            ),
          })
        }
      }

      const latestWorkflow = await getWorkflow(workflow.id)
      return workflowStore.updateWorkflow(workflow.id, {
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
    adapterRegistry: ActionAdapterRegistry
    appSettingsStore: AppSettingsStore
    dataDir: string
    deviceId: string
    workflowRunEventStore: WorkflowRunEventStore
    workflowStore: WorkflowStore
    toolModuleRunner: ToolModuleRunner
  },
): Promise<WorkflowDefinition> {
  const actionMap = new Map(actions.map((action) => [action.id, action]))
  const enabledActionRefs = workflow.actionRefs
    .filter((actionRef) => actionRef.enabled)
    .sort((left, right) => left.order - right.order)
  let outputScope: Record<string, unknown> = {}

  await context.workflowStore.updateWorkflow(workflow.id, {
    state: {
      ...workflow.state,
      status: 'running',
      startedAt: new Date().toISOString(),
      lastMessage: 'Workflow 실행을 시작했습니다.',
      lastError: undefined,
    },
  })
  await context.workflowRunEventStore.appendEvent({
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
        const actionStartedAt = new Date().toISOString()
        await adapter.validateAConfig(action.config)
        await context.workflowStore.updateWorkflow(workflow.id, {
          state: mergeWorkflowState(
            await getLatestWorkflowState(context.workflowStore, workflow.id),
            action.id,
            {
              status: 'running',
              startedAt: actionStartedAt,
              lastError: undefined,
            },
          ),
        })
        const appSettingsSnapshot = await context.appSettingsStore.getSnapshot()
        const result = await adapter.run({
          action: action,
          deviceId: context.deviceId,
          dataDir: context.dataDir,
          appSettings: appSettingsSnapshot.settings,
          async updateAConfig(config) {
            await context.workflowStore.updateAction(action.id, { config })
          },
          async updateState(state) {
            const currentWorkflow = await context.workflowStore
              .listWorkflows()
              .then((workflows) =>
                workflows.find(
                  (current) => current.id === workflow.id,
                ),
              )
            const nextActionState = mergeWorkflowState(
              currentWorkflow?.state ?? workflow.state,
              action.id,
              state
            )
            await context.workflowStore.updateWorkflow(workflow.id, {
              state: {
                ...(currentWorkflow?.state ?? workflow.state),
                ...(state as Partial<WorkflowState>),
                actionStates: nextActionState.actionStates,
              },
            })
          },
        })
        const resultState = result.state as WorkflowState
        const currentWorkflow = await context.workflowStore
          .listWorkflows()
          .then((workflows) =>
            workflows.find((current) => current.id === workflow.id),
          )
        const stateWithAction = mergeWorkflowState(
          currentWorkflow?.state ?? workflow.state,
          action.id,
          {
            ...resultState,
            endedAt:
              resultState.status === 'running'
                ? undefined
                : new Date().toISOString(),
          },
        )
        outputScope = {
          ...outputScope,
          [actionRef.id]: resultState,
        }
        await context.workflowRunEventStore.appendEvent({
          workflowId: workflow.id,
          actionRunId,
          deviceId: context.deviceId,
          status: resultState.status,
          message: result.message ?? `${action.name} Action 실행을 처리했습니다.`,
        })
        if (resultState.status === 'running') {
          const runningWorkflow = await context.workflowStore.updateWorkflow(
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
      const toolActionRunId = randomUUID()
      const completedAt = new Date().toISOString()
      await context.workflowStore.updateWorkflow(workflow.id, {
        state: mergeWorkflowState(
          await getLatestWorkflowState(context.workflowStore, workflow.id),
          action.id,
          {
            status: 'idle',
            endedAt: completedAt,
            lastError: undefined,
            lastMessage: `${action.name} Tool Action 실행을 완료했습니다.`,
          },
        ),
      })
      outputScope = {
        ...outputScope,
        [actionRef.id]: result.output,
      }
      await context.workflowRunEventStore.appendEvent({
        workflowId: workflow.id,
        actionRunId: toolActionRunId,
        deviceId: context.deviceId,
        status: 'idle',
        message: `${action.name} Tool Action 실행을 완료했습니다.`,
      })
    }

    const completedWorkflow = await context.workflowStore.updateWorkflow(workflow.id, {
      state: {
        ...(await getLatestWorkflowState(context.workflowStore, workflow.id)),
        status: 'idle',
        endedAt: new Date().toISOString(),
        lastMessage: `${enabledActionRefs.length}개 Action 실행을 완료했습니다.`,
      },
    })
    await context.workflowRunEventStore.appendEvent({
      workflowId: workflow.id,
      deviceId: context.deviceId,
      status: 'idle',
      message: completedWorkflow.state.lastMessage,
    })

    return completedWorkflow
  } catch (error) {
    const failedWorkflow = await context.workflowStore.updateWorkflow(workflow.id, {
      state: {
        ...(await getLatestWorkflowState(context.workflowStore, workflow.id)),
        status: 'failed',
        endedAt: new Date().toISOString(),
        lastError: getErrorMessage(error),
      },
    })
    await context.workflowRunEventStore.appendEvent({
      workflowId: workflow.id,
      deviceId: context.deviceId,
      status: 'failed',
      message: failedWorkflow.state.lastError,
    })

    return failedWorkflow
  }
}

async function getLatestWorkflowState(
  WorkflowStore: WorkflowStore,
  workflowId: string,
): Promise<WorkflowState> {
  const workflows = await WorkflowStore.listWorkflows()
  const workflow = workflows.find((current) => current.id === workflowId)

  if (!workflow) {
    throw new Error(`Workflow not found: ${workflowId}`)
  }

  return workflow.state
}

function mergeWorkflowState(
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
    }
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
