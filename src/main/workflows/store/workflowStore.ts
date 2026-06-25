import { randomUUID } from 'node:crypto'
import {
  defaultDevicePolicy,
  normalizeDevicePolicy,
} from '../../../shared/devices/'
import {
  defaultWorkflowState,
  normalizeWorkflowGraph,
  normalizeWorkflowRunPolicy,
  normalizeWorkflowSchedule,
  type CreateWorkflowInput,
  type UpdateWorkflowInput,
  type WorkflowDefinition,
} from '../../../shared/workflows'
import type { ActionDefinition } from '../../../shared/actions'
import type { TaskDefinitionFileStore } from '../../tasks/taskDefinitionFile'

export type WorkflowStore = {
  listWorkflows(): Promise<WorkflowDefinition[]>
  createWorkflow(input: CreateWorkflowInput): Promise<WorkflowDefinition>
  updateWorkflow(
    id: string,
    input: UpdateWorkflowInput,
  ): Promise<WorkflowDefinition>
  replaceWorkflows(input: ReplaceWorkflowsInput): Promise<void>
  replaceWorkflowData(input: ReplaceWorkflowDataInput): Promise<void>
  deleteWorkflow(id: string): Promise<void>
}

export type ReplaceWorkflowsInput = {
  workflows?: WorkflowDefinition[]
}
export type ReplaceWorkflowDataInput = ReplaceWorkflowsInput

export type WorkflowStoreOptions = {
  taskFileStore: TaskDefinitionFileStore
}

export function createWorkflowStore({
  taskFileStore,
}: WorkflowStoreOptions): WorkflowStore {
  return {
    async listWorkflows() {
      const taskFile = await taskFileStore.read()
      return taskFile.workflows
    },

    async createWorkflow(input) {
      const now = new Date().toISOString()
      return taskFileStore.update((taskFile) => {
        const actionRefs = normalizeWorkflowActionRefs(input.actionRefs ?? [])
        assertWorkflowActionRefsExist(actionRefs, taskFile.actions)

        const workflow: WorkflowDefinition = {
          id: randomUUID(),
          name: normalizeWorkflowName(input.name),
          actionRefs,
          graph: normalizeWorkflowGraph(input.graph),
          permissions: normalizeDevicePolicy(
            input.permissions ?? defaultDevicePolicy,
          ),
          runPolicy: normalizeWorkflowRunPolicy(input.runPolicy),
          schedule: normalizeWorkflowSchedule(input.schedule),
          state: input.state ?? defaultWorkflowState,
          createdAt: now,
          updatedAt: now,
        }

        return {
          nextValue: {
            actions: taskFile.actions,
            workflows: [...taskFile.workflows, workflow],
          },
          result: workflow,
        }
      })
    },

    async updateWorkflow(id, input) {
      return taskFileStore.update((taskFile) => {
        const workflowIndex = taskFile.workflows.findIndex(
          (workflow) => workflow.id === id,
        )

        if (workflowIndex === -1) {
          throw new Error(`Workflow not found: ${id}`)
        }

        const currentWorkflow = taskFile.workflows[workflowIndex]
        const actionRefs =
          input.actionRefs === undefined
            ? currentWorkflow.actionRefs
            : normalizeWorkflowActionRefs(input.actionRefs)
        assertWorkflowActionRefsExist(actionRefs, taskFile.actions)

        const updatedWorkflow: WorkflowDefinition = {
          ...currentWorkflow,
          ...input,
          name:
            input.name === undefined
              ? currentWorkflow.name
              : normalizeWorkflowName(input.name),
          actionRefs,
          graph:
            input.graph === undefined
              ? currentWorkflow.graph
              : normalizeWorkflowGraph(input.graph),
          permissions: input.permissions
            ? normalizeDevicePolicy(input.permissions)
            : currentWorkflow.permissions,
          runPolicy:
            input.runPolicy === undefined
              ? currentWorkflow.runPolicy
              : normalizeWorkflowRunPolicy(input.runPolicy),
          schedule:
            input.schedule === undefined
              ? currentWorkflow.schedule
              : normalizeWorkflowSchedule(input.schedule),
          updatedAt: new Date().toISOString(),
        }
        const workflows = [...taskFile.workflows]
        workflows[workflowIndex] = updatedWorkflow

        return {
          nextValue: {
            ...taskFile,
            workflows,
          },
          result: updatedWorkflow,
        }
      })
    },

    async replaceWorkflows(input) {
      await replaceWorkflowFile(input)
    },

    async replaceWorkflowData(input) {
      await replaceWorkflowFile(input)
    },

    async deleteWorkflow(id) {
      await taskFileStore.update((taskFile) => {
        const workflow = taskFile.workflows.find(
          (currentWorkflow) => currentWorkflow.id === id,
        )

        if (!workflow) {
          throw new Error(`Workflow not found: ${id}`)
        }

        return {
          nextValue: {
            actions: taskFile.actions,
            workflows: taskFile.workflows.filter(
              (currentWorkflow) => currentWorkflow.id !== id,
            ),
          },
          result: undefined,
        }
      })
    },
  }

  async function replaceWorkflowFile(input: ReplaceWorkflowsInput): Promise<void> {
    const currentFile = await taskFileStore.read()
    const nextFile = {
      actions: currentFile.actions,
      workflows: input.workflows ?? [],
    }
    for (const workflow of nextFile.workflows) {
      assertWorkflowActionRefsExist(workflow.actionRefs, nextFile.actions)
    }
    await taskFileStore.write(nextFile)
  }
}

function normalizeWorkflowName(name: unknown): string {
  const trimmedName = typeof name === 'string' ? name.trim() : ''

  if (!trimmedName) {
    throw new Error('Workflow 이름이 필요합니다.')
  }

  return trimmedName
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

function assertWorkflowActionRefsExist(
  actionRefs: WorkflowDefinition['actionRefs'],
  actions: ActionDefinition[],
): void {
  const actionIds = new Set(actions.map((action) => action.id))
  const missingActionRef = actionRefs.find(
    (actionRef) => !actionIds.has(actionRef.actionId),
  )

  if (missingActionRef) {
    throw new Error(
      `Workflow Action 참조를 찾지 못했습니다: ${missingActionRef.actionId}`,
    )
  }
}
