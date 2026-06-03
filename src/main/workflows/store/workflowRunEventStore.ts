import { randomUUID } from 'node:crypto'
import path from 'node:path'
import type {
  CreateWorkflowRunEventInput,
  WorkflowRunEvent
} from '../../../shared/runStatus'
import { createAtomicJsonFile } from '../../storage/atomicJsonFile'

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
  const eventJsonFile = createAtomicJsonFile<WorkflowRunEventFile>({
    filePath: eventsFilePath,
    defaultValue: () => ({ events: [] }),
    normalize: normalizeWorkflowRunEventFile,
  })

  async function readEventFile(): Promise<WorkflowRunEventFile> {
    return eventJsonFile.read()
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
      const retentionLimit = await getRetentionLimit()
      await eventJsonFile.update((eventFile) => ({
        nextValue: {
          events: [...eventFile.events, event].slice(-retentionLimit),
        },
        result: undefined,
      }))

      return event
    },

    async importEvents(events) {
      const retentionLimit = await getRetentionLimit()

      return eventJsonFile.update((eventFile) => {
        const existingIds = new Set(eventFile.events.map((event) => event.id))
        const incomingEvents = events.filter((event) => !existingIds.has(event.id))

        if (incomingEvents.length === 0) {
          return {
            nextValue: eventFile,
            result: 0,
          }
        }

        return {
          nextValue: {
            events: [...eventFile.events, ...incomingEvents]
              .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
              .slice(-retentionLimit),
          },
          result: incomingEvents.length,
        }
      })
    },

    async pruneEvents() {
      const retentionLimit = await getRetentionLimit()

      return eventJsonFile.update((eventFile) => {
        const prunedEvents = eventFile.events
          .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
          .slice(-retentionLimit)

        return {
          nextValue: {
            events: prunedEvents,
          },
          result: eventFile.events.length - prunedEvents.length,
        }
      })
    },
  }
}

function normalizeWorkflowRunEventFile(value: unknown): WorkflowRunEventFile {
  const candidate = value as Partial<WorkflowRunEventFile>
  return {
    events: Array.isArray(candidate.events) ? candidate.events : [],
  }
}
