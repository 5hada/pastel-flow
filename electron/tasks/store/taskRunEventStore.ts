import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type {
  CreateTaskRunEventInput,
  TaskRunEvent,
} from '../../../src/shared/taskRunEvents'

export type TaskRunEventStore = {
  listEvents(taskId?: string): Promise<TaskRunEvent[]>
  appendEvent(input: CreateTaskRunEventInput): Promise<TaskRunEvent>
}

export type TaskRunEventStoreOptions = {
  dataDir: string
}

type TaskRunEventFile = {
  events: TaskRunEvent[]
}

const maxStoredEvents = 300

export function createTaskRunEventStore({
  dataDir,
}: TaskRunEventStoreOptions): TaskRunEventStore {
  const eventsFilePath = path.join(dataDir, 'taskRunEvents.json')

  async function readEventFile(): Promise<TaskRunEventFile> {
    try {
      const raw = await readFile(eventsFilePath, 'utf8')
      const parsed = JSON.parse(raw) as Partial<TaskRunEventFile>

      return {
        events: Array.isArray(parsed.events) ? parsed.events : [],
      }
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return { events: [] }
      }

      throw error
    }
  }

  async function writeEventFile(eventFile: TaskRunEventFile): Promise<void> {
    await mkdir(dataDir, { recursive: true })
    await writeFile(
      eventsFilePath,
      `${JSON.stringify(eventFile, null, 2)}\n`,
      'utf8',
    )
  }

  return {
    async listEvents(taskId) {
      const eventFile = await readEventFile()
      return eventFile.events
        .filter((event) => !taskId || event.taskId === taskId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .slice(0, 50)
    },

    async appendEvent(input) {
      const event: TaskRunEvent = {
        id: randomUUID(),
        taskId: input.taskId,
        deviceId: input.deviceId,
        status: input.status,
        message: input.message,
        createdAt: new Date().toISOString(),
      }
      const eventFile = await readEventFile()
      await writeEventFile({
        events: [...eventFile.events, event].slice(-maxStoredEvents),
      })

      return event
    },
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}
