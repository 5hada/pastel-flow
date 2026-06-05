import type {
  CreateUrlGroupInput,
  UpdateUrlGroupInput,
  UrlGroup,
} from '../../../shared/urlGroups'

export type UrlGroupsApi = {
  list(): Promise<UrlGroup[]>
  create(input: CreateUrlGroupInput): Promise<UrlGroup>
  update(id: string, input: UpdateUrlGroupInput): Promise<UrlGroup>
  delete(id: string): Promise<void>
}
