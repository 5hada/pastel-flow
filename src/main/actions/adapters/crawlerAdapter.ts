import { mkdir, writeFile } from 'node:fs/promises'
import { isIP } from 'node:net'
import path from 'node:path'
import type { CrawlerConfig } from '../../../shared/actions'
import type { WorkflowState } from '../../../shared/workflows'
import type { ActionAdapter } from './actionAdapter'

export const crawlerAdapter: ActionAdapter<CrawlerConfig, WorkflowState> = {
  type: 'crawler_action',
  validateAConfig(config) {
    const normalizedConfig = normalizeCrawlerConfig(config)

    if (normalizedConfig.urls.length === 0) {
      throw new Error('Crawler tasks require at least one URL.')
    }
  },
  async run({ dataDir, action }) {
    const config = normalizeCrawlerConfig(action.config)
    const invalidUrl = config.urls.find((url) => !isCrawlableUrl(url))

    if (invalidUrl) {
      throw new Error(`Crawler URL 형식이 올바르지 않습니다: ${invalidUrl}`)
    }

    const outputDirectory = path.join(dataDir, 'crawler-results')
    const outputPath = path.join(
      outputDirectory,
      `${action.id}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
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
          actionId: action.id,
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
  const abortController = new AbortController()
  const timeoutId = setTimeout(() => {
    abortController.abort()
  }, 15_000)

  try {
    const response = await fetch(url, {
      signal: abortController.signal,
    })
    const text = await readResponsePreview(response, maxBytes)

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
  } finally {
    clearTimeout(timeoutId)
  }
}

async function readResponsePreview(
  response: Response,
  maxBytes: number,
): Promise<string> {
  if (!response.body) {
    return ''
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let receivedBytes = 0

  while (receivedBytes < maxBytes) {
    const { done, value } = await reader.read()
    if (done || !value) {
      break
    }

    const remainingBytes = maxBytes - receivedBytes
    const chunk =
      value.byteLength > remainingBytes
        ? value.slice(0, remainingBytes)
        : value
    chunks.push(chunk)
    receivedBytes += chunk.byteLength

    if (value.byteLength > remainingBytes) {
      await reader.cancel()
      break
    }
  }

  const bytes = new Uint8Array(receivedBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  return new TextDecoder().decode(bytes)
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

function isCrawlableUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      !isPrivateHostname(url.hostname)
    )
  } catch {
    return false
  }
}

function isPrivateHostname(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase()

  if (
    normalizedHostname === 'localhost' ||
    normalizedHostname.endsWith('.localhost') ||
    normalizedHostname.endsWith('.local')
  ) {
    return true
  }

  const ipVersion = isIP(normalizedHostname)
  if (ipVersion === 4) {
    const [first = 0, second = 0] = normalizedHostname
      .split('.')
      .map((part) => Number(part))

    return (
      first === 10 ||
      first === 127 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168)
    )
  }

  if (ipVersion === 6) {
    return (
      normalizedHostname === '::1' ||
      normalizedHostname.startsWith('fc') ||
      normalizedHostname.startsWith('fd') ||
      normalizedHostname.startsWith('fe80')
    )
  }

  return false
}
