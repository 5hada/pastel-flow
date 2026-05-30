import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  createActionFromLegacyTask,
  createWorkflowFromLegacyTask,
  defaultDevicePolicy,
  defaultTaskState,
  getLegacyActionId,
  getLegacyWorkflowId,
  normalizeDevicePolicy,
  normalizeTaskSchedule,
  type ActionDefinition,
  type DevicePolicy,
  type TaskSchedule,
  type TaskState,
  type TaskTemplate,
  type WorkflowDefinition,
} from '../../../src/shared/tasks'

export type CreateTaskInput<TConfig = unknown> = {
  name: string
  type: TaskTemplate<TConfig>['type']
  config: TConfig
  permissions?: DevicePolicy
  schedule?: TaskSchedule
  state?: TaskState
}

export type UpdateTaskInput<TConfig = unknown> = Partial<
  Pick<
    TaskTemplate<TConfig, TaskState>,
    'name' | 'config' | 'state' | 'permissions' | 'schedule'
  >
>

export type TaskStore = {
  getTask(id: string): Promise<TaskTemplate>
  listTasks(): Promise<TaskTemplate[]>
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
  deleteWorkflow(id: string): Promise<void>
  createTask(input: CreateTaskInput): Promise<TaskTemplate>
  updateTask(id: string, input: UpdateTaskInput): Promise<TaskTemplate>
  replaceTasks(tasks: TaskTemplate[]): Promise<void>
  replaceTaskData(input: ReplaceTaskDataInput): Promise<void>
  deleteTask(id: string): Promise<void>
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
    'name' | 'config' | 'secretRefs' | 'inputSchema' | 'outputSchema'
  >
>

export type CreateWorkflowInput = {
  name: string
  actionRefs?: WorkflowDefinition['actionRefs']
  permissions?: DevicePolicy
  schedule?: TaskSchedule
  state?: TaskState
}

export type UpdateWorkflowInput = Partial<
  Pick<WorkflowDefinition, 'name' | 'actionRefs' | 'permissions' | 'schedule' | 'state'>
>

export type TaskStoreOptions = {
  dataDir: string
}

export type ReplaceTaskDataInput = {
  tasks: TaskTemplate[]
  actions?: ActionDefinition[]
  workflows?: WorkflowDefinition[]
}

type TaskFile = {
  tasks: TaskTemplate[]
  actions: ActionDefinition[]
  workflows: WorkflowDefinition[]
}

export function createTaskStore({ dataDir }: TaskStoreOptions): TaskStore {
  const tasksFilePath = path.join(dataDir, 'tasks.json')

  async function readTaskFile(): Promise<TaskFile> {
    try {
      const raw = await readFile(tasksFilePath, 'utf8')
      const parsed = JSON.parse(raw) as Partial<TaskFile>

      return {
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
        workflows: Array.isArray(parsed.workflows) ? parsed.workflows : [],
      }
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return { tasks: [], actions: [], workflows: [] }
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
    async getTask(id) {
      const taskFile = await readTaskFile()
      const task = taskFile.tasks.find((currentTask) => currentTask.id === id)

      if (!task) {
        throw new Error(`Task not found: ${id}`)
      }

      return task
    },

    async listTasks() {
      return []
    },

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
        tasks: [],
        actions,
        workflows: taskFile.workflows,
      })

      return updatedAction
    },

    async deleteAction(id) {
      const taskFile = ensureLegacyWorkflowData(await readTaskFile())

      await writeTaskFile({
        tasks: [],
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
        schedule: normalizeTaskSchedule(input.schedule),
        state: input.state ?? defaultTaskState,
        createdAt: now,
        updatedAt: now,
      }
      const taskFile = ensureLegacyWorkflowData(await readTaskFile())

      await writeTaskFile({
        tasks: [],
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
            : normalizeTaskSchedule(input.schedule),
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

    async deleteWorkflow(id) {
      const taskFile = ensureLegacyWorkflowData(await readTaskFile())
      const workflow = taskFile.workflows.find(
        (currentWorkflow) => currentWorkflow.id === id,
      )

      if (!workflow) {
        throw new Error(`Workflow not found: ${id}`)
      }

      await writeTaskFile({
        tasks: [],
        actions: taskFile.actions,
        workflows: taskFile.workflows.filter(
          (currentWorkflow) => currentWorkflow.id !== id,
        ),
      })
    },

    async createTask(input) {
      const now = new Date().toISOString()
      const task: TaskTemplate = {
        id: randomUUID(),
        name: input.name.trim(),
        type: input.type,
        config: input.config,
        state: input.state ?? defaultTaskState,
        permissions: normalizeDevicePolicy(
          input.permissions ?? defaultDevicePolicy,
        ),
        schedule: normalizeTaskSchedule(input.schedule),
        createdAt: now,
        updatedAt: now,
      }

      const taskFile = await readTaskFile()
      await writeTaskFile(
        upsertLegacyTaskModel(
          {
            ...taskFile,
            tasks: [...taskFile.tasks, task],
          },
          task,
        ),
      )

      return task
    },

    async updateTask(id, input) {
      const taskFile = await readTaskFile()
      const taskIndex = taskFile.tasks.findIndex((task) => task.id === id)

      if (taskIndex === -1) {
        throw new Error(`Task not found: ${id}`)
      }

      const currentTask = taskFile.tasks[taskIndex]
      const updatedTask: TaskTemplate = {
        ...currentTask,
        ...input,
        name: input.name?.trim() ?? currentTask.name,
        permissions: input.permissions
          ? normalizeDevicePolicy(input.permissions)
          : currentTask.permissions,
        schedule:
          input.schedule === undefined
            ? currentTask.schedule
            : normalizeTaskSchedule(input.schedule),
        updatedAt: new Date().toISOString(),
      }

      const tasks = [...taskFile.tasks]
      tasks[taskIndex] = updatedTask
      await writeTaskFile(upsertLegacyTaskModel({ ...taskFile, tasks }, updatedTask))

      return updatedTask
    },

    async replaceTasks(tasks) {
      const normalizedTasks = tasks.map((task) => ({
          ...task,
          name: task.name.trim(),
          permissions: normalizeDevicePolicy(task.permissions),
          schedule: normalizeTaskSchedule(task.schedule),
        }))

      await writeTaskFile(
        ensureLegacyWorkflowData({
          tasks: normalizedTasks,
          actions: [],
          workflows: [],
        }),
      )
    },

    async replaceTaskData(input) {
      const normalizedTasks = input.tasks.map((task) => ({
        ...task,
        name: task.name.trim(),
        permissions: normalizeDevicePolicy(task.permissions),
        schedule: normalizeTaskSchedule(task.schedule),
      }))

      await writeTaskFile(
        ensureLegacyWorkflowData({
          tasks: normalizedTasks,
          actions: input.actions ?? [],
          workflows: input.workflows ?? [],
        }),
      )
    },

    async deleteTask(id) {
      const taskFile = await readTaskFile()
      await writeTaskFile({
        tasks: [],
        actions: ensureLegacyWorkflowData(taskFile).actions.filter(
          (action) => action.id !== getLegacyActionId(id),
        ),
        workflows: ensureLegacyWorkflowData(taskFile).workflows.filter(
          (workflow) => workflow.id !== getLegacyWorkflowId(id),
        ),
      })
    },
  }
}

function ensureLegacyWorkflowData(taskFile: TaskFile): TaskFile {
  return {
    tasks: [],
    actions: taskFile.actions,
    workflows: taskFile.workflows,
  }
}

function upsertLegacyTaskModel(taskFile: TaskFile, task: TaskTemplate): TaskFile {
  const taskWithNormalizedModel = ensureLegacyWorkflowData(taskFile)
  const action = createActionFromLegacyTask(task)
  const workflow = createWorkflowFromLegacyTask(task)

  return {
    tasks: taskWithNormalizedModel.tasks,
    actions: [
      ...taskWithNormalizedModel.actions.filter(
        (currentAction) => currentAction.id !== action.id,
      ),
      action,
    ],
    workflows: [
      ...taskWithNormalizedModel.workflows.filter(
        (currentWorkflow) => currentWorkflow.id !== workflow.id,
      ),
      workflow,
    ],
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
