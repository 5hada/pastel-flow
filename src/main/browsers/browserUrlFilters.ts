export function isTemplateUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function normalizeTemplateUrls(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(isTemplateUrl))]
}
