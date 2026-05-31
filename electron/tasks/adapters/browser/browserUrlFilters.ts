export function isTemplateUrl(value: string): boolean {
  return (
    Boolean(value) &&
    !value.startsWith('devtools://') &&
    !value.startsWith('chrome://') &&
    !value.startsWith('edge://') &&
    value !== 'about:blank'
  )
}

export function normalizeTemplateUrls(values: string[]): string[] {
  return [...new Set(values.filter(isTemplateUrl))]
}
