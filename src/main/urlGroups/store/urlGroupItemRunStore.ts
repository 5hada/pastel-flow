import { randomUUID } from 'node:crypto'
import type {
  UrlGroupItem,
  UrlGroupItemRun,
  UrlGroupItemRunStatus,
} from '../../../shared/urlGroups'
import type { SqliteDatabase } from '../../database/sqliteDatabase'

export type UrlGroupItemRunStore = {
  createItemRuns(input: CreateUrlGroupItemRunsInput): Promise<UrlGroupItemRun[]>
  completeActionItemRuns(
    actionRunId: string,
    input: CompleteUrlGroupItemRunsInput,
  ): Promise<number>
  listItemRuns(input: ListUrlGroupItemRunsInput): Promise<UrlGroupItemRun[]>
}

export type CreateUrlGroupItemRunsInput = {
  runId: string
  workflowId: string
  actionRunId: string
  urlGroupId: string
  items: UrlGroupItem[]
}

export type CompleteUrlGroupItemRunsInput = {
  status: Exclude<UrlGroupItemRunStatus, 'running'>
  message?: string
  error?: string
  endedAt?: string
}

export type ListUrlGroupItemRunsInput = {
  runId?: string
  actionRunId?: string
  workflowId?: string
  limit?: number
}

export type UrlGroupItemRunStoreOptions = {
  database: SqliteDatabase
}

type UrlGroupItemRunRow = {
  id: string
  run_id: string
  workflow_id: string
  action_run_id: string
  url_group_id: string
  url_item_id: string
  url: string
  status: UrlGroupItemRunStatus
  started_at: string | null
  ended_at: string | null
  message: string | null
  error: string | null
  created_at: string
  updated_at: string
}

export function createUrlGroupItemRunStore({
  database,
}: UrlGroupItemRunStoreOptions): UrlGroupItemRunStore {
  return {
    async createItemRuns(input) {
      const now = new Date().toISOString()
      const itemRuns = input.items.map((item): UrlGroupItemRun => ({
        id: randomUUID(),
        runId: input.runId,
        workflowId: input.workflowId,
        actionRunId: input.actionRunId,
        urlGroupId: input.urlGroupId,
        urlItemId: item.id,
        url: item.url,
        status: 'running',
        startedAt: now,
        createdAt: now,
        updatedAt: now,
      }))
      const insertMany = database.transaction((runs: UrlGroupItemRun[]) => {
        for (const run of runs) {
          insertItemRun(database, run)
        }
      })
      insertMany(itemRuns)

      return itemRuns
    },

    async completeActionItemRuns(actionRunId, input) {
      const endedAt = input.endedAt ?? new Date().toISOString()
      const result = database
        .prepare(
          `
          UPDATE url_group_item_runs
          SET
            status = ?,
            ended_at = ?,
            message = ?,
            error = ?,
            updated_at = ?
          WHERE action_run_id = ? AND status = 'running'
          `,
        )
        .run(
          input.status,
          endedAt,
          input.message ?? null,
          input.error ?? null,
          new Date().toISOString(),
          actionRunId,
        )

      return result.changes
    },

    async listItemRuns(input) {
      return selectItemRunRows(database, input).map(mapUrlGroupItemRunRow)
    },
  }
}

function insertItemRun(
  database: SqliteDatabase,
  itemRun: UrlGroupItemRun,
): void {
  database
    .prepare(
      `
      INSERT INTO url_group_item_runs (
        id,
        run_id,
        workflow_id,
        action_run_id,
        url_group_id,
        url_item_id,
        url,
        status,
        started_at,
        ended_at,
        message,
        error,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      itemRun.id,
      itemRun.runId,
      itemRun.workflowId,
      itemRun.actionRunId,
      itemRun.urlGroupId,
      itemRun.urlItemId,
      itemRun.url,
      itemRun.status,
      itemRun.startedAt ?? null,
      itemRun.endedAt ?? null,
      itemRun.message ?? null,
      itemRun.error ?? null,
      itemRun.createdAt,
      itemRun.updatedAt,
    )
}

function selectItemRunRows(
  database: SqliteDatabase,
  input: ListUrlGroupItemRunsInput,
): UrlGroupItemRunRow[] {
  const limit = input.limit ?? 100

  if (input.actionRunId) {
    return database
      .prepare(
        `
        SELECT *
        FROM url_group_item_runs
        WHERE action_run_id = ?
        ORDER BY created_at ASC
        LIMIT ?
        `,
      )
      .all(input.actionRunId, limit) as UrlGroupItemRunRow[]
  }

  if (input.runId) {
    return database
      .prepare(
        `
        SELECT *
        FROM url_group_item_runs
        WHERE run_id = ?
        ORDER BY created_at ASC
        LIMIT ?
        `,
      )
      .all(input.runId, limit) as UrlGroupItemRunRow[]
  }

  if (input.workflowId) {
    return database
      .prepare(
        `
        SELECT *
        FROM url_group_item_runs
        WHERE workflow_id = ?
        ORDER BY created_at DESC
        LIMIT ?
        `,
      )
      .all(input.workflowId, limit) as UrlGroupItemRunRow[]
  }

  return database
    .prepare(
      `
      SELECT *
      FROM url_group_item_runs
      ORDER BY created_at DESC
      LIMIT ?
      `,
    )
    .all(limit) as UrlGroupItemRunRow[]
}

function mapUrlGroupItemRunRow(row: UrlGroupItemRunRow): UrlGroupItemRun {
  return {
    id: row.id,
    runId: row.run_id,
    workflowId: row.workflow_id,
    actionRunId: row.action_run_id,
    urlGroupId: row.url_group_id,
    urlItemId: row.url_item_id,
    url: row.url,
    status: row.status,
    startedAt: row.started_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
    message: row.message ?? undefined,
    error: row.error ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
