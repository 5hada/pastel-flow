import type { IpcMain } from 'electron'
import { ipcRequestChannels } from '../../../shared/ipcChannels'
import type { SecretStore } from '../store/secretStore'

export function registerSecretIpc(
  ipcMain: IpcMain,
  secretStore: SecretStore,
): void {
  ipcMain.handle(ipcRequestChannels.secrets.status, () =>
    secretStore.getStorageStatus(),
  )
  ipcMain.handle(ipcRequestChannels.secrets.list, () => secretStore.listSecrets())
  ipcMain.handle(ipcRequestChannels.secrets.create, (_event, input) =>
    secretStore.createSecret(assertSecretInput(input)),
  )
  ipcMain.handle(ipcRequestChannels.secrets.delete, async (_event, id) => {
    await secretStore.deleteSecret(assertString(id, 'Secret ID'))
  })
}

function assertSecretInput(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Secret 입력은 객체여야 합니다.')
  }

  const candidate = input as Record<string, unknown>
  if (typeof candidate.name !== 'string' || typeof candidate.value !== 'string') {
    throw new Error('Secret 이름과 값이 필요합니다.')
  }

  return {
    name: candidate.name,
    value: candidate.value,
    description:
      typeof candidate.description === 'string'
        ? candidate.description
        : undefined,
  }
}

function assertString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label}가 필요합니다.`)
  }

  return value
}
