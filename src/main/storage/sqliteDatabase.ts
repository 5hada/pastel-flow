import { mkdirSync } from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import type { Database as BetterSqliteDatabase } from 'better-sqlite3'

export type SqliteDatabase = BetterSqliteDatabase

export type SqliteDatabaseOptions = {
  dataDir: string
}

export function createSqliteDatabase({
  dataDir,
}: SqliteDatabaseOptions): SqliteDatabase {
  mkdirSync(dataDir, { recursive: true })
  const database = new Database(path.join(dataDir, 'pastel-flow.sqlite'))
  database.pragma('journal_mode = WAL')
  database.pragma('foreign_keys = ON')
  runMigrations(database)

  return database
}

function runMigrations(database: SqliteDatabase): void {
  database
    .prepare(
      `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL
      )
      `,
    )
    .run()

  for (const migration of migrations) {
    const existing = database
      .prepare('SELECT id FROM schema_migrations WHERE id = ?')
      .get(migration.id)

    if (existing) {
      continue
    }

    database.transaction(() => {
      migration.up(database)
      database
        .prepare(
          'INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)',
        )
        .run(migration.id, new Date().toISOString())
    })()
  }
}

const migrations: Array<{
  id: string
  up(database: SqliteDatabase): void
}> = [
  {
    id: '001_create_workflow_runs',
    up(database) {
      database
        .prepare(
          `
          CREATE TABLE workflow_runs (
            id TEXT PRIMARY KEY,
            workflow_id TEXT NOT NULL,
            actor_type TEXT NOT NULL,
            actor_id TEXT,
            trigger_source TEXT NOT NULL,
            status TEXT NOT NULL,
            started_at TEXT,
            ended_at TEXT,
            summary TEXT,
            error TEXT,
            workflow_snapshot TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          )
          `,
        )
        .run()
      database
        .prepare(
          'CREATE INDEX workflow_runs_workflow_created_idx ON workflow_runs (workflow_id, created_at DESC)',
        )
        .run()
    },
  },
  {
    id: '002_create_action_runs',
    up(database) {
      database
        .prepare(
          `
          CREATE TABLE action_runs (
            id TEXT PRIMARY KEY,
            run_id TEXT NOT NULL,
            workflow_id TEXT NOT NULL,
            action_ref_id TEXT NOT NULL,
            action_id TEXT NOT NULL,
            action_order INTEGER NOT NULL,
            status TEXT NOT NULL,
            started_at TEXT,
            ended_at TEXT,
            input_summary TEXT,
            output_summary TEXT,
            error TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (run_id) REFERENCES workflow_runs(id) ON DELETE CASCADE
          )
          `,
        )
        .run()
      database
        .prepare(
          'CREATE INDEX action_runs_run_order_idx ON action_runs (run_id, action_order)',
        )
        .run()
    },
  },
  {
    id: '003_create_workflow_run_events',
    up(database) {
      database
        .prepare(
          `
          CREATE TABLE workflow_run_events (
            id TEXT PRIMARY KEY,
            run_id TEXT,
            workflow_id TEXT NOT NULL,
            action_run_id TEXT,
            device_id TEXT NOT NULL,
            status TEXT NOT NULL,
            message TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (run_id) REFERENCES workflow_runs(id) ON DELETE SET NULL,
            FOREIGN KEY (action_run_id) REFERENCES action_runs(id) ON DELETE SET NULL
          )
          `,
        )
        .run()
      database
        .prepare(
          'CREATE INDEX workflow_run_events_workflow_created_idx ON workflow_run_events (workflow_id, created_at DESC)',
        )
        .run()
      database
        .prepare(
          'CREATE INDEX workflow_run_events_run_created_idx ON workflow_run_events (run_id, created_at DESC)',
        )
        .run()
    },
  },
  {
    id: '004_create_workflow_artifacts',
    up(database) {
      database
        .prepare(
          `
          CREATE TABLE workflow_artifacts (
            id TEXT PRIMARY KEY,
            run_id TEXT NOT NULL,
            workflow_id TEXT NOT NULL,
            action_run_id TEXT,
            artifact_type TEXT NOT NULL,
            artifact_path TEXT NOT NULL,
            artifact_size INTEGER,
            summary TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (run_id) REFERENCES workflow_runs(id) ON DELETE CASCADE,
            FOREIGN KEY (action_run_id) REFERENCES action_runs(id) ON DELETE SET NULL
          )
          `,
        )
        .run()
      database
        .prepare(
          'CREATE INDEX workflow_artifacts_run_created_idx ON workflow_artifacts (run_id, created_at DESC)',
        )
        .run()
      database
        .prepare(
          'CREATE INDEX workflow_artifacts_action_created_idx ON workflow_artifacts (action_run_id, created_at DESC)',
        )
        .run()
    },
  },
]
