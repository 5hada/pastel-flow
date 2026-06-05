import type { IpcMain } from 'electron'
import { ipcRequestChannels } from '../../../shared/ipcChannels'
import type {
  CreateUrlGroupInput,
  UpdateUrlGroupInput,
} from '../../../shared/urlGroups'
import type { UrlGroupStore } from '../store/urlGroupStore'

export function registerUrlGroupIpc(
  ipcMain: IpcMain,
  urlGroupStore: UrlGroupStore,
): void {
  ipcMain.handle(ipcRequestChannels.urlGroups.list, () =>
    urlGroupStore.listUrlGroups(),
  )
  ipcMain.handle(ipcRequestChannels.urlGroups.create, (_event, input) =>
    urlGroupStore.createUrlGroup(assertCreateUrlGroupInput(input)),
  )
  ipcMain.handle(ipcRequestChannels.urlGroups.update, (_event, id, input) =>
    urlGroupStore.updateUrlGroup(
      assertString(id, 'URL group ID'),
      assertUpdateUrlGroupInput(input),
    ),
  )
  ipcMain.handle(ipcRequestChannels.urlGroups.delete, (_event, id) =>
    urlGroupStore.deleteUrlGroup(assertString(id, 'URL group ID')),
  )
}

function assertRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label}은 객체여야 합니다.`)
  }

  return value as Record<string, unknown>
}

function assertCreateUrlGroupInput(value: unknown): CreateUrlGroupInput {
  const input = assertRecord(value, 'URL group 생성 입력')
  if (typeof input.name !== 'string' || !input.name.trim()) {
    throw new Error('URL group 이름이 필요합니다.')
  }

  return input as CreateUrlGroupInput
}

function assertUpdateUrlGroupInput(value: unknown): UpdateUrlGroupInput {
  return assertRecord(value, 'URL group 수정 입력') as UpdateUrlGroupInput
}

function assertString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label}가 필요합니다.`)
  }

  return value.trim()
}
