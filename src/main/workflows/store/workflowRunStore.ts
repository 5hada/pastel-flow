import { randomUUID } from 'node:crypto'
import type { SqliteDatabase } from '../../database/sqliteDatabase'
import type {
  ActionRun,
  CreateActionRunInput,
  CreateWorkflowRunInput,
  UpdateActionRunInput,
  UpdateWorkflowRunInput,
  WorkflowRun,
} from '../../../shared/runStatus'

export type WorkflowRunStore = {
  createRun(input: CreateWorkflowRunInput): Promise<WorkflowRun>
  updateRun(id: string, input: UpdateWorkflowRunInput): Promise<WorkflowRun>
  listRuns(workflowId?: string, options?: ListWorkflowRunsOptions): Promise<WorkflowRun[]>
  createActionRun(input: CreateActionRunInput): Promise<ActionRun>
  updateActionRun(id: string, input: UpdateActionRunInput): Promise<ActionRun>
  listActionRuns(runId: string): Promise<ActionRun[]>
}

export type ListWorkflowRunsOptions = {
  limit?: number
}

export type WorkflowRunStoreOptions = {
  database: SqliteDatabase
}

type WorkflowRunRow = {
  id: string
  workflow_id: string
  actor_type: WorkflowRun['actorType']
  actor_id: string | null
  trigger_source: WorkflowRun['triggerSource']
  status: WorkflowRun['status']
  started_at: string | null
  ended_at: string | null
  summary: string | null
  error: string | null
  workflow_snapshot: string | null
  created_at: string
  updated_at: string
}

type ActionRunRow = {
  id: string
  run_id: string
  workflow_id: string
  action_ref_id: string
  action_id: string
  action_order: number
  status: ActionRun['status']
  started_at: string | null
  ended_at: string | null
  input_summary: string | null
  output_summary: string | null
  error: string | null
  created_at: string
  updated_at: string
}

export function createWorkflowRunStore({
  database,
}: WorkflowRunStoreOptions): WorkflowRunStore {
  return {
    async createRun(input) {
      const now = new Date().toISOString()
      const run: WorkflowRun = {
        id: randomUUID(),
        workflowId: input.workflowId,
        actorType: input.actorType,
        actorId: input.actorId,
        triggerSource: input.triggerSource,
        status: input.status ?? 'running',
        startedAt: input.startedAt,
        summary: input.summary,
        workflowSnapshot: input.workflowSnapshot,
        createdAt: now,
        updatedAt: now,
      }

      database
        .prepare(
          `
          INSERT INTO workflow_runs (
            id,
            workflow_id,
            actor_type,
            actor_id,
            trigger_source,
            status,
            started_at,
            ended_at,
            summary,
            error,
            workflow_snapshot,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
        )
        .run(
          run.id,
          run.workflowId,
          run.actorType,
          run.actorId ?? null,
          run.triggerSource,
          run.status,
          run.startedAt ?? null,
          run.endedAt ?? null,
          run.summary ?? null,
          run.error ?? null,
          serializeOptionalJson(run.workflowSnapshot),
          run.createdAt,
          run.updatedAt,
        )

      return run
    },

    async updateRun(id, input) {
      const currentRun = getWorkflowRun(database, id)
      const updatedRun: WorkflowRun = {
        ...currentRun,
        ...input,
        updatedAt: new Date().toISOString(),
      }

      database
        .prepare(
          `
          UPDATE workflow_runs
          SET
            status = ?,
            started_at = ?,
            ended_at = ?,
            summary = ?,
            error = ?,
            workflow_snapshot = ?,
            updated_at = ?
          WHERE id = ?
          `,
        )
        .run(
          updatedRun.status,
          updatedRun.startedAt ?? null,
          updatedRun.endedAt ?? null,
          updatedRun.summary ?? null,
          updatedRun.error ?? null,
          serializeOptionalJson(updatedRun.workflowSnapshot),
          updatedRun.updatedAt,
          id,
        )

      return updatedRun
    },

    async listRuns(workflowId, options) {
      const limit = options?.limit ?? 50
      const rows = workflowId
        ? database
            .prepare(
              `
              SELECT *
              FROM workflow_runs
              WHERE workflow_id = ?
              ORDER BY created_at DESC
              LIMIT ?
              `,
            )
            .all(workflowId, limit)
        : database
            .prepare(
              `
              SELECT *
              FROM workflow_runs
              ORDER BY created_at DESC
              LIMIT ?
              `,
            )
            .all(limit)

      return rows.map((row) => mapWorkflowRunRow(row as WorkflowRunRow))
    },

    async createActionRun(input) {
      const now = new Date().toISOString()
      const actionRun: ActionRun = {
        id: randomUUID(),
        runId: input.runId,
        workflowId: input.workflowId,
        actionRefId: input.actionRefId,
        actionId: input.actionId,
        order: input.order,
        status: input.status ?? 'running',
        startedAt: input.startedAt,
        inputSummary: input.inputSummary,
        createdAt: now,
        updatedAt: now,
      }

      database
        .prepare(
          `
          INSERT INTO action_runs (
            id,
            run_id,
            workflow_id,
            action_ref_id,
            action_id,
            action_order,
            status,
            started_at,
            ended_at,
            input_summary,
            output_summary,
            error,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
        )
        .run(
          actionRun.id,
          actionRun.runId,
          actionRun.workflowId,
          actionRun.actionRefId,
          actionRun.actionId,
          actionRun.order,
          actionRun.status,
          actionRun.startedAt ?? null,
          actionRun.endedAt ?? null,
          serializeOptionalJson(actionRun.inputSummary),
          serializeOptionalJson(actionRun.outputSummary),
          actionRun.error ?? null,
          actionRun.createdAt,
          actionRun.updatedAt,
        )

      return actionRun
    },

    async updateActionRun(id, input) {
      const currentActionRun = getActionRun(database, id)
      const updatedActionRun: ActionRun = {
        ...currentActionRun,
        ...input,
        updatedAt: new Date().toISOString(),
      }

      database
        .prepare(
          `
          UPDATE action_runs
          SET
            status = ?,
            started_at = ?,
            ended_at = ?,
            input_summary = ?,
            output_summary = ?,
            error = ?,
            updated_at = ?
          WHERE id = ?
          `,
        )
        .run(
          updatedActionRun.status,
          updatedActionRun.startedAt ?? null,
          updatedActionRun.endedAt ?? null,
          serializeOptionalJson(updatedActionRun.inputSummary),
          serializeOptionalJson(updatedActionRun.outputSummary),
          updatedActionRun.error ?? null,
          updatedActionRun.updatedAt,
          id,
        )

      return updatedActionRun
    },

    async listActionRuns(runId) {
      const rows = database
        .prepare(
          `
          SELECT *
          FROM action_runs
          WHERE run_id = ?
          ORDER BY action_order ASC
          `,
        )
        .all(runId)

      return rows.map((row) => mapActionRunRow(row as ActionRunRow))
    },
  }
}

function getWorkflowRun(database: SqliteDatabase, id: string): WorkflowRun {
  const row = database
    .prepare('SELECT * FROM workflow_runs WHERE id = ?')
    .get(id) as WorkflowRunRow | undefined

  if (!row) {
    throw new Error(`Workflow run not found: ${id}`)
  }

  return mapWorkflowRunRow(row)
}

function getActionRun(database: SqliteDatabase, id: string): ActionRun {
  const row = database
    .prepare('SELECT * FROM action_runs WHERE id = ?')
    .get(id) as ActionRunRow | undefined

  if (!row) {
    throw new Error(`Action run not found: ${id}`)
  }

  return mapActionRunRow(row)
}

function mapWorkflowRunRow(row: WorkflowRunRow): WorkflowRun {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    actorType: row.actor_type,
    actorId: row.actor_id ?? undefined,
    triggerSource: row.trigger_source,
    status: row.status,
    startedAt: row.started_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
    summary: row.summary ?? undefined,
    error: row.error ?? undefined,
    workflowSnapshot: parseOptionalJson(row.workflow_snapshot),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapActionRunRow(row: ActionRunRow): ActionRun {
  return {
    id: row.id,
    runId: row.run_id,
    workflowId: row.workflow_id,
    actionRefId: row.action_ref_id,
    actionId: row.action_id,
    order: row.action_order,
    status: row.status,
    startedAt: row.started_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
    inputSummary: parseOptionalJson(row.input_summary),
    outputSummary: parseOptionalJson(row.output_summary),
    error: row.error ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function serializeOptionalJson(value: unknown): string | null {
  return value === undefined ? null : JSON.stringify(value)
}

function parseOptionalJson(value: string | null): unknown {
  return value === null ? undefined : JSON.parse(value)
}
