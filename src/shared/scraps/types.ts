import type { ScrapCollection } from './collectionTypes'
import type { ScrapDocument } from './documentTypes'
import type { ScrapIndex } from './indexTypes'
import type { CreateScrapSourceInput, ScrapSource } from './sourceTypes'

export type ScrapStatus =
  | 'inbox'
  | 'processing'
  | 'classified'
  | 'archived'
  | 'dismissed'

export type ScrapItem = {
  id: string
  title: string
  source: ScrapSource
  status: ScrapStatus
  collectionIds: string[]
  tags: string[]
  summary?: string
  document?: ScrapDocument
  index?: ScrapIndex
  createdAt: string
  updatedAt: string
}

export type CreateScrapInput = {
  title?: string
  source: CreateScrapSourceInput
  status?: ScrapStatus
  collectionIds?: ScrapCollection['id'][]
  tags?: string[]
}

export type UpdateScrapInput = Partial<
  Pick<ScrapItem, 'title' | 'status' | 'collectionIds' | 'tags' | 'summary'>
>
