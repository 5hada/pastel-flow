import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type {
  DiscordBotConfig,
  NotionSyncConfig,
  ActionDefinition,
  ActionType,
  TradingBotConfig,
} from '../../../shared/actions'
import type { WorkflowState } from '../../../shared/workflows'
import type { ActionAdapter } from './actionAdapter'

export const discordBotAdapter: ActionAdapter<DiscordBotConfig, WorkflowState> = {
  type: 'discord_dry_run_action',
  validateAConfig(config) {
    if (config.dryRun !== true) {
      throw new Error('Discord bot adapter는 현재 dry-run 실행만 지원합니다.')
    }
  },
  async run({ dataDir, action }) {
    return createDryRunResult(
      dataDir,
      action,
      `Discord bot dry-run을 완료했습니다. prefix=${action.config.commandPrefix ?? '없음'}`,
      'Discord API 연결과 메시지 전송은 실행하지 않았습니다.',
    )
  },
}

export const notionSyncAdapter: ActionAdapter<NotionSyncConfig, WorkflowState> = {
  type: 'notion_dry_run_action',
  validateAConfig(config) {
    if (config.dryRun !== true) {
      throw new Error('Notion sync adapter는 현재 dry-run 실행만 지원합니다.')
    }
  },
  async run({ dataDir, action }) {
    return createDryRunResult(
      dataDir,
      action,
      `Notion sync dry-run을 완료했습니다. database=${action.config.databaseId ?? '없음'}`,
      'Notion API 연결과 페이지/DB 변경은 실행하지 않았습니다.',
    )
  },
}

export const tradingBotAdapter: ActionAdapter<TradingBotConfig, WorkflowState> = {
  type: 'trading_dry_run_action',
  validateAConfig(config) {
    if (config.dryRun !== true) {
      throw new Error(
        'Trading bot adapter는 뼈대만 제공하며 실제 자동매매 실행을 지원하지 않습니다.',
      )
    }
  },
  async run({ dataDir, action }) {
    return createDryRunResult(
      dataDir,
      action,
      `Trading bot skeleton dry-run을 완료했습니다. 실제 주문은 실행하지 않았습니다. ${
        action.config.exchange ?? 'exchange 없음'
      } ${
        action.config.symbol ?? 'symbol 없음'
      }`,
      '자동매매, 실거래 주문, 거래소 API 주문 실행은 구현 범위에서 제외되어 있습니다.',
    )
  },
}

async function createDryRunResult(
  dataDir: string,
  action: ActionDefinition,
  message: string,
  skippedAction: string,
) {
  const outputPath = await writeDryRunArtifact(dataDir, action, message, skippedAction)

  return {
    state: {
      status: 'idle' as const,
      lastRunAt: new Date().toISOString(),
      lastError: undefined,
      lastMessage: message,
      outputPath,
    },
    message,
  }
}

async function writeDryRunArtifact(
  dataDir: string,
  action: ActionDefinition,
  message: string,
  skippedAction: string,
): Promise<string> {
  const outputDirectory = path.join(dataDir, 'dry-run-results')
  const outputPath = path.join(
    outputDirectory,
    `${action.type}-${action.id}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  )

  await mkdir(outputDirectory, { recursive: true })
  await writeFile(
    outputPath,
    `${JSON.stringify(
      {
        actionId: action.id,
        actionName: action.name,
        actionType: action.type satisfies ActionType,
        capturedAt: new Date().toISOString(),
        dryRun: true,
        skippedAction,
        message,
        config: action.config,
        secretRefCount: action.secretRefs?.length ?? 0,
        secretRefIds:
          action.secretRefs?.map((secretRef) => secretRef.id) ?? [],
      },
      null,
      2,
    )}\n`,
    'utf8',
  )

  return outputPath
}
