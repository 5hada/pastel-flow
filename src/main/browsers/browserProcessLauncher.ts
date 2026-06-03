import { type ChildProcess, spawn } from 'node:child_process'
import { normalizeTemplateUrls } from './browserUrlFilters'

export async function launchBrowserProcess(
  executablePath: string,
  args: string[],
): Promise<ChildProcess> {
  const browserProcess = spawn(executablePath, args, {
    detached: true,
    stdio: 'ignore',
  })

  await new Promise<void>((resolve, reject) => {
    browserProcess.once('error', reject)
    browserProcess.once('spawn', resolve)
  })

  browserProcess.unref()
  return browserProcess
}

export async function openDefaultBrowserUrls(urls: string[]): Promise<void> {
  const targetUrls = normalizeTemplateUrls(urls)

  if (targetUrls.length === 0) {
    throw new Error('기본 브라우저 연결 실행에는 하나 이상의 URL이 필요합니다.')
  }

  await Promise.all(targetUrls.map(openDefaultBrowserUrl))
}

async function openDefaultBrowserUrl(url: string): Promise<void> {
  const command =
    process.platform === 'win32'
      ? 'cmd'
      : process.platform === 'darwin'
        ? 'open'
        : 'xdg-open'
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url]
  const browserProcess = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  })

  await new Promise<void>((resolve, reject) => {
    browserProcess.once('error', reject)
    browserProcess.once('spawn', resolve)
  })

  browserProcess.unref()
}
