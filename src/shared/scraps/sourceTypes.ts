export type ScrapSourceType =
  | 'url'
  | 'file'
  | 'memo'
  | 'text'
  | 'browser_selection'
  | 'clipboard'
  | 'external'

export type ScrapSourceBase = {
  id: string
  sourceType: ScrapSourceType
  label?: string
  capturedAt: string
  metadata?: Record<string, unknown>
}

export type ScrapUrlSource = ScrapSourceBase & {
  sourceType: 'url'
  url: string
  normalizedUrl?: string
  referrerUrl?: string
}

export type ScrapFileSource = ScrapSourceBase & {
  sourceType: 'file'
  path: string
  fileName?: string
  mimeType?: string
  sizeBytes?: number
}

export type ScrapMemoSource = ScrapSourceBase & {
  sourceType: 'memo'
  content: string
}

export type ScrapTextSource = ScrapSourceBase & {
  sourceType: 'text'
  content: string
  sourceName?: string
}

export type ScrapBrowserSelectionSource = ScrapSourceBase & {
  sourceType: 'browser_selection'
  url?: string
  selectedText: string
  pageTitle?: string
}

export type ScrapClipboardSource = ScrapSourceBase & {
  sourceType: 'clipboard'
  content: string
  contentType?: string
}

export type ScrapExternalSource = ScrapSourceBase & {
  sourceType: 'external'
  provider: string
  externalId?: string
  payload: unknown
}

export type ScrapSource =
  | ScrapUrlSource
  | ScrapFileSource
  | ScrapMemoSource
  | ScrapTextSource
  | ScrapBrowserSelectionSource
  | ScrapClipboardSource
  | ScrapExternalSource

export type CreateScrapSourceInput =
  | Omit<ScrapUrlSource, 'id' | 'capturedAt'>
  | Omit<ScrapFileSource, 'id' | 'capturedAt'>
  | Omit<ScrapMemoSource, 'id' | 'capturedAt'>
  | Omit<ScrapTextSource, 'id' | 'capturedAt'>
  | Omit<ScrapBrowserSelectionSource, 'id' | 'capturedAt'>
  | Omit<ScrapClipboardSource, 'id' | 'capturedAt'>
  | Omit<ScrapExternalSource, 'id' | 'capturedAt'>
