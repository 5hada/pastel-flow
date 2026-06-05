import { randomUUID } from 'node:crypto'
import type {
  CreateWorkflowRunEventInput,
  WorkflowRunEvent,
} from '../../../shared/runStatus'
import type { SqliteDatabase } from '../../storage/sqliteDatabase'

export type WorkflowRunEventStore = {
  listEvents(workflowId?: string, options?: ListWorkflowRunEventsOptions): Promise<WorkflowRunEvent[]>
  appendEvent(input: CreateWorkflowRunEventInput): Promise<WorkflowRunEvent>
  importEvents(events: WorkflowRunEvent[]): Promise<number>
  pruneEvents(): Promise<number>
}

export type ListWorkflowRunEventsOptions = {
  limit?: number
  runId?: string
}

export type WorkflowRunEventStoreOptions = {
  database: SqliteDatabase
  getRetentionLimit(): Promise<number>
}

type WorkflowRunEventRow = {
  id: string
  run_id: string | null
  workflow_id: string
  action_run_id: string | null
  device_id: string
  status: WorkflowRunEvent['status']
  message: string | null
  created_at: string
}

export function createWorkflowRunEventStore({
  database,
  getRetentionLimit,
}: WorkflowRunEventStoreOptions): WorkflowRunEventStore {
  return {
    async listEvents(workflowId, options) {
      const limit = options?.limit ?? 50
      const rows = listEventRows(database, workflowId, options?.runId, limit)
      return rows.map(mapWorkflowRunEventRow)
    },

    async appendEvent(input) {
      const event: WorkflowRunEvent = {
        id: randomUUID(),
        runId: input.runId,
        workflowId: input.workflowId,
        actionRunId: input.actionRunId,
        deviceId: input.deviceId,
        status: input.status,
        message: input.message,
        createdAt: new Date().toISOString(),
      }

      insertEvent(database, event)
      await pruneEventsToRetentionLimit(database, await getRetentionLimit())

      return event
    },

    async importEvents(events) {
      const existingIds = new Set(
        (
          database
            .prepare('SELECT id FROM workflow_run_events')
            .all() as Array<{ id: string }>
        ).map((event) => event.id),
      )
      const incomingEvents = events.filter((event) => !existingIds.has(event.id))

      if (incomingEvents.length === 0) {
        return 0
      }

      const insertMany = database.transaction((nextEvents: WorkflowRunEvent[]) => {
        for (const event of nextEvents) {
          insertEvent(database, event)
        }
      })
      insertMany(incomingEvents)
      await pruneEventsToRetentionLimit(database, await getRetentionLimit())

      return incomingEvents.length
    },

    async pruneEvents() {
      return pruneEventsToRetentionLimit(database, await getRetentionLimit())
    },
  }
}

function listEventRows(
  database: SqliteDatabase,
  workflowId: string | undefined,
  runId: string | undefined,
  limit: number,
): WorkflowRunEventRow[] {
  if (workflowId && runId) {
    return database
      .prepare(
        `
        SELECT *
        FROM workflow_run_events
        WHERE workflow_id = ? AND run_id = ?
        ORDER BY created_at DESC
        LIMIT ?
        `,
      )
      .all(workflowId, runId, limit) as WorkflowRunEventRow[]
  }

  if (workflowId) {
    return database
      .prepare(
        `
        SELECT *
        FROM workflow_run_events
        WHERE workflow_id = ?
        ORDER BY created_at DESC
        LIMIT ?
        `,
      )
      .all(workflowId, limit) as WorkflowRunEventRow[]
  }

  if (runId) {
    return database
      .prepare(
        `
        SELECT *
        FROM workflow_run_events
        WHERE run_id = ?
        ORDER BY created_at DESC
        LIMIT ?
        `,
      )
      .all(runId, limit) as WorkflowRunEventRow[]
  }

  return database
    .prepare(
      `
      SELECT *
      FROM workflow_run_events
      ORDER BY created_at DESC
      LIMIT ?
      `,
    )
    .all(limit) as WorkflowRunEventRow[]
}

function insertEvent(database: SqliteDatabase, event: WorkflowRunEvent): void {
  database
    .prepare(
      `
      INSERT OR IGNORE INTO workflow_run_events (
        id,
        run_id,
        workflow_id,
        action_run_id,
        device_id,
        status,
        message,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      event.id,
      event.runId ?? null,
      event.workflowId,
      event.actionRunId ?? null,
      event.deviceId,
      event.status,
      event.message ?? null,
      event.createdAt,
    )
}

function mapWorkflowRunEventRow(row: WorkflowRunEventRow): WorkflowRunEvent {
  return {
    id: row.id,
    runId: row.run_id ?? undefined,
    workflowId: row.workflow_id,
    actionRunId: row.action_run_id ?? undefined,
    deviceId: row.device_id,
    status: row.status,
    message: row.message ?? undefined,
    createdAt: row.created_at,
  }
}

async function pruneEventsToRetentionLimit(
  database: SqliteDatabase,
  retentionLimit: number,
): Promise<number> {
  const total = (
    database.prepare('SELECT COUNT(*) AS count FROM workflow_run_events').get() as {
      count: number
    }
  ).count

  if (total <= retentionLimit) {
    return 0
  }

  const result = database
    .prepare(
      `
      DELETE FROM workflow_run_events
      WHERE id IN (
        SELECT id
        FROM workflow_run_events
        ORDER BY created_at ASC
        LIMIT ?
      )
      `,
    )
    .run(total - retentionLimit)

  return result.changes
}
