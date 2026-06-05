import { randomUUID } from 'node:crypto'
import type {
  CreateTodoInput,
  TodoItem,
  UpdateTodoInput,
} from '../../../shared/todos'
import type { SqliteDatabase } from '../../database/sqliteDatabase'

export type TodoStore = {
  listTodos(input?: ListTodosInput): Promise<TodoItem[]>
  createTodo(input: CreateTodoInput): Promise<TodoItem>
  updateTodo(id: string, input: UpdateTodoInput): Promise<TodoItem>
  deleteTodo(id: string): Promise<void>
}

export type ListTodosInput = {
  includeCompleted?: boolean
  includeDeleted?: boolean
}

export type TodoStoreOptions = {
  database: SqliteDatabase
}

type TodoRow = {
  id: string
  title: string
  due_at: string | null
  category: string | null
  details: string | null
  completed: 0 | 1
  completed_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export function createTodoStore({ database }: TodoStoreOptions): TodoStore {
  return {
    async listTodos(input) {
      const rows = database
        .prepare(createListTodosQuery(input))
        .all() as TodoRow[]

      return rows.map(mapTodoRow)
    },

    async createTodo(input) {
      const now = new Date().toISOString()
      const todo: TodoItem = {
        id: randomUUID(),
        title: normalizeTitle(input.title),
        dueAt: normalizeOptionalString(input.dueAt),
        category: normalizeOptionalString(input.category),
        details: normalizeOptionalString(input.details),
        completed: false,
        createdAt: now,
        updatedAt: now,
      }

      database
        .prepare(
          `
          INSERT INTO todos (
            id,
            title,
            due_at,
            category,
            details,
            completed,
            completed_at,
            deleted_at,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
        )
        .run(
          todo.id,
          todo.title,
          todo.dueAt ?? null,
          todo.category ?? null,
          todo.details ?? null,
          0,
          null,
          null,
          todo.createdAt,
          todo.updatedAt,
        )

      return todo
    },

    async updateTodo(id, input) {
      const currentTodo = getTodo(database, id)
      const now = new Date().toISOString()
      const completed =
        input.completed === undefined ? currentTodo.completed : input.completed
      const updatedTodo: TodoItem = {
        ...currentTodo,
        title:
          input.title === undefined
            ? currentTodo.title
            : normalizeTitle(input.title),
        dueAt:
          input.dueAt === undefined
            ? currentTodo.dueAt
            : normalizeOptionalString(input.dueAt),
        category:
          input.category === undefined
            ? currentTodo.category
            : normalizeOptionalString(input.category),
        details:
          input.details === undefined
            ? currentTodo.details
            : normalizeOptionalString(input.details),
        completed,
        completedAt:
          completed && !currentTodo.completed
            ? now
            : completed
              ? currentTodo.completedAt
              : undefined,
        updatedAt: now,
      }

      database
        .prepare(
          `
          UPDATE todos
          SET
            title = ?,
            due_at = ?,
            category = ?,
            details = ?,
            completed = ?,
            completed_at = ?,
            updated_at = ?
          WHERE id = ?
          `,
        )
        .run(
          updatedTodo.title,
          updatedTodo.dueAt ?? null,
          updatedTodo.category ?? null,
          updatedTodo.details ?? null,
          updatedTodo.completed ? 1 : 0,
          updatedTodo.completedAt ?? null,
          updatedTodo.updatedAt,
          id,
        )

      return updatedTodo
    },

    async deleteTodo(id) {
      getTodo(database, id)
      const now = new Date().toISOString()
      database
        .prepare(
          `
          UPDATE todos
          SET deleted_at = ?, updated_at = ?
          WHERE id = ?
          `,
        )
        .run(now, now, id)
    },
  }
}

function getTodo(database: SqliteDatabase, id: string): TodoItem {
  const row = database
    .prepare('SELECT * FROM todos WHERE id = ?')
    .get(id) as TodoRow | undefined

  if (!row) {
    throw new Error(`Todo not found: ${id}`)
  }

  return mapTodoRow(row)
}

function createListTodosQuery(input: ListTodosInput | undefined): string {
  const filters: string[] = []

  if (!input?.includeDeleted) {
    filters.push('deleted_at IS NULL')
  }

  if (!input?.includeCompleted) {
    filters.push('completed = 0')
  }

  return `
    SELECT *
    FROM todos
    ${filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : ''}
    ORDER BY
      completed ASC,
      CASE WHEN due_at IS NULL THEN 1 ELSE 0 END ASC,
      due_at ASC,
      updated_at DESC
  `
}

function mapTodoRow(row: TodoRow): TodoItem {
  return {
    id: row.id,
    title: row.title,
    dueAt: row.due_at ?? undefined,
    category: row.category ?? undefined,
    details: row.details ?? undefined,
    completed: row.completed === 1,
    completedAt: row.completed_at ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function normalizeTitle(value: unknown): string {
  const title = typeof value === 'string' ? value.trim() : ''
  if (!title) {
    throw new Error('Todo title is required.')
  }

  return title
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}
