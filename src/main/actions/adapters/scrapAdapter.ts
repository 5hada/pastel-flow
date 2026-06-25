import type {
  ScrapActionConfig,
} from '../../../shared/actions'
import type {
  CreateScrapInput,
  ScrapItem,
  ScrapSearchQuery,
} from '../../../shared/scraps'
import type { ScrapStore } from '../../scraps/scrapStore'
import type { ActionAdapter } from './actionAdapter'

type ScrapActionRunConfig = ScrapActionConfig & {
  input?: Record<string, unknown>
}

export type ScrapAdapterOptions = {
  scrapStore: ScrapStore
}

export function createScrapAdapter({
  scrapStore,
}: ScrapAdapterOptions): ActionAdapter<ScrapActionRunConfig, Record<string, unknown>> {
  return {
    type: 'scrap_action',
    validateConfig(config) {
      const normalizedConfig = normalizeScrapActionConfig(config)
      if (normalizedConfig.mode === 'ingest' && !normalizedConfig.input?.source) {
        throw new Error('Scrap ingest action에는 source 입력이 필요합니다.')
      }
    },
    async run({ action }) {
      const config = normalizeScrapActionConfig(action.config)

      switch (config.mode) {
        case 'ingest':
          return runIngest(scrapStore, config)
        case 'search':
          return runSearch(scrapStore, config)
        case 'update':
          return runUpdate(scrapStore, config)
        case 'classify':
          return runClassify(config)
      }
    },
  }
}

async function runIngest(
  scrapStore: ScrapStore,
  config: ScrapActionRunConfig,
) {
  const input = config.input ?? {}
  const source = input.source
  if (!isRecord(source)) {
    throw new Error('Scrap ingest source 입력이 올바르지 않습니다.')
  }

  const scrap = await scrapStore.createScrap({
    title: typeof input.title === 'string' ? input.title : undefined,
    source: source as CreateScrapInput['source'],
    status: config.status,
    collectionIds: config.collectionId ? [config.collectionId] : undefined,
    tags: config.tags,
  })

  return createSucceededResult(
    { scrap },
    `Scrap을 저장했습니다: ${scrap.title}`,
  )
}

async function runSearch(
  scrapStore: ScrapStore,
  config: ScrapActionRunConfig,
) {
  const input = config.input
  const queryInput = input && isRecord(input.query) ? input.query : {}
  const query: ScrapSearchQuery = {
    ...config.query,
    ...queryInput,
  }
  const results = await scrapStore.searchScraps(query)

  return createSucceededResult(
    { results },
    `Scrap 검색 결과 ${results.length}개를 찾았습니다.`,
  )
}

async function runUpdate(
  scrapStore: ScrapStore,
  config: ScrapActionRunConfig,
) {
  const scrap = readInputScrap(config.input?.scrap)
  const updatedScrap = await scrapStore.updateScrap(scrap.id, {
    status: config.status,
    tags: config.tags,
    collectionIds: config.collectionId ? [config.collectionId] : undefined,
  })

  return createSucceededResult(
    { scrap: updatedScrap },
    `Scrap을 업데이트했습니다: ${updatedScrap.title}`,
  )
}

async function runClassify(config: ScrapActionRunConfig) {
  const scrap = readInputScrap(config.input?.scrap)
  const tags = createHeuristicTags(scrap)

  return createSucceededResult(
    {
      classification: {
        topics: [],
        tags: tags.map((tag) => ({
          name: tag,
          confidence: 0.6,
          source: 'heuristic',
        })),
        entities: [],
        suggestedCollections: [],
        classifiedAt: new Date().toISOString(),
      },
    },
    `Scrap 분류 후보 ${tags.length}개를 생성했습니다.`,
  )
}

function createSucceededResult(output: Record<string, unknown>, message: string) {
  return {
    state: {
      status: 'succeeded' as const,
      output,
      lastMessage: message,
    },
    message,
  }
}

function normalizeScrapActionConfig(
  config: Partial<ScrapActionRunConfig>,
): ScrapActionRunConfig {
  return {
    mode: isScrapActionMode(config.mode) ? config.mode : 'search',
    collectionId:
      typeof config.collectionId === 'string' && config.collectionId.trim()
        ? config.collectionId.trim()
        : undefined,
    query: isRecord(config.query) ? config.query : undefined,
    status: config.status,
    tags: Array.isArray(config.tags)
      ? config.tags
          .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
          .filter(Boolean)
      : undefined,
    input: isRecord(config.input) ? config.input : undefined,
  }
}

function readInputScrap(value: unknown): ScrapItem {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id.trim()) {
    throw new Error('Scrap 입력이 올바르지 않습니다.')
  }

  return value as ScrapItem
}

function createHeuristicTags(scrap: ScrapItem): string[] {
  return [
    scrap.source.sourceType,
    ...scrap.tags,
    ...tokenize(scrap.title),
    ...tokenize(scrap.summary),
  ].slice(0, 12)
}

function tokenize(value: unknown): string[] {
  return typeof value === 'string'
    ? [
        ...new Set(
          value
            .toLowerCase()
            .split(/[^a-z0-9가-힣_-]+/i)
            .map((token) => token.trim())
            .filter((token) => token.length >= 2),
        ),
      ]
    : []
}

function isScrapActionMode(value: unknown): value is ScrapActionConfig['mode'] {
  return (
    value === 'ingest' ||
    value === 'classify' ||
    value === 'search' ||
    value === 'update'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
