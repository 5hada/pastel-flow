import { randomUUID } from 'node:crypto'
import path from 'node:path'
import {
  defaultDevicePolicy,
  normalizeDevicePolicy,
  type DevicePolicy
} from '../../../shared/devices/'
import {
  normalizeWorkflowSchedule,
  defaultWorkflowState,
  type WorkflowSchedule,
  type WorkflowDefinition,
  type WorkflowState
} from '../../../shared/workflows'
import type { ActionDefinition } from '../../../shared/actions'
import { createAtomicJsonFile } from '../../database/atomicJsonFile'


export type WorkflowStore = {
  getAction(id: string): Promise<ActionDefinition>
  listActions(): Promise<ActionDefinition[]>
  listWorkflows(): Promise<WorkflowDefinition[]>
  createAction(input: CreateActionInput): Promise<ActionDefinition>
  updateAction(id: string, input: UpdateActionInput): Promise<ActionDefinition>
  deleteAction(id: string): Promise<void>
  createWorkflow(input: CreateWorkflowInput): Promise<WorkflowDefinition>
  updateWorkflow(
    id: string,
    input: UpdateWorkflowInput,
  ): Promise<WorkflowDefinition>
  replaceWorkflows(input: ReplaceWorkflowsInput): Promise<void>
  replaceWorkflowData(input: ReplaceWorkflowDataInput): Promise<void>
  deleteWorkflow(id: string): Promise<void>
}

export type CreateActionInput<TConfig = unknown> = {
  name: string
  type: ActionDefinition<TConfig>['type']
  config: TConfig
  secretRefs?: ActionDefinition<TConfig>['secretRefs']
  inputSchema?: ActionDefinition<TConfig>['inputSchema']
  outputSchema?: ActionDefinition<TConfig>['outputSchema']
}

export type UpdateActionInput<TConfig = unknown> = Partial<
  Pick<
    ActionDefinition<TConfig>,
    'name' | 'type' | 'config' | 'secretRefs' | 'inputSchema' | 'outputSchema'
  >
>

export type CreateWorkflowInput = {
  name: string
  actionRefs?: WorkflowDefinition['actionRefs']
  permissions?: DevicePolicy
  schedule?: WorkflowSchedule
  state?: WorkflowState
}

export type UpdateWorkflowInput = Partial<
  Pick<WorkflowDefinition, 'name' | 'actionRefs' | 'permissions' | 'schedule' | 'state'>
>

export type ReplaceWorkflowsInput = {
  actions?: ActionDefinition[]
  workflows?: WorkflowDefinition[]
}
export type ReplaceWorkflowDataInput = ReplaceWorkflowsInput

export type WorkflowStoreOptions = {
  dataDir: string
}

type TaskFile = {
  actions: ActionDefinition[]
  workflows: WorkflowDefinition[]
}

export function createWorkflowStore({ dataDir }: WorkflowStoreOptions): WorkflowStore {
  const tasksFilePath = path.join(dataDir, 'tasks.json')
  const taskFileStore = createAtomicJsonFile<TaskFile>({
    filePath: tasksFilePath,
    defaultValue: () => ({ actions: [], workflows: [] }),
    normalize: normalizeTaskFile,
  })

  async function readTaskFile(): Promise<TaskFile> {
    return taskFileStore.read()
  }

  async function writeTaskFile(taskFile: TaskFile): Promise<void> {
    await taskFileStore.write(taskFile)
  }

  return {
    async getAction(id) {
      const taskFile = await readTaskFile()
      const action = taskFile.actions.find((currentAction) => currentAction.id === id)

      if (!action) {
        throw new Error(`Action not found: ${id}`)
      }

      return action
    },

    async listActions() {
      const taskFile = await readTaskFile()
      return taskFile.actions
    },

    async listWorkflows() {
      const taskFile = await readTaskFile()
      return taskFile.workflows
    },

    async createAction(input) {
      const now = new Date().toISOString()
      const action: ActionDefinition = {
        id: randomUUID(),
        name: input.name.trim(),
        type: input.type,
        config: input.config,
        secretRefs: input.secretRefs,
        inputSchema: input.inputSchema,
        outputSchema: input.outputSchema,
        createdAt: now,
        updatedAt: now,
      }
      await taskFileStore.update((taskFile) => ({
        nextValue: {
          ...taskFile,
          actions: [...taskFile.actions, action],
        },
        result: undefined,
      }))

      return action
    },

    async updateAction(id, input) {
      return taskFileStore.update((taskFile) => {
        const actionIndex = taskFile.actions.findIndex(
          (action) => action.id === id,
        )

        if (actionIndex === -1) {
          throw new Error(`Action not found: ${id}`)
        }

        const currentAction = taskFile.actions[actionIndex]
        const updatedAction: ActionDefinition = {
          ...currentAction,
          ...input,
          name: input.name?.trim() ?? currentAction.name,
          updatedAt: new Date().toISOString(),
        }
        const actions = [...taskFile.actions]
        actions[actionIndex] = updatedAction

        return {
          nextValue: {
            actions,
            workflows: taskFile.workflows,
          },
          result: updatedAction,
        }
      })
    },

    async deleteAction(id) {
      await taskFileStore.update((taskFile) => ({
        nextValue: {
          actions: taskFile.actions.filter((action) => action.id !== id),
          workflows: taskFile.workflows.map((workflow) => ({
            ...workflow,
            actionRefs: workflow.actionRefs.filter(
              (actionRef) => actionRef.actionId !== id,
            ),
            updatedAt: new Date().toISOString(),
          })),
        },
        result: undefined,
      }))
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
          permissions: normalizeDevicePolicy(
            input.permissions ?? defaultDevicePolicy,
          ),
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
          permissions: input.permissions
            ? normalizeDevicePolicy(input.permissions)
            : currentWorkflow.permissions,
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

    async replaceWorkflows(input){
      await replaceWorkflowFile(input)
    },

    async replaceWorkflowData(input){
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
    const nextFile = normalizeTaskFile({
      actions: input.actions ?? [],
      workflows: input.workflows ?? [],
    })
    for (const workflow of nextFile.workflows) {
      assertWorkflowActionRefsExist(workflow.actionRefs, nextFile.actions)
    }
    await writeTaskFile(nextFile)
  }
}

function normalizeTaskFile(value: unknown): TaskFile {
  const candidate = value as Partial<TaskFile>
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
    permissions: normalizeDevicePolicy(workflow.permissions),
    schedule: normalizeWorkflowSchedule(workflow.schedule),
    state: workflow.state ?? defaultWorkflowState,
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
    .filter((actionRef) => typeof actionRef.actionId === 'string' && actionRef.actionId)
    .map((actionRef, index) => ({
      id: actionRef.id || randomUUID(),
      actionId: actionRef.actionId,
      order: Number.isFinite(actionRef.order) ? actionRef.order : index,
      inputMapping: actionRef.inputMapping,
      enabled: actionRef.enabled !== false,
    }))
    .sort((left, right) => left.order - right.order)
    .map((actionRef, index) => ({
      ...actionRef,
      order: index,
    }))
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
    throw new Error(`Workflow Action 참조를 찾지 못했습니다: ${missingActionRef.actionId}`)
  }
}
