import { randomUUID } from 'node:crypto'
import path from 'node:path'
import type { ActionDefinition } from '../../shared/actions'
import {
  defaultWorkflowState,
  normalizeWorkflowGraph,
  normalizeWorkflowRunPolicy,
  normalizeWorkflowSchedule,
  type WorkflowDefinition,
} from '../../shared/workflows'
import { normalizeDevicePolicy } from '../../shared/devices'
import {
  createAtomicJsonFile,
  type AtomicJsonFile,
} from '../database/atomicJsonFile'

export type TaskDefinitionFile = {
  actions: ActionDefinition[]
  workflows: WorkflowDefinition[]
}

export type TaskDefinitionFileStore = AtomicJsonFile<TaskDefinitionFile>

export type TaskDefinitionFileOptions = {
  dataDir: string
}

export function createTaskDefinitionFile({
  dataDir,
}: TaskDefinitionFileOptions): TaskDefinitionFileStore {
  return createAtomicJsonFile<TaskDefinitionFile>({
    filePath: path.join(dataDir, 'tasks.json'),
    defaultValue: () => ({ actions: [], workflows: [] }),
    normalize: normalizeTaskDefinitionFile,
  })
}

function normalizeTaskDefinitionFile(value: unknown): TaskDefinitionFile {
  const candidate = value as Partial<TaskDefinitionFile>
  const actions = Array.isArray(candidate.actions) ? candidate.actions : []
  const workflows = Array.isArray(candidate.workflows)
    ? candidate.workflows.map(normalizeStoredWorkflow)
    : []

  return {
    actions,
    workflows,
  }
}

function normalizeStoredWorkflow(
  workflow: WorkflowDefinition,
): WorkflowDefinition {
  return {
    ...workflow,
    name:
      typeof workflow.name === 'string' && workflow.name.trim()
        ? workflow.name.trim()
        : 'Untitled Workflow',
    actionRefs: normalizeWorkflowActionRefs(
      Array.isArray(workflow.actionRefs) ? workflow.actionRefs : [],
    ),
    graph: normalizeWorkflowGraph(workflow.graph),
    permissions: normalizeDevicePolicy(workflow.permissions),
    runPolicy: normalizeWorkflowRunPolicy(workflow.runPolicy),
    schedule: normalizeWorkflowSchedule(workflow.schedule),
    state: workflow.state ?? defaultWorkflowState,
  }
}

function normalizeWorkflowActionRefs(
  actionRefs: WorkflowDefinition['actionRefs'],
): WorkflowDefinition['actionRefs'] {
  return actionRefs
    .filter(
      (actionRef) =>
        typeof actionRef.actionId === 'string' && actionRef.actionId,
    )
    .map((actionRef, index) => ({
      id: actionRef.id || randomUUID(),
      actionId: actionRef.actionId,
      order: Number.isFinite(actionRef.order) ? actionRef.order : index,
      inputMapping: actionRef.inputMapping,
      retryPolicy: normalizeWorkflowActionRetryPolicy(actionRef.retryPolicy),
      enabled: actionRef.enabled !== false,
    }))
    .sort((left, right) => left.order - right.order)
    .map((actionRef, index) => ({
      ...actionRef,
      order: index,
    }))
}

function normalizeWorkflowActionRetryPolicy(
  retryPolicy: WorkflowDefinition['actionRefs'][number]['retryPolicy'],
): WorkflowDefinition['actionRefs'][number]['retryPolicy'] {
  if (!retryPolicy) {
    return undefined
  }

  const retryCount = clampInteger(retryPolicy.retryCount, 0, 5)
  const retryDelaySeconds = clampInteger(retryPolicy.retryDelaySeconds, 0, 300)

  if (retryCount === 0 && retryDelaySeconds === 0) {
    return undefined
  }

  return {
    retryCount,
    retryDelaySeconds,
  }
}

function clampInteger(value: unknown, min: number, max: number): number {
  const numericValue = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numericValue)) {
    return min
  }

  return Math.min(max, Math.max(min, Math.floor(numericValue)))
}
