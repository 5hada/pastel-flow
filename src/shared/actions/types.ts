import type { RunStatus } from '../runStatus'
import type { SecretRef } from '../secrets'

export type ActionType =
  | 'browser_action'
  | 'crawler_action'
  | 'discord_dry_run_action'
  | 'notion_dry_run_action'
  | 'trading_dry_run_action'
  | 'transform_action'
  | 'tool_action'

export type ActionIOField = {
  id: string
  name: string
  type:
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
  required?: boolean
  description?: string
}

export type ActionDefinition<AConfig = unknown> = {
  id: string
  name: string
  type: ActionType
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
