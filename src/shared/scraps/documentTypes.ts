export type ScrapDocumentContentType =
  | 'text'
  | 'markdown'
  | 'html'
  | 'json'
  | 'binary_ref'

export type ScrapDocumentStatus =
  | 'pending'
  | 'extracting'
  | 'ready'
  | 'failed'
  | 'stale'

export type ScrapDocument = {
  id: string
  scrapId: string
  sourceId: string
  version: number
  contentType: ScrapDocumentContentType
  status: ScrapDocumentStatus
  title?: string
  content?: string
  contentPath?: string
  checksum?: string
  sizeBytes?: number
  language?: string
  extractedAt?: string
  error?: string
  metadata?: Record<string, unknown>
}

export type ScrapDocumentChunk = {
  id: string
  scrapId: string
  documentId: string
  index: number
  text: string
  tokenCount?: number
  startOffset?: number
  endOffset?: number
  metadata?: Record<string, unknown>
}
