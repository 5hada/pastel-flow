import {
  normalizeDevicePolicy,
  normalizeLinkedDevices,
  type CurrentDevice,
  type LinkedDevice,
} from './devices'
import type { ActionDefinition, ActionIOField, ActionType } from './actions'
import {
  defaultWorkflowState,
  normalizeWorkflowGraph,
  normalizeWorkflowRunPolicy,
  normalizeWorkflowSchedule,
  type WorkflowActionRef,
  type WorkflowDefinition,
  type WorkflowInputMapping,
  type WorkflowState,
} from './workflows'
import type { RunStatus, WorkflowRunEvent } from './runStatus'
import type { SecretScope } from './secrets'
import type { TodoItem } from './todos'

export type SyncActionDefinition = ActionDefinition
export type SyncWorkflowDefinition = WorkflowDefinition
export type SyncTodoItem = TodoItem

export type SyncExportSnapshot = {
  schemaVersion: 1
  exportedAt: string
  sourceDevice: CurrentDevice
  actions: SyncActionDefinition[]
  workflows: SyncWorkflowDefinition[]
  todos: SyncTodoItem[]
  workflowRunEvents: WorkflowRunEvent[]
  linkedDevices: LinkedDevice[]
}

export type SyncImportResult = {
  importedAt: string
  workflowRunEventsAdded: number
  linkedDevicesMerged: number
  todosMerged: number
}

export type SyncMode = 'mock_file'

export type SyncStatus = {
  mode: SyncMode
  serverDbSyncEnabled: false
  message: string
  lastExportedAt?: string
  exportPath: string
}

export function normalizeSyncExportSnapshot(
  value: unknown,
): SyncExportSnapshot {
  if (!value || typeof value !== 'object') {
    throw new Error('동기화 스냅샷 형식이 올바르지 않습니다.')
  }

  const candidate = value as Partial<SyncExportSnapshot>
  if (candidate.schemaVersion !== 1) {
    throw new Error('지원하지 않는 동기화 스냅샷 버전입니다.')
  }

  if (
    typeof candidate.exportedAt !== 'string' ||
    !candidate.sourceDevice ||
    !Array.isArray(candidate.workflowRunEvents) ||
    !Array.isArray(candidate.linkedDevices)
  ) {
    throw new Error('동기화 스냅샷 필수 필드가 누락되었습니다.')
  }

  return {
    schemaVersion: 1,
    exportedAt: candidate.exportedAt,
    sourceDevice: normalizeCurrentDevice(candidate.sourceDevice),
    actions: normalizeSyncActions(candidate.actions),
    workflows: normalizeSyncWorkflows(candidate.workflows),
    todos: normalizeSyncTodos(candidate.todos),
    workflowRunEvents: candidate.workflowRunEvents.map(normalizeWorkflowRunEvent),
    linkedDevices: normalizeLinkedDevices(candidate.linkedDevices),
  }
}

export function sanitizeActionsForSyncExport(
  actions: ActionDefinition[],
): SyncActionDefinition[] {
  return actions.map((action) => ({
    ...action,
    config: sanitizeActionConfig(action.type, action.config),
  }))
}

export function sanitizeWorkflowsForSyncExport(
  workflows: WorkflowDefinition[],
): SyncWorkflowDefinition[] {
  return workflows.map((workflow) => ({
    ...workflow,
    state: {
      ...workflow.state,
      localProfilePath: undefined,
    } as WorkflowState,
  }))
}

function normalizeCurrentDevice(value: unknown): CurrentDevice {
  if (!value || typeof value !== 'object') {
    throw new Error('동기화 스냅샷 sourceDevice 형식이 올바르지 않습니다.')
  }

  const candidate = value as Partial<CurrentDevice>
  if (
    typeof candidate.id !== 'string' ||
    !candidate.id.trim() ||
    typeof candidate.name !== 'string' ||
    !candidate.name.trim()
  ) {
    throw new Error('동기화 스냅샷 sourceDevice 필수 필드가 누락되었습니다.')
  }

  return {
    id: candidate.id.trim(),
    name: candidate.name.trim(),
  }
}

function normalizeSyncActions(value: unknown): SyncActionDefinition[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map(normalizeSyncAction)
}

function normalizeSyncAction(value: unknown): SyncActionDefinition {
  if (!isRecord(value)) {
    throw new Error('동기화 스냅샷 Action 형식이 올바르지 않습니다.')
  }

  if (
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.name) ||
    !isActionType(value.type) ||
    !isNonEmptyString(value.createdAt) ||
    !isNonEmptyString(value.updatedAt) ||
    !('config' in value)
  ) {
    throw new Error('동기화 스냅샷 Action 필수 필드가 누락되었습니다.')
  }

  return {
    id: value.id.trim(),
    name: value.name.trim(),
    type: value.type,
    config: value.config,
    secretRefs: normalizeSecretRefs(value.secretRefs),
    inputSchema: normalizeActionIoFields(value.inputSchema),
    outputSchema: normalizeActionIoFields(value.outputSchema),
    createdAt: value.createdAt.trim(),
    updatedAt: value.updatedAt.trim(),
  }
}

function normalizeSyncWorkflows(value: unknown): SyncWorkflowDefinition[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map(normalizeSyncWorkflow)
}

function normalizeSyncWorkflow(value: unknown): SyncWorkflowDefinition {
  if (!isRecord(value)) {
    throw new Error('동기화 스냅샷 Workflow 형식이 올바르지 않습니다.')
  }

  if (
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.name) ||
    !Array.isArray(value.actionRefs) ||
    !isNonEmptyString(value.createdAt) ||
    !isNonEmptyString(value.updatedAt)
  ) {
    throw new Error('동기화 스냅샷 Workflow 필수 필드가 누락되었습니다.')
  }

  return {
    id: value.id.trim(),
    name: value.name.trim(),
    actionRefs: normalizeWorkflowActionRefs(value.actionRefs),
    graph: normalizeWorkflowGraph(value.graph),
    permissions: normalizeDevicePolicy(
      isRecord(value.permissions) ? value.permissions : undefined,
    ),
    runPolicy: normalizeWorkflowRunPolicy(
      isRecord(value.runPolicy) ? value.runPolicy : undefined,
    ),
    schedule: normalizeWorkflowSchedule(
      isRecord(value.schedule) ? value.schedule : undefined,
    ),
    state: normalizeWorkflowState(value.state),
    createdAt: value.createdAt.trim(),
    updatedAt: value.updatedAt.trim(),
  }
}

function normalizeWorkflowActionRefs(value: unknown[]): WorkflowActionRef[] {
  return value
    .map((actionRef, index): WorkflowActionRef | null => {
      if (!isRecord(actionRef) || !isNonEmptyString(actionRef.actionId)) {
        return null
      }

      return {
        id: isNonEmptyString(actionRef.id) ? actionRef.id.trim() : `${actionRef.actionId}-${index}`,
        actionId: actionRef.actionId.trim(),
        order:
          typeof actionRef.order === 'number' && Number.isFinite(actionRef.order)
            ? actionRef.order
            : index,
        inputMapping: normalizeWorkflowInputMapping(actionRef.inputMapping),
        retryPolicy: normalizeWorkflowActionRetryPolicy(actionRef.retryPolicy),
        enabled: actionRef.enabled !== false,
      }
    })
    .filter((actionRef): actionRef is WorkflowActionRef => Boolean(actionRef))
    .sort((left, right) => left.order - right.order)
    .map((actionRef, index) => ({
      ...actionRef,
      order: index,
    }))
}

function normalizeWorkflowActionRetryPolicy(
  value: unknown,
): WorkflowActionRef['retryPolicy'] {
  if (!isRecord(value)) {
    return undefined
  }

  const retryCount = clampInteger(value.retryCount, 0, 5)
  const retryDelaySeconds = clampInteger(value.retryDelaySeconds, 0, 300)

  if (retryCount === 0 && retryDelaySeconds === 0) {
    return undefined
  }

  return {
    retryCount,
    retryDelaySeconds,
  }
}

function normalizeWorkflowState(value: unknown): WorkflowState {
  if (!isRecord(value)) {
    return defaultWorkflowState
  }

  const actionStates = isRecord(value.actionStates)
    ? Object.fromEntries(
        Object.entries(value.actionStates).flatMap(([actionId, actionState]) => {
          if (!isNonEmptyString(actionId) || !isRecord(actionState)) {
            return []
          }

          return [
            [
              actionId,
              {
                ...actionState,
                status: isRunStatus(actionState.status)
                  ? actionState.status
                  : defaultWorkflowState.status,
              },
            ],
          ]
        }),
      )
    : undefined

  return {
    status: isRunStatus(value.status) ? value.status : defaultWorkflowState.status,
    actionStates,
    startedAt: optionalString(value.startedAt),
    endedAt: optionalString(value.endedAt),
    lastError: optionalString(value.lastError),
    lastMessage: optionalString(value.lastMessage),
  }
}

function normalizeWorkflowRunEvent(value: unknown): WorkflowRunEvent {
  if (!isRecord(value)) {
    throw new Error('동기화 스냅샷 Workflow run event 형식이 올바르지 않습니다.')
  }

  if (
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.workflowId) ||
    !isNonEmptyString(value.deviceId) ||
    !isRunStatus(value.status) ||
    !isNonEmptyString(value.createdAt)
  ) {
    throw new Error('동기화 스냅샷 Workflow run event 필수 필드가 누락되었습니다.')
  }

  return {
    id: value.id.trim(),
    runId: optionalString(value.runId),
    workflowId: value.workflowId.trim(),
    actionRunId: optionalString(value.actionRunId),
    deviceId: value.deviceId.trim(),
    status: value.status,
    message: optionalString(value.message),
    createdAt: value.createdAt.trim(),
  }
}

function normalizeSyncTodos(value: unknown): SyncTodoItem[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map(normalizeSyncTodo)
}

function normalizeSyncTodo(value: unknown): SyncTodoItem {
  if (!isRecord(value)) {
    throw new Error('동기화 스냅샷 Todo 형식이 올바르지 않습니다.')
  }

  if (
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.title) ||
    typeof value.completed !== 'boolean' ||
    !isNonEmptyString(value.createdAt) ||
    !isNonEmptyString(value.updatedAt)
  ) {
    throw new Error('동기화 스냅샷 Todo 필수 필드가 누락되었습니다.')
  }

  return {
    id: value.id.trim(),
    title: value.title.trim(),
    dueAt: optionalString(value.dueAt),
    category: optionalString(value.category),
    details: optionalString(value.details),
    completed: value.completed,
    completedAt: optionalString(value.completedAt),
    deletedAt: optionalString(value.deletedAt),
    createdAt: value.createdAt.trim(),
    updatedAt: value.updatedAt.trim(),
  }
}

function sanitizeActionConfig(
  actionType: ActionType,
  config: unknown,
): unknown {
  if (!isRecord(config)) {
    return config
  }

  switch (actionType) {
    case 'browser_action':
      return sanitizeBrowserActionConfig(config)
    case 'tool_action':
      return sanitizeToolActionConfig(config)
    case 'crawler_action':
    case 'database_action':
    case 'discord_dry_run_action':
    case 'macro_action':
    case 'notion_dry_run_action':
    case 'scrap_action':
    case 'trading_dry_run_action':
    case 'transform_action':
    case 'webhook_action':
      return config
  }
}

function sanitizeBrowserActionConfig(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const syncSafeConfig = { ...config }
  delete syncSafeConfig.existingProfilePath
  delete syncSafeConfig.tabGroupSnapshot

  return syncSafeConfig
}

function sanitizeToolActionConfig(
  config: Record<string, unknown>,
): Record<string, unknown> {
  if (!isRecord(config.inputDefaults)) {
    return config
  }

  return {
    ...config,
    inputDefaults: Object.fromEntries(
      Object.entries(config.inputDefaults).filter(
        ([key]) => !isSensitiveConfigKey(key),
      ),
    ),
  }
}

function normalizeSecretRefs(value: unknown): ActionDefinition['secretRefs'] {
  if (!Array.isArray(value)) {
    return undefined
  }

  const secretRefs = value.flatMap((secretRef) => {
    if (
      !isRecord(secretRef) ||
      !isNonEmptyString(secretRef.id) ||
      !isSecretScope(secretRef.scope)
    ) {
      return []
    }

    const scope = secretRef.scope

    return [
      {
        id: secretRef.id.trim(),
        scope,
        description: optionalString(secretRef.description),
      },
    ]
  })

  return secretRefs.length > 0 ? secretRefs : undefined
}

function normalizeActionIoFields(value: unknown): ActionIOField[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const fields = value.flatMap((field) => {
    if (
      !isRecord(field) ||
      !isNonEmptyString(field.id) ||
      !isNonEmptyString(field.name) ||
      !isActionIoFieldType(field.type)
    ) {
      return []
    }

    return [
      {
        id: field.id.trim(),
        name: field.name.trim(),
        type: field.type,
        required: field.required === true,
        description: optionalString(field.description),
      },
    ]
  })

  return fields.length > 0 ? fields : undefined
}

function normalizeWorkflowInputMapping(
  value: unknown,
): WorkflowInputMapping | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const entries = Object.entries(value).flatMap(([key, item]) => {
    if (!isNonEmptyString(key) || !isRecord(item)) {
      return []
    }

    if (!isNonEmptyString(item.actionRefId)) {
      return []
    }

    return [
      [
        key,
        {
          actionRefId: item.actionRefId.trim(),
          outputKey: optionalString(item.outputKey),
          path: optionalString(item.path),
        },
      ],
    ]
  })

  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

function isActionType(value: unknown): value is ActionType {
  return (
    value === 'browser_action' ||
    value === 'crawler_action' ||
    value === 'discord_dry_run_action' ||
    value === 'notion_dry_run_action' ||
    value === 'trading_dry_run_action' ||
    value === 'transform_action' ||
    value === 'tool_action' ||
    value === 'webhook_action' ||
    value === 'scrap_action' ||
    value === 'database_action' ||
    value === 'macro_action'
  )
}

function isActionIoFieldType(value: unknown): value is ActionIOField['type'] {
  return (
    value === 'string' ||
    value === 'number' ||
    value === 'boolean' ||
    value === 'json' ||
    value === 'secret_ref' ||
    value === 'string[]' ||
    value === 'number[]' ||
    value === 'boolean[]' ||
    value === 'file' ||
    value === 'file[]' ||
    value === 'image' ||
    value === 'image[]' ||
    value === 'url' ||
    value === 'url[]' ||
    value === 'scrap' ||
    value === 'scrap[]' ||
    value === 'scrap_collection' ||
    value === 'document' ||
    value === 'document[]' ||
    value === 'chunk' ||
    value === 'chunk[]' ||
    value === 'any'
  )
}

function isRunStatus(value: unknown): value is RunStatus {
  return (
    value === 'idle' ||
    value === 'running' ||
    value === 'succeeded' ||
    value === 'failed'
  )
}

function isSecretScope(value: unknown): value is SecretScope {
  return value === 'local_device' || value === 'trusted_devices'
}

function isSensitiveConfigKey(key: string): boolean {
  return /secret|password|token|api[_-]?key|credential/i.test(key)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function clampInteger(value: unknown, min: number, max: number): number {
  const numericValue = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numericValue)) {
    return min
  }

  return Math.min(max, Math.max(min, Math.floor(numericValue)))
}
