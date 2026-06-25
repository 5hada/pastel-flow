export type ScrapCollectionPurpose =
  | 'knowledge_base'
  | 'url_group'
  | 'workflow_input'
  | 'research'
  | 'archive'

export type ScrapCollectionItem = {
  id: string
  scrapId: string
  sourceId?: string
  role?: string
  enabled: boolean
  order: number
  addedAt: string
}

export type ScrapCollectionQuery = {
  text?: string
  tags?: string[]
  topics?: string[]
  sourceTypes?: string[]
}

export type ScrapCollection = {
  id: string
  name: string
  purpose: ScrapCollectionPurpose
  description?: string
  tags: string[]
  query?: ScrapCollectionQuery
  items: ScrapCollectionItem[]
  createdAt: string
  updatedAt: string
}

export type CreateScrapCollectionInput = {
  name: string
  purpose?: ScrapCollectionPurpose
  description?: string
  tags?: string[]
  query?: ScrapCollectionQuery
  items?: ScrapCollectionItem[]
}

export type UpdateScrapCollectionInput = Partial<
  Pick<ScrapCollection, 'name' | 'purpose' | 'description' | 'tags' | 'query' | 'items'>
>
