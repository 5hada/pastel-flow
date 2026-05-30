import type {
  DiscordBotConfig,
  NotionSyncConfig,
  TaskState,
  TradingBotConfig,
} from '../../../src/shared/tasks'
import type { TaskAdapter } from './taskAdapter'

export const discordBotAdapter: TaskAdapter<DiscordBotConfig, TaskState> = {
  type: 'discord_bot',
  validateConfig(config) {
    if (config.dryRun !== true) {
      throw new Error('Discord bot adapter는 현재 dry-run 실행만 지원합니다.')
    }
  },
  async run({ task }) {
    return createDryRunResult(
      task.state,
      `Discord bot dry-run을 완료했습니다. prefix=${task.config.commandPrefix ?? '없음'}`,
    )
  },
}

export const notionSyncAdapter: TaskAdapter<NotionSyncConfig, TaskState> = {
  type: 'notion_sync',
  validateConfig(config) {
    if (config.dryRun !== true) {
      throw new Error('Notion sync adapter는 현재 dry-run 실행만 지원합니다.')
    }
  },
  async run({ task }) {
    return createDryRunResult(
      task.state,
      `Notion sync dry-run을 완료했습니다. database=${task.config.databaseId ?? '없음'}`,
    )
  },
}

export const tradingBotAdapter: TaskAdapter<TradingBotConfig, TaskState> = {
  type: 'trading_bot',
  validateConfig(config) {
    if (config.dryRun !== true) {
      throw new Error('Trading bot adapter는 dry-run=false 실행을 거부합니다.')
    }
  },
  async run({ task }) {
    return createDryRunResult(
      task.state,
      `Trading bot dry-run을 완료했습니다. ${task.config.exchange ?? 'exchange 없음'} ${
        task.config.symbol ?? 'symbol 없음'
      }`,
    )
  },
}

function createDryRunResult(state: TaskState, message: string) {
  return {
    state: {
      ...state,
      status: 'idle' as const,
      lastRunAt: new Date().toISOString(),
      lastError: undefined,
      lastMessage: message,
    },
    message,
  }
}
