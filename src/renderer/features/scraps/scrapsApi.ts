import type {
  CreateScrapInput,
  ScrapItem,
  ScrapSearchQuery,
  ScrapSearchResult,
  ScrapStatus,
  UpdateScrapInput,
} from '../../../shared/scraps'

export type ScrapsApi = {
  list(input?: ListScrapsInput): Promise<ScrapItem[]>
  search(query: ScrapSearchQuery): Promise<ScrapSearchResult[]>
  create(input: CreateScrapInput): Promise<ScrapItem>
  update(id: string, input: UpdateScrapInput): Promise<ScrapItem>
  delete(id: string): Promise<void>
}

export type ListScrapsInput = {
  status?: ScrapStatus
  collectionId?: string
}
