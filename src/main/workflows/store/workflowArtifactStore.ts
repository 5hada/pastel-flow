import { randomUUID } from 'node:crypto'
import type {
  CreateWorkflowArtifactInput,
  WorkflowArtifact,
} from '../../../shared/artifacts'
import type { SqliteDatabase } from '../../database/sqliteDatabase'

export type WorkflowArtifactStore = {
  createArtifact(input: CreateWorkflowArtifactInput): Promise<WorkflowArtifact>
  listArtifacts(input: ListWorkflowArtifactsInput): Promise<WorkflowArtifact[]>
}

export type ListWorkflowArtifactsInput = {
  runId?: string
  actionRunId?: string
  workflowId?: string
  limit?: number
}

export type WorkflowArtifactStoreOptions = {
  database: SqliteDatabase
}

type WorkflowArtifactRow = {
  id: string
  run_id: string
  workflow_id: string
  action_run_id: string | null
  artifact_type: WorkflowArtifact['type']
  artifact_path: string
  artifact_size: number | null
  summary: string | null
  created_at: string
}

export function createWorkflowArtifactStore({
  database,
}: WorkflowArtifactStoreOptions): WorkflowArtifactStore {
  return {
    async createArtifact(input) {
      const artifact: WorkflowArtifact = {
        id: randomUUID(),
        runId: input.runId,
        workflowId: input.workflowId,
        actionRunId: input.actionRunId,
        type: input.type,
        path: input.path,
        size: input.size,
        summary: input.summary,
        createdAt: new Date().toISOString(),
      }

      database
        .prepare(
          `
          INSERT INTO workflow_artifacts (
            id,
            run_id,
            workflow_id,
            action_run_id,
            artifact_type,
            artifact_path,
            artifact_size,
            summary,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
        )
        .run(
          artifact.id,
          artifact.runId,
          artifact.workflowId,
          artifact.actionRunId ?? null,
          artifact.type,
          artifact.path,
          artifact.size ?? null,
          artifact.summary ?? null,
          artifact.createdAt,
        )

      return artifact
    },

    async listArtifacts(input) {
      const limit = input.limit ?? 50
      const rows = selectArtifactRows(database, input, limit)

      return rows.map(mapWorkflowArtifactRow)
    },
  }
}

function selectArtifactRows(
  database: SqliteDatabase,
  input: ListWorkflowArtifactsInput,
  limit: number,
): WorkflowArtifactRow[] {
  if (input.actionRunId) {
    return database
      .prepare(
        `
        SELECT *
        FROM workflow_artifacts
        WHERE action_run_id = ?
        ORDER BY created_at DESC
        LIMIT ?
        `,
      )
      .all(input.actionRunId, limit) as WorkflowArtifactRow[]
  }

  if (input.runId) {
    return database
      .prepare(
        `
        SELECT *
        FROM workflow_artifacts
        WHERE run_id = ?
        ORDER BY created_at DESC
        LIMIT ?
        `,
      )
      .all(input.runId, limit) as WorkflowArtifactRow[]
  }

  if (input.workflowId) {
    return database
      .prepare(
        `
        SELECT *
        FROM workflow_artifacts
        WHERE workflow_id = ?
        ORDER BY created_at DESC
        LIMIT ?
        `,
      )
      .all(input.workflowId, limit) as WorkflowArtifactRow[]
  }

  return database
    .prepare(
      `
      SELECT *
      FROM workflow_artifacts
      ORDER BY created_at DESC
      LIMIT ?
      `,
    )
    .all(limit) as WorkflowArtifactRow[]
}

function mapWorkflowArtifactRow(row: WorkflowArtifactRow): WorkflowArtifact {
  return {
    id: row.id,
    runId: row.run_id,
    workflowId: row.workflow_id,
    actionRunId: row.action_run_id ?? undefined,
    type: row.artifact_type,
    path: row.artifact_path,
    size: row.artifact_size ?? undefined,
    summary: row.summary ?? undefined,
    createdAt: row.created_at,
  }
}
