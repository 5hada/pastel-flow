import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { CrawlerConfig, TaskState } from '../../../src/shared/tasks'
import type { TaskAdapter } from './taskAdapter'

export const crawlerAdapter: TaskAdapter<CrawlerConfig, TaskState> = {
  type: 'crawler',
  validateConfig(config) {
    const normalizedConfig = normalizeCrawlerConfig(config)

    if (normalizedConfig.urls.length === 0) {
      throw new Error('Crawler tasks require at least one URL.')
    }
  },
  async run({ dataDir, task }) {
    const config = normalizeCrawlerConfig(task.config)
    const invalidUrl = config.urls.find((url) => !isHttpUrl(url))

    if (invalidUrl) {
      throw new Error(`Crawler URL 형식이 올바르지 않습니다: ${invalidUrl}`)
    }

    const outputDirectory = path.join(dataDir, 'crawler-results')
    const outputPath = path.join(
      outputDirectory,
      `${task.id}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
    )
    const results = await Promise.all(
      config.urls.map((url) => fetchCrawlerUrl(url, config.maxBytes)),
    )
    const capturedCount = results.filter(
      (result) => result.status === 'captured',
    ).length
    const failedCount = results.length - capturedCount
    const message =
      failedCount > 0
        ? `${capturedCount}개 URL 수집 성공, ${failedCount}개 실패했습니다.`
        : `${capturedCount}개 URL을 수집했습니다.`

    await mkdir(outputDirectory, { recursive: true })
    await writeFile(
      outputPath,
      `${JSON.stringify(
        {
          taskId: task.id,
          capturedAt: new Date().toISOString(),
          capturedCount,
          failedCount,
          results,
        },
        null,
        2,
      )}\n`,
      'utf8',
    )

    return {
      state: {
        ...task.state,
        status: failedCount > 0 ? 'failed' : 'idle',
        lastRunAt: new Date().toISOString(),
        lastError:
          failedCount > 0 ? '일부 URL 수집에 실패했습니다.' : undefined,
        lastMessage: message,
        outputPath,
      },
      message,
    }
  },
}

type CrawlerResult = {
  url: string
  status: 'captured' | 'failed'
  statusCode?: number
  title?: string
  bodyPreview?: string
  error?: string
}

function normalizeCrawlerConfig(config: Partial<CrawlerConfig>): CrawlerConfig {
  return {
    urls: Array.isArray(config.urls)
      ? config.urls
          .map((url) => (typeof url === 'string' ? url.trim() : ''))
          .filter(Boolean)
      : [],
    maxBytes:
      typeof config.maxBytes === 'number' && Number.isFinite(config.maxBytes)
        ? Math.min(Math.max(Math.round(config.maxBytes), 1024), 500_000)
        : 50_000,
  }
}

async function fetchCrawlerUrl(
  url: string,
  maxBytes: number,
): Promise<CrawlerResult> {
  try {
    const response = await fetch(url)
    const text = (await response.text()).slice(0, maxBytes)

    return {
      url,
      status: response.ok ? 'captured' : 'failed',
      statusCode: response.status,
      title: getTitle(text),
      bodyPreview: stripHtml(text).slice(0, 1000),
      error: response.ok ? undefined : response.statusText,
    }
  } catch (error) {
    return {
      url,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown crawler error',
    }
  }
}

function getTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  return match?.[1]?.trim() || undefined
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
