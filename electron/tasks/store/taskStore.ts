import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  defaultDevicePolicy,
  defaultTaskState,
  normalizeDevicePolicy,
  type DevicePolicy,
  type TaskState,
  type TaskTemplate,
} from '../../../src/shared/tasks'

export type CreateTaskInput<TConfig = unknown> = {
  name: string
  type: TaskTemplate<TConfig>['type']
  config: TConfig
  permissions?: DevicePolicy
  state?: TaskState
}

export type UpdateTaskInput<TConfig = unknown> = Partial<
  Pick<TaskTemplate<TConfig, TaskState>, 'name' | 'config' | 'state' | 'permissions'>
>

export type TaskStore = {
  getTask(id: string): Promise<TaskTemplate>
  listTasks(): Promise<TaskTemplate[]>
  createTask(input: CreateTaskInput): Promise<TaskTemplate>
  updateTask(id: string, input: UpdateTaskInput): Promise<TaskTemplate>
  replaceTasks(tasks: TaskTemplate[]): Promise<void>
  deleteTask(id: string): Promise<void>
}

export type TaskStoreOptions = {
  dataDir: string
}

type TaskFile = {
  tasks: TaskTemplate[]
}

export function createTaskStore({ dataDir }: TaskStoreOptions): TaskStore {
  const tasksFilePath = path.join(dataDir, 'tasks.json')

  async function readTaskFile(): Promise<TaskFile> {
    try {
      const raw = await readFile(tasksFilePath, 'utf8')
      const parsed = JSON.parse(raw) as Partial<TaskFile>

      return {
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      }
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return { tasks: [] }
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
      const taskFile = await readTaskFile()
      return taskFile.tasks
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
        createdAt: now,
        updatedAt: now,
      }

      const taskFile = await readTaskFile()
      await writeTaskFile({
        tasks: [...taskFile.tasks, task],
      })

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
        updatedAt: new Date().toISOString(),
      }

      const tasks = [...taskFile.tasks]
      tasks[taskIndex] = updatedTask
      await writeTaskFile({ tasks })

      return updatedTask
    },

    async replaceTasks(tasks) {
      await writeTaskFile({
        tasks: tasks.map((task) => ({
          ...task,
          name: task.name.trim(),
          permissions: normalizeDevicePolicy(task.permissions),
        })),
      })
    },

    async deleteTask(id) {
      const taskFile = await readTaskFile()
      await writeTaskFile({
        tasks: taskFile.tasks.filter((task) => task.id !== id),
      })
    },
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}
