import { randomUUID } from 'node:crypto'
import type {
  CreateUrlGroupInput,
  UpdateUrlGroupInput,
  UrlGroup,
  UrlGroupItem,
} from '../../../shared/urlGroups'
import { normalizeUrlGroupItems } from '../../../shared/urlGroups'
import type { SqliteDatabase } from '../../storage/sqliteDatabase'

export type UrlGroupStore = {
  getUrlGroup(id: string): Promise<UrlGroup>
  listUrlGroups(): Promise<UrlGroup[]>
  createUrlGroup(input: CreateUrlGroupInput): Promise<UrlGroup>
  updateUrlGroup(id: string, input: UpdateUrlGroupInput): Promise<UrlGroup>
  deleteUrlGroup(id: string): Promise<void>
}

export type UrlGroupStoreOptions = {
  database: SqliteDatabase
}

type UrlGroupRow = {
  id: string
  name: string
  description: string | null
  tags: string
  items: string
  created_at: string
  updated_at: string
}

export function createUrlGroupStore({
  database,
}: UrlGroupStoreOptions): UrlGroupStore {
  return {
    async getUrlGroup(id) {
      const row = database
        .prepare('SELECT * FROM url_groups WHERE id = ?')
        .get(id) as UrlGroupRow | undefined

      if (!row) {
        throw new Error(`URL group not found: ${id}`)
      }

      return mapUrlGroupRow(row)
    },

    async listUrlGroups() {
      const rows = database
        .prepare('SELECT * FROM url_groups ORDER BY updated_at DESC')
        .all() as UrlGroupRow[]

      return rows.map(mapUrlGroupRow)
    },

    async createUrlGroup(input) {
      const now = new Date().toISOString()
      const urlGroup: UrlGroup = {
        id: randomUUID(),
        name: normalizeName(input.name),
        description: normalizeOptionalString(input.description),
        tags: normalizeTags(input.tags),
        items: normalizeItems(input.items),
        createdAt: now,
        updatedAt: now,
      }

      database
        .prepare(
          `
          INSERT INTO url_groups (
            id,
            name,
            description,
            tags,
            items,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
        )
        .run(
          urlGroup.id,
          urlGroup.name,
          urlGroup.description ?? null,
          JSON.stringify(urlGroup.tags),
          JSON.stringify(urlGroup.items),
          urlGroup.createdAt,
          urlGroup.updatedAt,
        )

      return urlGroup
    },

    async updateUrlGroup(id, input) {
      const current = await this.getUrlGroup(id)
      const updatedUrlGroup: UrlGroup = {
        ...current,
        ...input,
        name:
          input.name === undefined ? current.name : normalizeName(input.name),
        description:
          input.description === undefined
            ? current.description
            : normalizeOptionalString(input.description),
        tags: input.tags === undefined ? current.tags : normalizeTags(input.tags),
        items:
          input.items === undefined ? current.items : normalizeItems(input.items),
        updatedAt: new Date().toISOString(),
      }

      database
        .prepare(
          `
          UPDATE url_groups
          SET
            name = ?,
            description = ?,
            tags = ?,
            items = ?,
            updated_at = ?
          WHERE id = ?
          `,
        )
        .run(
          updatedUrlGroup.name,
          updatedUrlGroup.description ?? null,
          JSON.stringify(updatedUrlGroup.tags),
          JSON.stringify(updatedUrlGroup.items),
          updatedUrlGroup.updatedAt,
          id,
        )

      return updatedUrlGroup
    },

    async deleteUrlGroup(id) {
      database.prepare('DELETE FROM url_groups WHERE id = ?').run(id)
    },
  }
}

function mapUrlGroupRow(row: UrlGroupRow): UrlGroup {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    tags: parseStringArray(row.tags),
    items: normalizeItems(JSON.parse(row.items)),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function normalizeName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : ''
  if (!name) {
    throw new Error('URL group 이름이 필요합니다.')
  }

  return name
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function normalizeTags(value: unknown): string[] {
  return Array.isArray(value)
    ? [
        ...new Set(
          value
            .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
            .filter(Boolean),
        ),
      ]
    : []
}

function normalizeItems(value: unknown): UrlGroupItem[] {
  return normalizeUrlGroupItems(value)
}

function parseStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    return normalizeTags(parsed)
  } catch {
    return []
  }
}
