import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
    defaultDevicePolicy,
    normalizeDevicePolicy,
    type DevicePolicy
 } from '../../../shared/devices/'
import  {
    normalizeWorkflowSchedule,
    defaultWorkflowState,
    type WorkflowSchedule,
    type WorkflowDefinition,
    type WorkflowState
} from '../../../shared/workflows'
import type { ActionDefinition } from '../../../shared/actions'



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
export type ReplaceWorkflowDataInput = {
  actions?: ActionDefinition[]
  workflows?: WorkflowDefinition[]
}

export type WorkflowStoreOptions = {
  dataDir: string
}

type TaskFile = {
  actions: ActionDefinition[]
  workflows: WorkflowDefinition[]
}

export function createWorkflowStore({ dataDir }: WorkflowStoreOptions): WorkflowStore {
  const tasksFilePath = path.join(dataDir, 'tasks.json')

  async function readTaskFile(): Promise<TaskFile> {
    try {
      const raw = await readFile(tasksFilePath, 'utf8')
      const parsed = JSON.parse(raw) as Partial<TaskFile>

      return {
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
        workflows: Array.isArray(parsed.workflows) ? parsed.workflows : [],
      }
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return { actions: [], workflows: [] }
      }

      throw error
    }
  }

  async function writeTaskFile(taskFile: TaskFile): Promise<void> {
    await mkdir(dataDir, { recursive: true })
    await writeFile(
      tasksFilePath,
      `${JSON.stringify(taskFile, null, 2)}\n`,
      'utf8',
    )
  }

  return {
    async getAction(id) {
      const taskFile = ensureLegacyWorkflowData(await readTaskFile())
      const action = taskFile.actions.find((currentAction) => currentAction.id === id)

      if (!action) {
        throw new Error(`Action not found: ${id}`)
      }

      return action
    },

    async listActions() {
      const taskFile = await readTaskFile()
      return ensureLegacyWorkflowData(taskFile).actions
    },

    async listWorkflows() {
      const taskFile = await readTaskFile()
      return ensureLegacyWorkflowData(taskFile).workflows
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
      const taskFile = ensureLegacyWorkflowData(await readTaskFile())

      await writeTaskFile({
        ...taskFile,
        actions: [...taskFile.actions, action],
      })

      return action
    },

    async updateAction(id, input) {
      const taskFile = ensureLegacyWorkflowData(await readTaskFile())
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

      await writeTaskFile({
        actions,
        workflows: taskFile.workflows,
      })

      return updatedAction
    },

    async deleteAction(id) {
      const taskFile = ensureLegacyWorkflowData(await readTaskFile())

      await writeTaskFile({
        actions: taskFile.actions.filter((action) => action.id !== id),
        workflows: taskFile.workflows.map((workflow) => ({
          ...workflow,
          actionRefs: workflow.actionRefs.filter(
            (actionRef) => actionRef.actionId !== id,
          ),
          updatedAt: new Date().toISOString(),
        })),
      })
    },

    async createWorkflow(input) {
      const now = new Date().toISOString()
      const workflow: WorkflowDefinition = {
        id: randomUUID(),
        name: input.name.trim(),
        actionRefs: normalizeWorkflowActionRefs(input.actionRefs ?? []),
        permissions: normalizeDevicePolicy(
          input.permissions ?? defaultDevicePolicy,
        ),
        schedule: normalizeWorkflowSchedule(input.schedule),
        state: input.state ?? defaultWorkflowState,
        createdAt: now,
        updatedAt: now,
      }
      const taskFile = ensureLegacyWorkflowData(await readTaskFile())

      await writeTaskFile({
        actions: taskFile.actions,
        workflows: [...taskFile.workflows, workflow],
      })

      return workflow
    },

    async updateWorkflow(id, input) {
      const taskFile = ensureLegacyWorkflowData(await readTaskFile())
      const workflowIndex = taskFile.workflows.findIndex(
        (workflow) => workflow.id === id,
      )

      if (workflowIndex === -1) {
        throw new Error(`Workflow not found: ${id}`)
      }

      const currentWorkflow = taskFile.workflows[workflowIndex]
      const updatedWorkflow: WorkflowDefinition = {
        ...currentWorkflow,
        ...input,
        name: input.name?.trim() ?? currentWorkflow.name,
        actionRefs:
          input.actionRefs === undefined
            ? currentWorkflow.actionRefs
            : normalizeWorkflowActionRefs(input.actionRefs),
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

      await writeTaskFile({
        ...taskFile,
        workflows,
      })

      return updatedWorkflow
    },

    async replaceWorkflows(input){
      await writeTaskFile({
          actions: input.actions ?? [],
          workflows: input.workflows ?? [],
        },
      )
    },

    async replaceWorkflowData(input){
      await writeTaskFile({
          actions: input.actions ?? [],
          workflows: input.workflows ?? [],
        },
      )
    },

    async deleteWorkflow(id) {
      const taskFile = ensureLegacyWorkflowData(await readTaskFile())
      const workflow = taskFile.workflows.find(
        (currentWorkflow) => currentWorkflow.id === id,
      )

      if (!workflow) {
        throw new Error(`Workflow not found: ${id}`)
      }

      await writeTaskFile({
        actions: taskFile.actions,
        workflows: taskFile.workflows.filter(
          (currentWorkflow) => currentWorkflow.id !== id,
        ),
      })
    },
  }
}

function ensureLegacyWorkflowData(taskFile: TaskFile): TaskFile {
  return {
    actions: taskFile.actions,
    workflows: taskFile.workflows,
  }
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

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}
