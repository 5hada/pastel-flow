import type {
  WorkflowDefinition,
  WorkflowInputMapping,
  WorkflowState,
} from '../../shared/workflows'
import type { ActionDefinition, ActionRuntimeState } from '../../shared/actions'
import type {
  WorkflowRunActorType,
  WorkflowRunTriggerSource,
} from '../../shared/runStatus'
import {
  parseMappingSource,
  validateWorkflowInputMappings,
} from '../../shared/actions'
import type { AppSettingsStore } from '../settings/store/appSettingsStore'
import type { ActionAdapterRegistry } from '../actions/adapters/actionAdapterRegistry'
import type { ActionStore } from '../actions/actionStore'
import type { WorkflowRunEventStore } from './store/workflowRunEventStore'
import type { WorkflowStore } from './store/workflowStore'
import type { ToolModuleRunner } from '../tools/runner/toolModuleRunner'
import type { WorkflowRunStore } from './store/workflowRunStore'
import type { WorkflowArtifactWriter } from './artifacts/workflowArtifactWriter'
import type { WorkflowArtifactRef } from '../../shared/artifacts'
import type { UrlGroupStore } from '../urlGroups/store/urlGroupStore'
import type { UrlGroupItemRunStore } from '../urlGroups/store/urlGroupItemRunStore'

const workflowRunLocks = new Set<string>()

export type WorkflowRunner = {
  getWorkflow(id: string): Promise<WorkflowDefinition>
  runWorkflow(
    id: string,
    options?: RunWorkflowOptions,
  ): Promise<WorkflowDefinition>
  stopWorkflow(id: string): Promise<WorkflowDefinition>
}

export type RunWorkflowOptions = {
  actorType?: WorkflowRunActorType
  actorId?: string
  triggerSource?: WorkflowRunTriggerSource
}

export type WorkflowRunnerOptions = {
  actionStore: ActionStore
  workflowStore: WorkflowStore
  adapterRegistry: ActionAdapterRegistry
  appSettingsStore: AppSettingsStore
  toolModuleRunner: ToolModuleRunner
  workflowRunEventStore: WorkflowRunEventStore
  workflowRunStore: WorkflowRunStore
  workflowArtifactWriter: WorkflowArtifactWriter
  urlGroupStore: UrlGroupStore
  urlGroupItemRunStore: UrlGroupItemRunStore
  dataDir: string
  deviceId: string
}

export function createWorkflowRunner({
  actionStore,
  adapterRegistry,
  appSettingsStore,
  dataDir,
  deviceId,
  workflowRunEventStore,
  workflowRunStore,
  workflowArtifactWriter,
  workflowStore,
  urlGroupStore,
  urlGroupItemRunStore,
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
    async runWorkflow(id, options) {
      const actorId = options?.actorId
      const actorType = options?.actorType ?? 'user'
      const triggerSource = options?.triggerSource ?? 'manual'
      const workflow = await getWorkflow(id)
      await assertWorkflowRunPolicy(workflow, {
        actorId,
        actorType,
        workflowRunStore,
      })

      if (workflowRunLocks.has(id)) {
        await createSkippedWorkflowRun(workflow, {
          actorId,
          actorType,
          deviceId,
          reason: '이전 실행이 아직 진행 중이어서 새 실행을 건너뛰었습니다.',
          triggerSource,
          workflowRunEventStore,
          workflowRunStore,
        })

        return workflow
      }

      workflowRunLocks.add(id)
      try {
        if (workflow.state.status === 'running') {
          await createSkippedWorkflowRun(workflow, {
            actorId,
            actorType,
            deviceId,
            reason: 'Workflow가 이미 실행 중이어서 새 실행을 건너뛰었습니다.',
            triggerSource,
            workflowRunEventStore,
            workflowRunStore,
          })
          return workflow
        }
        getRunnableActionRefs(workflow)
        const actions = await actionStore.listActions()
        const mappingValidation = validateWorkflowInputMappings(workflow, actions)
        if (!mappingValidation.ok) {
          throw new Error(mappingValidation.errors.join('\n'))
        }
        return await runActionWorkflow(workflow, actions, {
          adapterRegistry,
          actorId,
          actorType,
          dataDir,
          deviceId,
          triggerSource,
          appSettingsStore,
          workflowRunEventStore,
          workflowRunStore,
          workflowArtifactWriter,
          actionStore,
          workflowStore,
          urlGroupStore,
          urlGroupItemRunStore,
          toolModuleRunner,
        })
      } finally {
        workflowRunLocks.delete(id)
      }
    },
    async stopWorkflow(id) {
      const workflow = await getWorkflow(id)
      const actions = await actionStore.listActions()
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
          await actionStore.updateAction(action.id, {
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
    actorId?: string
    actorType: WorkflowRunActorType
    appSettingsStore: AppSettingsStore
    dataDir: string
    deviceId: string
    triggerSource: WorkflowRunTriggerSource
    workflowRunEventStore: WorkflowRunEventStore
    workflowRunStore: WorkflowRunStore
    workflowArtifactWriter: WorkflowArtifactWriter
    actionStore: ActionStore
    workflowStore: WorkflowStore
    urlGroupStore: UrlGroupStore
    urlGroupItemRunStore: UrlGroupItemRunStore
    toolModuleRunner: ToolModuleRunner
  },
): Promise<WorkflowDefinition> {
  const actionMap = new Map(actions.map((action) => [action.id, action]))
  const enabledActionRefs = workflow.actionRefs
    .filter((actionRef) => actionRef.enabled)
    .sort((left, right) => left.order - right.order)
  let outputScope: Record<string, unknown> = {}
  let currentActionRunId: string | undefined
  const runStartedAt = new Date().toISOString()
  const workflowRun = await context.workflowRunStore.createRun({
    workflowId: workflow.id,
    actorType: context.actorType,
    actorId: context.actorId,
    triggerSource: context.triggerSource,
    status: 'running',
    startedAt: runStartedAt,
    workflowSnapshot: createWorkflowRunSnapshot(workflow, actions),
  })

  await context.workflowStore.updateWorkflow(workflow.id, {
    state: {
      ...workflow.state,
      status: 'running',
      startedAt: runStartedAt,
      lastMessage: 'Workflow 실행을 시작했습니다.',
      lastError: undefined,
    },
  })
  await context.workflowRunEventStore.appendEvent({
    runId: workflowRun.id,
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
        const actionRun = await context.workflowRunStore.createActionRun({
          runId: workflowRun.id,
          workflowId: workflow.id,
          actionRefId: actionRef.id,
          actionId: action.id,
          order: actionRef.order,
          status: 'running',
          startedAt: new Date().toISOString(),
          inputSummary: summarizeValue(action.config),
        })
        currentActionRunId = actionRun.id
        const actionStartedAt = new Date().toISOString()
        await adapter.validateConfig(action.config)
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
        const actionWithMappedInput =
          action.type === 'browser_action'
            ? await resolveBrowserActionUrlGroup(action, context.urlGroupStore)
            : resolveActionInputMapping(action, actionRef.inputMapping, outputScope)
        await createBrowserUrlGroupItemRuns({
          action,
          actionRunId: actionRun.id,
          context,
          runId: workflowRun.id,
          workflowId: workflow.id,
        })
        const result = await runWithRetry(
          actionRef,
          context,
          workflow.id,
          workflowRun.id,
          actionRun.id,
          () =>
            adapter.run({
              action: actionWithMappedInput,
              deviceId: context.deviceId,
              dataDir: context.dataDir,
              appSettings: appSettingsSnapshot.settings,
              async updateConfig(config) {
                await context.actionStore.updateAction(action.id, { config })
              },
              async updateState(state) {
                const runtimeState = state as Partial<ActionRuntimeState>
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
                  runtimeState
                )
                await context.workflowStore.updateWorkflow(workflow.id, {
                  state: {
                    ...(currentWorkflow?.state ?? workflow.state),
                    ...(runtimeState as Partial<WorkflowState>),
                    actionStates: nextActionState.actionStates,
                  },
                })

                if (runtimeState.status && runtimeState.status !== 'running') {
                  const endedAt = runtimeState.endedAt ?? new Date().toISOString()
                  const actionRunStatus = mapRunStatusToActionRunStatus(runtimeState.status)
                  await context.workflowRunStore.updateActionRun(actionRun.id, {
                    status: actionRunStatus,
                    endedAt,
                    outputSummary: summarizeValue(runtimeState),
                    error: runtimeState.lastError,
                  })
                  await context.workflowRunStore.updateRun(workflowRun.id, {
                    status: actionRunStatus === 'failed' ? 'failed' : 'succeeded',
                    endedAt,
                    summary: runtimeState.lastMessage,
                    error: runtimeState.lastError,
                  })
                  await context.workflowRunEventStore.appendEvent({
                    runId: workflowRun.id,
                    workflowId: workflow.id,
                    actionRunId: actionRun.id,
                    deviceId: context.deviceId,
                    status: runtimeState.status,
                    message: runtimeState.lastMessage ?? `${action.name} Action 상태를 갱신했습니다.`,
                  })
                  await context.urlGroupItemRunStore.completeActionItemRuns(
                    actionRun.id,
                    {
                      status: actionRunStatus === 'failed' ? 'failed' : 'succeeded',
                      endedAt,
                      message: runtimeState.lastMessage,
                      error: runtimeState.lastError,
                    },
                  )
                }
              },
            }),
        )
        const resultState = result.state as WorkflowState
        const actionEndedAt =
          resultState.status === 'running' ? undefined : new Date().toISOString()
        await context.workflowRunStore.updateActionRun(actionRun.id, {
          status: mapRunStatusToActionRunStatus(resultState.status),
          endedAt: actionEndedAt,
          outputSummary: summarizeValue(resultState),
          error: resultState.lastError,
        })
        if (actionEndedAt) {
          await context.urlGroupItemRunStore.completeActionItemRuns(
            actionRun.id,
            {
              status:
                resultState.status === 'failed' ? 'failed' : 'succeeded',
              endedAt: actionEndedAt,
              message: resultState.lastMessage,
              error: resultState.lastError,
            },
          )
        }
        currentActionRunId = undefined
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
                : actionEndedAt,
          },
        )
        outputScope = {
          ...outputScope,
          [actionRef.id]: getActionOutputScopeValue(action, resultState),
        }
        await context.workflowRunEventStore.appendEvent({
          runId: workflowRun.id,
          workflowId: workflow.id,
          actionRunId: actionRun.id,
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
      const toolId = config.toolId

      const toolInput = {
        ...(config.inputDefaults ?? {}),
        ...resolveInputMapping(actionRef.inputMapping, outputScope),
      }
      const toolActionRun = await context.workflowRunStore.createActionRun({
        runId: workflowRun.id,
        workflowId: workflow.id,
        actionRefId: actionRef.id,
        actionId: action.id,
        order: actionRef.order,
        status: 'running',
        startedAt: new Date().toISOString(),
        inputSummary: summarizeValue(toolInput),
      })
      currentActionRunId = toolActionRun.id
      const result = await runWithRetry(
        actionRef,
        context,
        workflow.id,
        workflowRun.id,
        toolActionRun.id,
        () =>
          context.toolModuleRunner.runTool(toolId, {
            ...toolInput,
          }),
      )
      const completedAt = new Date().toISOString()
      const outputArtifacts =
        await context.workflowArtifactWriter.saveOutputArtifacts({
          runId: workflowRun.id,
          workflowId: workflow.id,
          actionRunId: toolActionRun.id,
          output: result.output,
        })
      await context.workflowRunStore.updateActionRun(toolActionRun.id, {
        status: 'succeeded',
        endedAt: completedAt,
        outputSummary: summarizeValueWithArtifacts(result.output, outputArtifacts),
      })
      currentActionRunId = undefined
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
        runId: workflowRun.id,
        workflowId: workflow.id,
        actionRunId: toolActionRun.id,
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
    await context.workflowRunStore.updateRun(workflowRun.id, {
      status: 'succeeded',
      endedAt: completedWorkflow.state.endedAt,
      summary: completedWorkflow.state.lastMessage,
    })
    await context.workflowRunEventStore.appendEvent({
      runId: workflowRun.id,
      workflowId: workflow.id,
      deviceId: context.deviceId,
      status: 'idle',
      message: completedWorkflow.state.lastMessage,
    })

    return completedWorkflow
  } catch (error) {
    if (currentActionRunId) {
      await context.workflowRunStore.updateActionRun(currentActionRunId, {
        status: 'failed',
        endedAt: new Date().toISOString(),
        error: getErrorMessage(error),
      })
      await context.urlGroupItemRunStore.completeActionItemRuns(
        currentActionRunId,
        {
          status: 'failed',
          error: getErrorMessage(error),
        },
      )
    }
    const failedWorkflow = await context.workflowStore.updateWorkflow(workflow.id, {
      state: {
        ...(await getLatestWorkflowState(context.workflowStore, workflow.id)),
        status: 'failed',
        endedAt: new Date().toISOString(),
        lastError: getErrorMessage(error),
      },
    })
    await context.workflowRunStore.updateRun(workflowRun.id, {
      status: 'failed',
      endedAt: failedWorkflow.state.endedAt,
      error: failedWorkflow.state.lastError,
    })
    await context.workflowRunEventStore.appendEvent({
      runId: workflowRun.id,
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

async function createSkippedWorkflowRun(
  workflow: WorkflowDefinition,
  input: {
    actorId?: string
    actorType: WorkflowRunActorType
    deviceId: string
    reason: string
    triggerSource: WorkflowRunTriggerSource
    workflowRunEventStore: WorkflowRunEventStore
    workflowRunStore: WorkflowRunStore
  },
): Promise<void> {
  const now = new Date().toISOString()
  const workflowRun = await input.workflowRunStore.createRun({
    workflowId: workflow.id,
    actorType: input.actorType,
    actorId: input.actorId,
    triggerSource: input.triggerSource,
    status: 'skipped',
    startedAt: now,
    summary: input.reason,
    workflowSnapshot: sanitizeSnapshotValue(workflow),
  })
  await input.workflowRunStore.updateRun(workflowRun.id, {
    endedAt: now,
  })
  await input.workflowRunEventStore.appendEvent({
    runId: workflowRun.id,
    workflowId: workflow.id,
    deviceId: input.deviceId,
    status: 'idle',
    message: input.reason,
  })
}

async function assertWorkflowRunPolicy(
  workflow: WorkflowDefinition,
  input: {
    actorId?: string
    actorType: WorkflowRunActorType
    workflowRunStore: WorkflowRunStore
  },
): Promise<void> {
  const policy = workflow.runPolicy
  if (!policy) {
    return
  }

  if (
    policy.allowedActors?.length &&
    !policy.allowedActors.includes(input.actorType)
  ) {
    throw new Error(`Workflow 실행 주체가 허용되지 않았습니다: ${input.actorType}`)
  }

  if (input.actorType === 'schedule' && policy.allowSchedule === false) {
    throw new Error('Workflow schedule 실행이 정책으로 비활성화되었습니다.')
  }

  if (
    input.actorType === 'external_bridge' &&
    policy.allowedExternalClientIds?.length &&
    (!input.actorId || !policy.allowedExternalClientIds.includes(input.actorId))
  ) {
    throw new Error('허용되지 않은 외부 client의 Workflow 실행 요청입니다.')
  }

  if (policy.requiresConfirmation === true && input.actorType !== 'user') {
    throw new Error('Workflow 실행 전 사용자 확인이 필요합니다.')
  }

  if (!policy.maxRunsPerHour) {
    return
  }

  const oneHourAgo = Date.now() - 60 * 60_000
  const recentRuns = await input.workflowRunStore.listRuns(workflow.id, {
    limit: 500,
  })
  const runCount = recentRuns.filter((run) => {
    const createdAtTime = new Date(run.createdAt).getTime()
    return (
      Number.isFinite(createdAtTime) &&
      createdAtTime >= oneHourAgo &&
      run.status !== 'cancelled' &&
      run.status !== 'skipped'
    )
  }).length

  if (runCount >= policy.maxRunsPerHour) {
    throw new Error('Workflow 시간당 실행 한도를 초과했습니다.')
  }
}

async function runWithRetry<TResult>(
  actionRef: WorkflowDefinition['actionRefs'][number],
  context: {
    deviceId: string
    workflowRunEventStore: WorkflowRunEventStore
  },
  workflowId: string,
  runId: string,
  actionRunId: string,
  run: () => Promise<TResult>,
): Promise<TResult> {
  const retryCount = actionRef.retryPolicy?.retryCount ?? 0
  const retryDelaySeconds = actionRef.retryPolicy?.retryDelaySeconds ?? 0
  const maxAttempts = retryCount + 1

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await run()
    } catch (error) {
      if (attempt >= maxAttempts) {
        throw error
      }

      await context.workflowRunEventStore.appendEvent({
        runId,
        workflowId,
        actionRunId,
        deviceId: context.deviceId,
        status: 'running',
        message: `Action 실행 실패로 재시도합니다. (${attempt}/${retryCount}) ${getErrorMessage(error)}`,
      })

      if (retryDelaySeconds > 0) {
        await delay(retryDelaySeconds * 1000)
      }
    }
  }

  throw new Error('Action retry 실행 상태가 올바르지 않습니다.')
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

function getActionOutputScopeValue(
  action: ActionDefinition,
  state: WorkflowState,
): unknown {
  const stateRecord = state as unknown
  if (
    action.type === 'transform_action' &&
    isRecord(stateRecord) &&
    isRecord(stateRecord.output)
  ) {
    return stateRecord.output
  }

  return state
}

async function resolveBrowserActionUrlGroup(
  action: ActionDefinition,
  urlGroupStore: UrlGroupStore,
): Promise<ActionDefinition> {
  if (!isRecord(action.config) || typeof action.config.urlGroupId !== 'string') {
    return action
  }

  const urlGroup = await urlGroupStore.getUrlGroup(action.config.urlGroupId)
  const initialUrls = urlGroup.items
    .filter((item) => item.enabled)
    .map((item) => item.url)

  return {
    ...action,
    config: {
      ...action.config,
      initialUrls,
    },
  }
}

async function createBrowserUrlGroupItemRuns(input: {
  action: ActionDefinition
  actionRunId: string
  context: {
    urlGroupItemRunStore: UrlGroupItemRunStore
    urlGroupStore: UrlGroupStore
  }
  runId: string
  workflowId: string
}): Promise<void> {
  if (
    input.action.type !== 'browser_action' ||
    !isRecord(input.action.config) ||
    typeof input.action.config.urlGroupId !== 'string'
  ) {
    return
  }

  const urlGroup = await input.context.urlGroupStore.getUrlGroup(
    input.action.config.urlGroupId,
  )
  const enabledItems = urlGroup.items.filter((item) => item.enabled)
  if (enabledItems.length === 0) {
    return
  }

  await input.context.urlGroupItemRunStore.createItemRuns({
    runId: input.runId,
    workflowId: input.workflowId,
    actionRunId: input.actionRunId,
    urlGroupId: urlGroup.id,
    items: enabledItems,
  })
}

function resolveInputMapping(
  inputMapping: WorkflowInputMapping | undefined,
  outputScope: Record<string, unknown>,
): Record<string, unknown> {
  if (!inputMapping) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(inputMapping).map(([inputKey, mappingSource]) => {
      const source = parseMappingSource(mappingSource)
      const sourceValue = outputScope[source.actionRefId]
      const outputValue =
        source.outputKey && isRecord(sourceValue)
          ? sourceValue[source.outputKey]
          : sourceValue

      return [
        inputKey,
        source.path ? readDotPath(outputValue, source.path) : outputValue,
      ]
    }),
  )
}

function resolveActionInputMapping(
  action: ActionDefinition,
  inputMapping: WorkflowInputMapping | undefined,
  outputScope: Record<string, unknown>,
): ActionDefinition {
  if (!inputMapping || !canReceiveMappedInput(action.type)) {
    return action
  }

  return {
    ...action,
    config: {
      ...(isRecord(action.config) ? action.config : {}),
      input: resolveInputMapping(inputMapping, outputScope),
    },
  }
}

function canReceiveMappedInput(actionType: ActionDefinition['type']): boolean {
  return (
    actionType === 'transform_action' ||
    actionType === 'scrap_action' ||
    actionType === 'database_action' ||
    actionType === 'webhook_action' ||
    actionType === 'macro_action'
  )
}

function readDotPath(value: unknown, pathValue: string): unknown {
  if (!pathValue.trim()) {
    return value
  }

  return pathValue.split('.').reduce<unknown>((currentValue, segment) => {
    if (currentValue === undefined || currentValue === null) {
      return undefined
    }

    if (Array.isArray(currentValue) && /^\d+$/.test(segment)) {
      return currentValue[Number(segment)]
    }

    if (isRecord(currentValue)) {
      return currentValue[segment]
    }

    return undefined
  }, value)
}

function mapRunStatusToActionRunStatus(
  status: ActionRuntimeState['status'],
) {
  switch (status) {
    case 'idle':
    case 'succeeded':
      return 'succeeded'
    case 'running':
      return 'running'
    case 'failed':
      return 'failed'
  }
}

function createWorkflowRunSnapshot(
  workflow: WorkflowDefinition,
  actions: ActionDefinition[],
): unknown {
  const actionIds = new Set(
    workflow.actionRefs.map((actionRef) => actionRef.actionId),
  )

  return {
    workflow: sanitizeSnapshotValue(workflow),
    actions: actions
      .filter((action) => actionIds.has(action.id))
      .map((action) => sanitizeSnapshotValue(action)),
  }
}

function summarizeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return { type: String(value) }
  }

  if (Array.isArray(value)) {
    return {
      type: 'array',
      length: value.length,
      preview: value.slice(0, 3).map(summarizeValue),
    }
  }

  if (typeof value === 'object') {
    return {
      type: 'object',
      keys: Object.keys(value).slice(0, 20),
    }
  }

  if (typeof value === 'string') {
    return {
      type: 'string',
      length: value.length,
      preview: value.slice(0, 120),
    }
  }

  return {
    type: typeof value,
    value,
  }
}

function summarizeValueWithArtifacts(
  value: unknown,
  artifacts: WorkflowArtifactRef[],
): unknown {
  const summary = summarizeValue(value)

  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) {
    return { summary, artifacts }
  }

  return {
    ...summary,
    artifacts,
  }
}

function sanitizeSnapshotValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeSnapshotValue)
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      isSensitiveSnapshotKey(key) ? '[redacted]' : sanitizeSnapshotValue(item),
    ]),
  )
}

function isSensitiveSnapshotKey(key: string): boolean {
  return /secret|password|token|api[_-]?key|credential/i.test(key)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : '알 수 없는 Workflow 실행 오류가 발생했습니다.'
}
