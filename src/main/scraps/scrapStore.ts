import { randomUUID } from 'node:crypto'
import type {
  CreateScrapInput,
  ScrapDocument,
  ScrapIndex,
  ScrapItem,
  ScrapSearchQuery,
  ScrapSearchResult,
  ScrapSource,
  ScrapStatus,
  UpdateScrapInput,
} from '../../shared/scraps'
import type { SqliteDatabase } from '../database/sqliteDatabase'

export type ScrapStore = {
  getScrap(id: string): Promise<ScrapItem>
  listScraps(input?: ListScrapsInput): Promise<ScrapItem[]>
  searchScraps(query: ScrapSearchQuery): Promise<ScrapSearchResult[]>
  createScrap(input: CreateScrapInput): Promise<ScrapItem>
  updateScrap(id: string, input: UpdateScrapInput): Promise<ScrapItem>
  deleteScrap(id: string): Promise<void>
}

export type ListScrapsInput = {
  status?: ScrapStatus
  collectionId?: string
}

export type ScrapStoreOptions = {
  database: SqliteDatabase
}

type ScrapRow = {
  id: string
  title: string
  source: string
  status: ScrapStatus
  collection_ids: string
  tags: string
  summary: string | null
  document: string | null
  search_index: string | null
  created_at: string
  updated_at: string
}

export function createScrapStore({ database }: ScrapStoreOptions): ScrapStore {
  return {
    async getScrap(id) {
      return getScrap(database, id)
    },

    async listScraps(input) {
      const rows = database
        .prepare(createListScrapsQuery(input))
        .all(...getListScrapsQueryParams(input)) as ScrapRow[]

      return rows
        .map(mapScrapRow)
        .filter((scrap) =>
          input?.collectionId
            ? scrap.collectionIds.includes(input.collectionId)
            : true,
        )
    },

    async searchScraps(query) {
      const normalizedQuery = normalizeScrapSearchQuery(query)
      const scraps = await this.listScraps({
        status: normalizedQuery.status,
      })
      const text = normalizedQuery.text?.toLowerCase()
      const scoredResults = scraps.flatMap((scrap): ScrapSearchResult[] => {
        if (
          normalizedQuery.collectionIds?.length &&
          !normalizedQuery.collectionIds.some((collectionId) =>
            scrap.collectionIds.includes(collectionId),
          )
        ) {
          return []
        }

        if (
          normalizedQuery.sourceTypes?.length &&
          !normalizedQuery.sourceTypes.includes(scrap.source.sourceType)
        ) {
          return []
        }

        if (
          normalizedQuery.tags?.length &&
          !normalizedQuery.tags.every((tag) => scrap.tags.includes(tag))
        ) {
          return []
        }

        const searchableText = createSearchableScrapText(scrap)
        const score = text ? scoreScrapSearchText(searchableText, text) : 1
        if (score <= 0) {
          return []
        }

        return [
          {
            scrapId: scrap.id,
            score,
            title: scrap.title,
            summary: scrap.summary,
            highlights: text ? createHighlights(searchableText, text) : undefined,
          },
        ]
      })

      return scoredResults
        .sort((left, right) => right.score - left.score)
        .slice(0, normalizedQuery.limit)
    },

    async createScrap(input) {
      const now = new Date().toISOString()
      const source = normalizeScrapSource({
        ...input.source,
        id: randomUUID(),
        capturedAt: now,
      })
      const scrap: ScrapItem = {
        id: randomUUID(),
        title: normalizeScrapTitle(input.title, source),
        source,
        status: normalizeScrapStatus(input.status),
        collectionIds: normalizeStringList(input.collectionIds),
        tags: normalizeStringList(input.tags),
        createdAt: now,
        updatedAt: now,
      }

      insertScrap(database, scrap)

      return scrap
    },

    async updateScrap(id, input) {
      const current = getScrap(database, id)
      const updatedScrap: ScrapItem = {
        ...current,
        title:
          input.title === undefined
            ? current.title
            : normalizeScrapTitle(input.title, current.source),
        status:
          input.status === undefined
            ? current.status
            : normalizeScrapStatus(input.status),
        collectionIds:
          input.collectionIds === undefined
            ? current.collectionIds
            : normalizeStringList(input.collectionIds),
        tags:
          input.tags === undefined
            ? current.tags
            : normalizeStringList(input.tags),
        summary:
          input.summary === undefined
            ? current.summary
            : normalizeOptionalString(input.summary),
        updatedAt: new Date().toISOString(),
      }

      database
        .prepare(
          `
          UPDATE scraps
          SET
            title = ?,
            status = ?,
            collection_ids = ?,
            tags = ?,
            summary = ?,
            document = ?,
            search_index = ?,
            updated_at = ?
          WHERE id = ?
          `,
        )
        .run(
          updatedScrap.title,
          updatedScrap.status,
          JSON.stringify(updatedScrap.collectionIds),
          JSON.stringify(updatedScrap.tags),
          updatedScrap.summary ?? null,
          stringifyOptionalJson(updatedScrap.document),
          stringifyOptionalJson(updatedScrap.index),
          updatedScrap.updatedAt,
          id,
        )

      return updatedScrap
    },

    async deleteScrap(id) {
      getScrap(database, id)
      database.prepare('DELETE FROM scraps WHERE id = ?').run(id)
    },
  }
}

function getScrap(database: SqliteDatabase, id: string): ScrapItem {
  const row = database
    .prepare('SELECT * FROM scraps WHERE id = ?')
    .get(id) as ScrapRow | undefined

  if (!row) {
    throw new Error(`Scrap not found: ${id}`)
  }

  return mapScrapRow(row)
}

function insertScrap(database: SqliteDatabase, scrap: ScrapItem): void {
  database
    .prepare(
      `
      INSERT INTO scraps (
        id,
        title,
        source,
        status,
        collection_ids,
        tags,
        summary,
        document,
        search_index,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      scrap.id,
      scrap.title,
      JSON.stringify(scrap.source),
      scrap.status,
      JSON.stringify(scrap.collectionIds),
      JSON.stringify(scrap.tags),
      scrap.summary ?? null,
      stringifyOptionalJson(scrap.document),
      stringifyOptionalJson(scrap.index),
      scrap.createdAt,
      scrap.updatedAt,
    )
}

function createListScrapsQuery(input: ListScrapsInput | undefined): string {
  return `
    SELECT *
    FROM scraps
    ${input?.status ? 'WHERE status = ?' : ''}
    ORDER BY updated_at DESC
  `
}

function getListScrapsQueryParams(input: ListScrapsInput | undefined): unknown[] {
  return input?.status ? [input.status] : []
}

function mapScrapRow(row: ScrapRow): ScrapItem {
  const source = normalizeScrapSource(parseJson(row.source))

  return {
    id: row.id,
    title: row.title,
    source,
    status: normalizeScrapStatus(row.status),
    collectionIds: parseStringArray(row.collection_ids),
    tags: parseStringArray(row.tags),
    summary: row.summary ?? undefined,
    document: parseOptionalJson<ScrapDocument>(row.document),
    index: parseOptionalJson<ScrapIndex>(row.search_index),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function normalizeScrapSource(value: unknown): ScrapSource {
  if (!isRecord(value) || !isScrapSourceType(value.sourceType)) {
    throw new Error('Scrap source 형식이 올바르지 않습니다.')
  }

  const base = {
    id: normalizeNonEmptyString(value.id, 'Scrap source id가 필요합니다.'),
    sourceType: value.sourceType,
    label: normalizeOptionalString(value.label),
    capturedAt: normalizeOptionalString(value.capturedAt) ?? new Date().toISOString(),
    metadata: isRecord(value.metadata) ? value.metadata : undefined,
  }

  switch (value.sourceType) {
    case 'url':
      return {
        ...base,
        sourceType: 'url',
        url: normalizeNonEmptyString(value.url, 'Scrap URL이 필요합니다.'),
        normalizedUrl: normalizeOptionalString(value.normalizedUrl),
        referrerUrl: normalizeOptionalString(value.referrerUrl),
      }
    case 'file':
      return {
        ...base,
        sourceType: 'file',
        path: normalizeNonEmptyString(value.path, 'Scrap file path가 필요합니다.'),
        fileName: normalizeOptionalString(value.fileName),
        mimeType: normalizeOptionalString(value.mimeType),
        sizeBytes: normalizeOptionalNumber(value.sizeBytes),
      }
    case 'memo':
      return {
        ...base,
        sourceType: 'memo',
        content: normalizeNonEmptyString(value.content, 'Scrap memo 내용이 필요합니다.'),
      }
    case 'text':
      return {
        ...base,
        sourceType: 'text',
        content: normalizeNonEmptyString(value.content, 'Scrap text 내용이 필요합니다.'),
        sourceName: normalizeOptionalString(value.sourceName),
      }
    case 'browser_selection':
      return {
        ...base,
        sourceType: 'browser_selection',
        url: normalizeOptionalString(value.url),
        selectedText: normalizeNonEmptyString(
          value.selectedText,
          'Scrap 선택 텍스트가 필요합니다.',
        ),
        pageTitle: normalizeOptionalString(value.pageTitle),
      }
    case 'clipboard':
      return {
        ...base,
        sourceType: 'clipboard',
        content: normalizeNonEmptyString(
          value.content,
          'Scrap clipboard 내용이 필요합니다.',
        ),
        contentType: normalizeOptionalString(value.contentType),
      }
    case 'external':
      return {
        ...base,
        sourceType: 'external',
        provider: normalizeNonEmptyString(
          value.provider,
          'Scrap external provider가 필요합니다.',
        ),
        externalId: normalizeOptionalString(value.externalId),
        payload: value.payload,
      }
  }
}

function normalizeScrapTitle(value: unknown, source: ScrapSource): string {
  const title = normalizeOptionalString(value) ?? source.label ?? getSourceTitle(source)
  if (!title.trim()) {
    throw new Error('Scrap title이 필요합니다.')
  }

  return title.trim()
}

function getSourceTitle(source: ScrapSource): string {
  switch (source.sourceType) {
    case 'url':
      return source.normalizedUrl ?? source.url
    case 'file':
      return source.fileName ?? source.path
    case 'memo':
      return source.content.slice(0, 80)
    case 'text':
      return source.sourceName ?? source.content.slice(0, 80)
    case 'browser_selection':
      return source.pageTitle ?? source.selectedText.slice(0, 80)
    case 'clipboard':
      return source.content.slice(0, 80)
    case 'external':
      return source.externalId ?? source.provider
  }
}

function normalizeScrapStatus(value: unknown): ScrapStatus {
  return isScrapStatus(value) ? value : 'inbox'
}

function normalizeScrapSearchQuery(query: ScrapSearchQuery): Required<
  Pick<ScrapSearchQuery, 'limit'>
> &
  Omit<ScrapSearchQuery, 'limit' | 'status'> & {
    status?: ScrapStatus
  } {
  return {
    text: normalizeOptionalString(query.text),
    collectionIds: normalizeOptionalStringList(query.collectionIds),
    sourceTypes: normalizeOptionalStringList(query.sourceTypes),
    tags: normalizeOptionalStringList(query.tags),
    topics: normalizeOptionalStringList(query.topics),
    status: isScrapStatus(query.status) ? query.status : undefined,
    limit: normalizeSearchLimit(query.limit),
  }
}

function createSearchableScrapText(scrap: ScrapItem): string {
  return [
    scrap.title,
    scrap.summary,
    scrap.tags.join(' '),
    JSON.stringify(scrap.source),
    scrap.document?.title,
    scrap.document?.content,
    scrap.index?.summary,
    scrap.index?.keywords.join(' '),
  ]
    .filter(Boolean)
    .join('\n')
}

function scoreScrapSearchText(value: string, text: string): number {
  const normalizedValue = value.toLowerCase()
  if (!normalizedValue.includes(text)) {
    return 0
  }

  const titleWeight = normalizedValue.split('\n')[0]?.includes(text) ? 5 : 0
  const occurrences = normalizedValue.split(text).length - 1
  return titleWeight + occurrences
}

function createHighlights(value: string, text: string): string[] {
  const normalizedText = text.toLowerCase()
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.toLowerCase().includes(normalizedText))
    .slice(0, 3)
}

function normalizeSearchLimit(value: unknown): number {
  const numericValue = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numericValue)) {
    return 50
  }

  return Math.min(Math.max(Math.floor(numericValue), 1), 200)
}

function isScrapStatus(value: unknown): value is ScrapStatus {
  return (
    value === 'inbox' ||
    value === 'processing' ||
    value === 'classified' ||
    value === 'archived' ||
    value === 'dismissed'
  )
}

function isScrapSourceType(value: unknown): value is ScrapSource['sourceType'] {
  return (
    value === 'url' ||
    value === 'file' ||
    value === 'memo' ||
    value === 'text' ||
    value === 'browser_selection' ||
    value === 'clipboard' ||
    value === 'external'
  )
}

function parseStringArray(value: string): string[] {
  return normalizeStringList(parseJson(value))
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return [
    ...new Set(
      value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean),
    ),
  ]
}

function normalizeOptionalStringList(value: unknown): string[] | undefined {
  const list = normalizeStringList(value)
  return list.length > 0 ? list : undefined
}

function parseOptionalJson<T>(value: string | null): T | undefined {
  if (!value) {
    return undefined
  }

  return parseJson(value) as T
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

function stringifyOptionalJson(value: unknown): string | null {
  return value === undefined ? null : JSON.stringify(value)
}

function normalizeNonEmptyString(value: unknown, message: string): string {
  const normalized = normalizeOptionalString(value)
  if (!normalized) {
    throw new Error(message)
  }

  return normalized
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
