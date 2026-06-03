import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type {
  CreateWorkflowRunEventInput,
  WorkflowRunEvent
} from '../../../shared/runStatus'

export type WorkflowRunEventStore = {
  listEvents(workflowId?: string, options?: ListWorkflowRunEventsOptions): Promise<WorkflowRunEvent[]>
  appendEvent(input: CreateWorkflowRunEventInput): Promise<WorkflowRunEvent>
  importEvents(events: WorkflowRunEvent[]): Promise<number>
  pruneEvents(): Promise<number>
}

export type ListWorkflowRunEventsOptions = {
  limit?: number
}

export type WorkflowRunEventStoreOptions = {
  dataDir: string
  getRetentionLimit(): Promise<number>
}

type WorkflowRunEventFile = {
  events: WorkflowRunEvent[]
}

export function createWorkflowRunEventStore({
  dataDir,
  getRetentionLimit,
}: WorkflowRunEventStoreOptions): WorkflowRunEventStore {
  const eventsFilePath = path.join(dataDir, 'workflowRunEvents.json')

  async function readEventFile(): Promise<WorkflowRunEventFile> {
    try {
      const raw = await readFile(eventsFilePath, 'utf8')
      const parsed = JSON.parse(raw) as Partial<WorkflowRunEventFile>

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

  async function writeEventFile(eventFile: WorkflowRunEventFile): Promise<void> {
    await mkdir(dataDir, { recursive: true })
    await writeFile(
      eventsFilePath,
      `${JSON.stringify(eventFile, null, 2)}\n`,
      'utf8',
    )
  }

  return {
    async listEvents(workflowId, options) {
      const eventFile = await readEventFile()
      return eventFile.events
        .filter((event) => !workflowId || event.workflowId === workflowId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .slice(0, options?.limit ?? 50)
    },

    async appendEvent(input) {
      const event: WorkflowRunEvent = {
        id: randomUUID(),
        workflowId: input.workflowId,
        actionRunId: input.actionRunId,
        deviceId: input.deviceId,
        status: input.status,
        message: input.message,
        createdAt: new Date().toISOString(),
      }
      const eventFile = await readEventFile()
      const retentionLimit = await getRetentionLimit()
      await writeEventFile({
        events: [...eventFile.events, event].slice(-retentionLimit),
      })

      return event
    },

    async importEvents(events) {
      const eventFile = await readEventFile()
      const existingIds = new Set(eventFile.events.map((event) => event.id))
      const incomingEvents = events.filter((event) => !existingIds.has(event.id))
      const retentionLimit = await getRetentionLimit()

      if (incomingEvents.length === 0) {
        return 0
      }

      await writeEventFile({
        events: [...eventFile.events, ...incomingEvents]
          .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
          .slice(-retentionLimit),
      })

      return incomingEvents.length
    },

    async pruneEvents() {
      const eventFile = await readEventFile()
      const retentionLimit = await getRetentionLimit()
      const prunedEvents = eventFile.events
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
        .slice(-retentionLimit)

      if (prunedEvents.length === eventFile.events.length) {
        return 0
      }

      await writeEventFile({
        events: prunedEvents,
      })

      return eventFile.events.length - prunedEvents.length
    },
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}
