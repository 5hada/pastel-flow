import { mkdir, writeFile } from 'node:fs/promises'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import path from 'node:path'
import type { CrawlerConfig } from '../../../shared/actions'
import type { WorkflowState } from '../../../shared/workflows'
import type { ActionAdapter } from './actionAdapter'

export const crawlerAdapter: ActionAdapter<CrawlerConfig, WorkflowState> = {
  type: 'crawler_action',
  validateConfig(config) {
    const normalizedConfig = normalizeCrawlerConfig(config)

    if (normalizedConfig.urls.length === 0) {
      throw new Error('Crawler tasks require at least one URL.')
    }
  },
  async run({ dataDir, action }) {
    const config = normalizeCrawlerConfig(action.config)
    await Promise.all(config.urls.map(assertCrawlableUrl))

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
    const response = await fetchCrawlerResponse(url, abortController.signal)
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

async function fetchCrawlerResponse(
  initialUrl: string,
  signal: AbortSignal,
): Promise<Response> {
  let currentUrl = initialUrl

  for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
    await assertCrawlableUrl(currentUrl)
    const response = await fetch(currentUrl, {
      redirect: 'manual',
      signal,
    })

    if (!isRedirectStatus(response.status)) {
      return response
    }

    const location = response.headers.get('location')
    if (!location) {
      return response
    }

    currentUrl = new URL(location, currentUrl).toString()
  }

  throw new Error('Crawler redirect 횟수가 너무 많습니다.')
}

async function assertCrawlableUrl(value: string): Promise<void> {
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('http/https URL만 허용됩니다.')
    }

    if (isPrivateHostname(url.hostname)) {
      throw new Error('private URL은 허용되지 않습니다.')
    }

    const addresses = await lookup(url.hostname, { all: true, verbatim: true })
    if (addresses.some((address) => isPrivateHostname(address.address))) {
      throw new Error('private network로 해석되는 URL은 허용되지 않습니다.')
    }
  } catch {
    throw new Error(`Crawler URL 형식이 올바르지 않습니다: ${value}`)
  }
}

function isRedirectStatus(status: number): boolean {
  return status >= 300 && status < 400
}

function isPrivateHostname(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase().replace(/^\[|\]$/g, '')

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
