import { useState } from 'react'
import type {
  CreateScrapInput,
  ScrapItem,
  ScrapSearchQuery,
  ScrapSearchResult,
  UpdateScrapInput,
} from '../../../../shared/scraps'
import { getErrorMessage } from '../../../shared/utils/viewLabels'
import type { ListScrapsInput, ScrapsApi } from '../scrapsApi'

export function useScrapsData(
  setErrorMessage: (message: string | null) => void,
) {
  const [scraps, setScraps] = useState<ScrapItem[]>([])
  const [selectedScrapId, setSelectedScrapId] = useState<string | null>(null)
  const [scrapSearchResults, setScrapSearchResults] = useState<
    ScrapSearchResult[]
  >([])

  async function loadScraps(input?: ListScrapsInput) {
    const scrapsApi = getScrapsApi()
    if (!scrapsApi) {
      setScraps([])
      setSelectedScrapId(null)
      setScrapSearchResults([])
      return
    }

    try {
      const loadedScraps = await scrapsApi.list(input)
      setScraps(loadedScraps)
      setSelectedScrapId((currentId) =>
        loadedScraps.some((scrap) => scrap.id === currentId) ? currentId : null,
      )
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function searchScraps(query: ScrapSearchQuery) {
    const scrapsApi = getScrapsApi()
    if (!scrapsApi) {
      setScrapSearchResults([])
      return
    }

    try {
      setScrapSearchResults(await scrapsApi.search(query))
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function createScrap(input: CreateScrapInput) {
    const scrapsApi = getScrapsApi()
    if (!scrapsApi) {
      return
    }

    try {
      const scrap = await scrapsApi.create(input)
      setScraps((currentScraps) => [scrap, ...currentScraps])
      setSelectedScrapId(scrap.id)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function updateScrap(id: string, input: UpdateScrapInput) {
    const scrapsApi = getScrapsApi()
    if (!scrapsApi) {
      return
    }

    try {
      const scrap = await scrapsApi.update(id, input)
      setScraps((currentScraps) =>
        currentScraps.map((currentScrap) =>
          currentScrap.id === id ? scrap : currentScrap,
        ),
      )
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function deleteScrap(id: string) {
    const scrapsApi = getScrapsApi()
    if (!scrapsApi) {
      return
    }

    try {
      await scrapsApi.delete(id)
      setScraps((currentScraps) =>
        currentScraps.filter((scrap) => scrap.id !== id),
      )
      setSelectedScrapId((currentId) => (currentId === id ? null : currentId))
      setScrapSearchResults((currentResults) =>
        currentResults.filter((result) => result.scrapId !== id),
      )
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  return {
    scrapSearchResults,
    scraps,
    selectedScrapId,
    createScrap,
    deleteScrap,
    loadScraps,
    searchScraps,
    setSelectedScrapId,
    updateScrap,
  }
}

function getScrapsApi(): ScrapsApi | null {
  const scrapsApi = window.pastelFlow?.scraps
  if (
    !scrapsApi ||
    typeof scrapsApi.list !== 'function' ||
    typeof scrapsApi.search !== 'function' ||
    typeof scrapsApi.create !== 'function' ||
    typeof scrapsApi.update !== 'function' ||
    typeof scrapsApi.delete !== 'function'
  ) {
    return null
  }

  return scrapsApi
}
