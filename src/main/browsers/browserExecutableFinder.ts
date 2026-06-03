import { constants } from 'node:fs'
import { access } from 'node:fs/promises'
import path from 'node:path'
import type {
    BrowserKind,
    BrowserExecutablePaths
} from '../../../src/shared/browsers'

export type BrowserExecutable = {
  displayName: string
  path: string
}

export async function findBrowserExecutable(
  browserKind: BrowserKind,
  executablePaths: BrowserExecutablePaths = {},
): Promise<BrowserExecutable> {
  const displayName = getBrowserDisplayName(browserKind)
  const configuredPath = executablePaths[browserKind]?.trim()

  if (configuredPath) {
    if (await pathExists(configuredPath)) {
      return {
        displayName,
        path: configuredPath,
      }
    }

    throw new Error(
      `${displayName} 실행 파일 경로가 올바르지 않습니다: ${configuredPath}`,
    )
  }

  const candidates = dedupe([
    ...getKnownBrowserPaths(browserKind),
    ...getPathBrowserCandidates(browserKind),
  ])

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return {
        displayName,
        path: candidate,
      }
    }
  }

  throw new Error(
    `${displayName} 실행 파일을 찾지 못했습니다. 브라우저가 설치되어 있는지 확인하거나 작업의 브라우저 종류를 변경해 주세요.`,
  )
}

function getBrowserDisplayName(browserKind: BrowserKind): string {
  switch (browserKind) {
    case 'chrome':
      return 'Chrome'
    case 'edge':
      return 'Edge'
    case 'chromium':
      return 'Chromium'
  }
}

function getKnownBrowserPaths(browserKind: BrowserKind): string[] {
  if (process.platform === 'win32') {
    return getWindowsBrowserPaths(browserKind)
  }

  if (process.platform === 'darwin') {
    return getMacBrowserPaths(browserKind)
  }

  return getLinuxBrowserPaths(browserKind)
}

function getWindowsBrowserPaths(browserKind: BrowserKind): string[] {
  const localAppData = process.env['LOCALAPPDATA']
  const programFiles = process.env['ProgramFiles']
  const programFilesX86 = process.env['ProgramFiles(x86)']

  switch (browserKind) {
    case 'chrome':
      return joinExistingRoots(
        [localAppData, programFiles, programFilesX86],
        'Google\\Chrome\\Application\\chrome.exe',
      )
    case 'edge':
      return joinExistingRoots(
        [programFilesX86, programFiles, localAppData],
        'Microsoft\\Edge\\Application\\msedge.exe',
      )
    case 'chromium':
      return joinExistingRoots(
        [localAppData, programFiles, programFilesX86],
        'Chromium\\Application\\chrome.exe',
      )
  }
}

function getMacBrowserPaths(browserKind: BrowserKind): string[] {
  switch (browserKind) {
    case 'chrome':
      return [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        path.join(
          process.env['HOME'] ?? '',
          'Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        ),
      ]
    case 'edge':
      return [
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        path.join(
          process.env['HOME'] ?? '',
          'Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        ),
      ]
    case 'chromium':
      return [
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        path.join(
          process.env['HOME'] ?? '',
          'Applications/Chromium.app/Contents/MacOS/Chromium',
        ),
      ]
  }
}

function getLinuxBrowserPaths(browserKind: BrowserKind): string[] {
  switch (browserKind) {
    case 'chrome':
      return [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/snap/bin/chromium',
      ]
    case 'edge':
      return [
        '/usr/bin/microsoft-edge',
        '/usr/bin/microsoft-edge-stable',
      ]
    case 'chromium':
      return [
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/snap/bin/chromium',
      ]
  }
}

function getPathBrowserCandidates(browserKind: BrowserKind): string[] {
  const pathDirectories = (process.env['PATH'] ?? '')
    .split(path.delimiter)
    .filter(Boolean)
  const executableNames = getBrowserExecutableNames(browserKind)

  return pathDirectories.flatMap((directory) =>
    executableNames.map((executableName) => path.join(directory, executableName)),
  )
}

function getBrowserExecutableNames(browserKind: BrowserKind): string[] {
  const extensionSuffixes =
    process.platform === 'win32'
      ? (process.env['PATHEXT'] ?? '.EXE')
          .split(';')
          .filter(Boolean)
          .map((extension) => extension.toLowerCase())
      : ['']

  const baseNames = (() => {
    switch (browserKind) {
      case 'chrome':
        return ['chrome', 'google-chrome', 'google-chrome-stable']
      case 'edge':
        return ['msedge', 'microsoft-edge', 'microsoft-edge-stable']
      case 'chromium':
        return ['chromium', 'chromium-browser', 'chrome']
    }
  })()

  return baseNames.flatMap((baseName) =>
    extensionSuffixes.map((extension) =>
      baseName.toLowerCase().endsWith(extension) ? baseName : `${baseName}${extension}`,
    ),
  )
}

function joinExistingRoots(roots: Array<string | undefined>, leaf: string): string[] {
  return roots
    .filter((root): root is string => Boolean(root))
    .map((root) => path.join(root, leaf))
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

async function pathExists(value: string): Promise<boolean> {
  try {
    await access(value, constants.F_OK)
    return true
  } catch {
    return false
  }
}
