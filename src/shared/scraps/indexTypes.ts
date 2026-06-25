import type { ScrapDocumentChunk } from './documentTypes'

export type ScrapClassificationSource = 'rule' | 'heuristic' | 'ai' | 'user'

export type ScrapSuggestion = {
  name: string
  confidence: number
  source: ScrapClassificationSource
  reason?: string
}

export type ScrapCollectionSuggestion = {
  collectionId: string
  confidence: number
  source: ScrapClassificationSource
  reason?: string
}

export type ScrapEntity = {
  name: string
  type: string
  confidence?: number
}

export type ScrapClassification = {
  topics: ScrapSuggestion[]
  tags: ScrapSuggestion[]
  entities: ScrapEntity[]
  suggestedCollections: ScrapCollectionSuggestion[]
  classifiedAt?: string
}

export type ScrapIndexStatus =
  | 'pending'
  | 'indexing'
  | 'ready'
  | 'failed'
  | 'stale'

export type ScrapIndex = {
  scrapId: string
  status: ScrapIndexStatus
  summary?: string
  keywords: string[]
  classification: ScrapClassification
  chunks: ScrapDocumentChunk[]
  contentHash?: string
  indexedAt?: string
  error?: string
}

export type ScrapSearchQuery = {
  text?: string
  collectionIds?: string[]
  sourceTypes?: string[]
  tags?: string[]
  topics?: string[]
  status?: string
  limit?: number
}

export type ScrapSearchResult = {
  scrapId: string
  score: number
  title: string
  summary?: string
  matchedChunkIds?: string[]
  highlights?: string[]
}
