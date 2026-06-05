export const browserExtensionVersion = '0.2.2'
export const minimumBrowserExtensionVersion = '0.2.2'

export type BrowserExtensionCompatibilityResult =
  | {
      compatible: true
    }
  | {
      compatible: false
      reason: string
    }

export function checkBrowserExtensionCompatibility(
  version: string,
): BrowserExtensionCompatibilityResult {
  const extensionVersion = parseVersion(version)
  const minimumVersion = parseVersion(minimumBrowserExtensionVersion)

  if (!minimumVersion) {
    return {
      compatible: false,
      reason: `브라우저 확장 최소 지원 버전 형식이 올바르지 않습니다: ${minimumBrowserExtensionVersion}`,
    }
  }

  if (!extensionVersion) {
    return {
      compatible: false,
      reason: `브라우저 확장 버전 형식이 올바르지 않습니다: ${version}`,
    }
  }

  if (compareVersionParts(extensionVersion, minimumVersion) < 0) {
    return {
      compatible: false,
      reason: [
        `브라우저 확장 버전이 낮습니다: ${version}`,
        `필요 버전: ${minimumBrowserExtensionVersion} 이상`,
      ].join('\n'),
    }
  }

  return {
    compatible: true,
  }
}

function parseVersion(version: string): [number, number, number] | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
  if (!match) {
    return undefined
  }

  return [
    Number.parseInt(match[1] ?? '0', 10),
    Number.parseInt(match[2] ?? '0', 10),
    Number.parseInt(match[3] ?? '0', 10),
  ]
}

function compareVersionParts(
  left: [number, number, number],
  right: [number, number, number],
): number {
  for (const [index, leftPart] of left.entries()) {
    const rightPart = right[index] ?? 0
    if (leftPart !== rightPart) {
      return leftPart - rightPart
    }
  }

  return 0
}
