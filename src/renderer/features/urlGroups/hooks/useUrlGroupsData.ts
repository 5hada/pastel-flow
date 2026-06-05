import { useState } from 'react'
import type {
  CreateUrlGroupInput,
  UpdateUrlGroupInput,
  UrlGroup,
} from '../../../../shared/urlGroups'
import { normalizeUrlGroupItems } from '../../../../shared/urlGroups'
import type { UrlGroupsApi } from '../urlGroupsApi'
import { getErrorMessage } from '../../../shared/utils/viewLabels'

const localUrlGroupsStorageKey = 'pastel-flow:url-groups'

export function useUrlGroupsData(
  setErrorMessage: (message: string | null) => void,
) {
  const [urlGroups, setUrlGroups] = useState<UrlGroup[]>([])
  const [selectedUrlGroupId, setSelectedUrlGroupId] = useState<string | null>(
    null,
  )

  async function loadUrlGroups() {
    const urlGroupsApi = getUrlGroupsApi()
    if (!urlGroupsApi) {
      const localUrlGroups = readLocalUrlGroups()
      setUrlGroups(localUrlGroups)
      setSelectedUrlGroupId((currentId) =>
        localUrlGroups.some((urlGroup) => urlGroup.id === currentId)
          ? currentId
          : null,
      )
      return
    }

    try {
      const loadedUrlGroups = await urlGroupsApi.list()
      setUrlGroups(loadedUrlGroups)
      setSelectedUrlGroupId((currentId) =>
        loadedUrlGroups.some((urlGroup) => urlGroup.id === currentId)
          ? currentId
          : null,
      )
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function createUrlGroup(input: CreateUrlGroupInput) {
    const urlGroupsApi = getUrlGroupsApi()
    if (!urlGroupsApi) {
      const urlGroup = createLocalUrlGroup(input)
      setUrlGroups((currentUrlGroups) =>
        writeLocalUrlGroups([urlGroup, ...currentUrlGroups]),
      )
      setSelectedUrlGroupId(urlGroup.id)
      return
    }

    try {
      const urlGroup = await urlGroupsApi.create(input)
      setUrlGroups((currentUrlGroups) => [urlGroup, ...currentUrlGroups])
      setSelectedUrlGroupId(urlGroup.id)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function updateUrlGroup(id: string, input: UpdateUrlGroupInput) {
    const urlGroupsApi = getUrlGroupsApi()
    if (!urlGroupsApi) {
      setUrlGroups((currentUrlGroups) =>
        writeLocalUrlGroups(
          currentUrlGroups.map((urlGroup) =>
            urlGroup.id === id ? updateLocalUrlGroup(urlGroup, input) : urlGroup,
          ),
        ),
      )
      return
    }

    try {
      const urlGroup = await urlGroupsApi.update(id, input)
      setUrlGroups((currentUrlGroups) =>
        currentUrlGroups.map((currentUrlGroup) =>
          currentUrlGroup.id === id ? urlGroup : currentUrlGroup,
        ),
      )
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function deleteUrlGroup(id: string) {
    const urlGroupsApi = getUrlGroupsApi()
    if (!urlGroupsApi) {
      setUrlGroups((currentUrlGroups) =>
        writeLocalUrlGroups(
          currentUrlGroups.filter((urlGroup) => urlGroup.id !== id),
        ),
      )
      setSelectedUrlGroupId((currentId) => (currentId === id ? null : currentId))
      return
    }

    try {
      await urlGroupsApi.delete(id)
      setUrlGroups((currentUrlGroups) =>
        currentUrlGroups.filter((urlGroup) => urlGroup.id !== id),
      )
      setSelectedUrlGroupId((currentId) => (currentId === id ? null : currentId))
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  return {
    urlGroups,
    selectedUrlGroupId,
    createUrlGroup,
    deleteUrlGroup,
    loadUrlGroups,
    setSelectedUrlGroupId,
    updateUrlGroup,
  }
}

function createLocalUrlGroup(input: CreateUrlGroupInput): UrlGroup {
  const now = new Date().toISOString()

  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    description: normalizeOptionalString(input.description),
    tags: normalizeTags(input.tags),
    items: normalizeUrlGroupItems(input.items),
    createdAt: now,
    updatedAt: now,
  }
}

function updateLocalUrlGroup(
  urlGroup: UrlGroup,
  input: UpdateUrlGroupInput,
): UrlGroup {
  return {
    ...urlGroup,
    name: input.name === undefined ? urlGroup.name : input.name.trim(),
    description:
      input.description === undefined
        ? urlGroup.description
        : normalizeOptionalString(input.description),
    tags: input.tags === undefined ? urlGroup.tags : normalizeTags(input.tags),
    items:
      input.items === undefined
        ? urlGroup.items
        : normalizeUrlGroupItems(input.items),
    updatedAt: new Date().toISOString(),
  }
}

function readLocalUrlGroups(): UrlGroup[] {
  try {
    const rawValue = window.localStorage.getItem(localUrlGroupsStorageKey)
    if (!rawValue) {
      return []
    }

    const parsedValue = JSON.parse(rawValue)
    if (!Array.isArray(parsedValue)) {
      return []
    }

    return parsedValue.flatMap((value): UrlGroup[] => {
      if (!value || typeof value !== 'object') {
        return []
      }

      const candidate = value as Partial<UrlGroup>
      if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') {
        return []
      }

      return [
        {
          id: candidate.id,
          name: candidate.name,
          description: normalizeOptionalString(candidate.description),
          tags: normalizeTags(candidate.tags),
          items: normalizeUrlGroupItems(candidate.items),
          createdAt:
            typeof candidate.createdAt === 'string'
              ? candidate.createdAt
              : new Date().toISOString(),
          updatedAt:
            typeof candidate.updatedAt === 'string'
              ? candidate.updatedAt
              : new Date().toISOString(),
        },
      ]
    })
  } catch {
    return []
  }
}

function writeLocalUrlGroups(urlGroups: UrlGroup[]): UrlGroup[] {
  window.localStorage.setItem(
    localUrlGroupsStorageKey,
    JSON.stringify(urlGroups),
  )

  return urlGroups
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function normalizeTags(value: unknown): string[] {
  return Array.isArray(value)
    ? [
        ...new Set(
          value
            .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
            .filter(Boolean),
        ),
      ]
    : []
}

function getUrlGroupsApi(): UrlGroupsApi | null {
  const urlGroupsApi = window.pastelFlow?.urlGroups
  if (
    !urlGroupsApi ||
    typeof urlGroupsApi.list !== 'function' ||
    typeof urlGroupsApi.create !== 'function' ||
    typeof urlGroupsApi.update !== 'function' ||
    typeof urlGroupsApi.delete !== 'function'
  ) {
    return null
  }

  return urlGroupsApi
}
