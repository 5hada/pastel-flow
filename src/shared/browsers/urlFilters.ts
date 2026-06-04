export function isBrowserNavigationUrl(value: string): boolean {
  return normalizeBrowserNavigationUrl(value) !== null
}

export function normalizeBrowserNavigationUrl(value: string): string | null {
  try {
    const trimmedValue = value.trim()
    const url = new URL(
      /^[a-z][a-z\d+\-.]*:/i.test(trimmedValue)
        ? trimmedValue
        : `https://${trimmedValue}`,
    )

    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : null
  } catch {
    return null
  }
}

export function normalizeBrowserNavigationUrls(values: string[]): string[] {
  return [
    ...new Set(
      values
        .map(normalizeBrowserNavigationUrl)
        .filter((value): value is string => value !== null),
    ),
  ]
}
