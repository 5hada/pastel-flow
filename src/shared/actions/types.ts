import type { RunStatus } from '../runStatus'
import type { ScrapSearchQuery, ScrapStatus } from '../scraps'
import type { SecretRef } from '../secrets'

export type ActionType =
  | 'browser_action'
  | 'crawler_action'
  | 'discord_dry_run_action'
  | 'notion_dry_run_action'
  | 'trading_dry_run_action'
  | 'transform_action'
  | 'tool_action'
  | 'webhook_action'
  | 'scrap_action'
  | 'database_action'
  | 'macro_action'

export type ActionCapabilityCategory =
  | 'browser'
  | 'crawler'
  | 'transform'
  | 'tool'
  | 'webhook'
  | 'scrap'
  | 'database'
  | 'macro'
  | 'integration'

export type ActionCapability =
  | 'browser.open_tabs'
  | 'browser.open_collection'
  | 'crawler.fetch_urls'
  | 'transform.convert'
  | 'tool.run'
  | 'webhook.discord'
  | 'scrap.ingest'
  | 'scrap.classify'
  | 'scrap.search'
  | 'scrap.update'
  | 'database.query'
  | 'database.upsert'
  | 'macro.run'

export type ActionIODataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'json'
  | 'secret_ref'
  | 'string[]'
  | 'number[]'
  | 'boolean[]'
  | 'file'
  | 'file[]'
  | 'image'
  | 'image[]'
  | 'url'
  | 'url[]'
  | 'scrap'
  | 'scrap[]'
  | 'scrap_collection'
  | 'document'
  | 'document[]'
  | 'chunk'
  | 'chunk[]'
  | 'any'

export type ActionIOField = {
  id: string
  name: string
  type: ActionIODataType
  required?: boolean
  description?: string
}

export type ActionDefinition<AConfig = unknown> = {
  id: string
  name: string
  type: ActionType
  capability?: ActionCapability
  version?: number
  config: AConfig
  secretRefs?: SecretRef[]
  inputSchema?: ActionIOField[]
  outputSchema?: ActionIOField[]
  createdAt: string
  updatedAt: string
}

export type ActionRuntimeState = {
  status: RunStatus
  startedAt?: string
  endedAt?: string
  lastError?: string
  lastMessage?: string
  outputPath?: string
}

export type CrawlerConfig = {
  urls: string[]
  maxBytes: number
}

export type DiscordBotConfig = {
  dryRun: boolean
  commandPrefix?: string
}

export type NotionSyncConfig = {
  dryRun: boolean
  databaseId?: string
}

export type TradingBotConfig = {
  dryRun: boolean
  exchange?: string
  symbol?: string
}

export type TransformMode =
  | 'json_to_string'
  | 'string_to_json'
  | 'pick_field'
  | 'join'
  | 'split'

export type TransformActionConfig = {
  mode: TransformMode
  path?: string
  separator?: string
}

export type WebhookActionConfig = {
  provider: 'discord' | 'custom'
  endpointUrl?: string
  method?: 'POST' | 'PUT' | 'PATCH'
  headers?: Record<string, string>
  secretRefId?: string
}

export type ScrapActionMode = 'ingest' | 'classify' | 'search' | 'update'

export type ScrapActionConfig = {
  mode: ScrapActionMode
  collectionId?: string
  query?: ScrapSearchQuery
  status?: ScrapStatus
  tags?: string[]
}

export type DatabaseActionMode = 'query' | 'upsert'

export type DatabaseActionConfig = {
  mode: DatabaseActionMode
  target: 'scraps' | 'collections' | 'custom'
  query?: unknown
  tableName?: string
}

export type MacroActionConfig = {
  macroId?: string
  steps?: Array<Record<string, unknown>>
}

export type CreateActionInput<TConfig = unknown> = {
  name: string
  type: ActionDefinition<TConfig>['type']
  capability?: ActionDefinition<TConfig>['capability']
  version?: ActionDefinition<TConfig>['version']
  config: TConfig
  secretRefs?: ActionDefinition<TConfig>['secretRefs']
  inputSchema?: ActionDefinition<TConfig>['inputSchema']
  outputSchema?: ActionDefinition<TConfig>['outputSchema']
}

export type UpdateActionInput<TConfig = unknown> = Partial<
  Pick<
    ActionDefinition<TConfig>,
    | 'name'
    | 'type'
    | 'capability'
    | 'version'
    | 'config'
    | 'secretRefs'
    | 'inputSchema'
    | 'outputSchema'
  >
>
