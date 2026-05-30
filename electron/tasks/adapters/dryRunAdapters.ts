import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type {
  DiscordBotConfig,
  NotionSyncConfig,
  TaskTemplate,
  TaskState,
  TaskType,
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
  async run({ dataDir, task }) {
    return createDryRunResult(
      dataDir,
      task,
      task.state,
      `Discord bot dry-run을 완료했습니다. prefix=${task.config.commandPrefix ?? '없음'}`,
      'Discord API 연결과 메시지 전송은 실행하지 않았습니다.',
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
  async run({ dataDir, task }) {
    return createDryRunResult(
      dataDir,
      task,
      task.state,
      `Notion sync dry-run을 완료했습니다. database=${task.config.databaseId ?? '없음'}`,
      'Notion API 연결과 페이지/DB 변경은 실행하지 않았습니다.',
    )
  },
}

export const tradingBotAdapter: TaskAdapter<TradingBotConfig, TaskState> = {
  type: 'trading_bot',
  validateConfig(config) {
    if (config.dryRun !== true) {
      throw new Error(
        'Trading bot adapter는 뼈대만 제공하며 실제 자동매매 실행을 지원하지 않습니다.',
      )
    }
  },
  async run({ dataDir, task }) {
    return createDryRunResult(
      dataDir,
      task,
      task.state,
      `Trading bot skeleton dry-run을 완료했습니다. 실제 주문은 실행하지 않았습니다. ${
        task.config.exchange ?? 'exchange 없음'
      } ${
        task.config.symbol ?? 'symbol 없음'
      }`,
      '자동매매, 실거래 주문, 거래소 API 주문 실행은 구현 범위에서 제외되어 있습니다.',
    )
  },
}

async function createDryRunResult(
  dataDir: string,
  task: TaskTemplate,
  state: TaskState,
  message: string,
  skippedAction: string,
) {
  const outputPath = await writeDryRunArtifact(dataDir, task, message, skippedAction)

  return {
    state: {
      ...state,
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
  task: TaskTemplate,
  message: string,
  skippedAction: string,
): Promise<string> {
  const outputDirectory = path.join(dataDir, 'dry-run-results')
  const outputPath = path.join(
    outputDirectory,
    `${task.type}-${task.id}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  )

  await mkdir(outputDirectory, { recursive: true })
  await writeFile(
    outputPath,
    `${JSON.stringify(
      {
        taskId: task.id,
        taskName: task.name,
        taskType: task.type satisfies TaskType,
        capturedAt: new Date().toISOString(),
        dryRun: true,
        skippedAction,
        message,
        config: task.config,
        secretRefCount: task.permissions.secretRefs?.length ?? 0,
        secretRefIds:
          task.permissions.secretRefs?.map((secretRef) => secretRef.id) ?? [],
      },
      null,
      2,
    )}\n`,
    'utf8',
  )

  return outputPath
}
