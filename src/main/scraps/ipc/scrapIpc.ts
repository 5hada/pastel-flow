import type { IpcMain } from 'electron'
import type {
  CreateScrapInput,
  ScrapSearchQuery,
  UpdateScrapInput,
} from '../../../shared/scraps'
import { ipcRequestChannels } from '../../../shared/ipcChannels'
import type { ListScrapsInput, ScrapStore } from '../scrapStore'

export function registerScrapIpc(
  ipcMain: IpcMain,
  scrapStore: ScrapStore,
): void {
  ipcMain.handle(ipcRequestChannels.scraps.list, (_event, input) =>
    scrapStore.listScraps(assertListScrapsInput(input)),
  )
  ipcMain.handle(ipcRequestChannels.scraps.search, (_event, query) =>
    scrapStore.searchScraps(assertSearchScrapsInput(query)),
  )
  ipcMain.handle(ipcRequestChannels.scraps.create, (_event, input) =>
    scrapStore.createScrap(assertCreateScrapInput(input)),
  )
  ipcMain.handle(ipcRequestChannels.scraps.update, (_event, id, input) =>
    scrapStore.updateScrap(
      assertString(id, 'Scrap ID'),
      assertUpdateScrapInput(input),
    ),
  )
  ipcMain.handle(ipcRequestChannels.scraps.delete, (_event, id) =>
    scrapStore.deleteScrap(assertString(id, 'Scrap ID')),
  )
}

function assertListScrapsInput(value: unknown): ListScrapsInput {
  if (!isRecord(value)) {
    return {}
  }

  return {
    status: typeof value.status === 'string' ? value.status : undefined,
    collectionId:
      typeof value.collectionId === 'string' ? value.collectionId : undefined,
  } as ListScrapsInput
}

function assertSearchScrapsInput(value: unknown): ScrapSearchQuery {
  return isRecord(value) ? (value as ScrapSearchQuery) : {}
}

function assertCreateScrapInput(value: unknown): CreateScrapInput {
  const input = assertRecord(value, 'Scrap create input')
  if (!isRecord(input.source)) {
    throw new Error('Scrap source is required.')
  }

  return input as CreateScrapInput
}

function assertUpdateScrapInput(value: unknown): UpdateScrapInput {
  return assertRecord(value, 'Scrap update input') as UpdateScrapInput
}

function assertRecord(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`)
  }

  return value
}

function assertString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} is required.`)
  }

  return value.trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
