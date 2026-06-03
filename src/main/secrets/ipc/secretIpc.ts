import type { IpcMain } from 'electron'
import { ipcRequestChannels } from '../../../shared/ipcChannels'
import type { CreateLocalSecretInput } from '../../../shared/secrets'
import type { SecretStore } from '../store/secretStore'

export function registerSecretIpc(
  ipcMain: IpcMain,
  secretStore: SecretStore,
): void {
  ipcMain.handle(ipcRequestChannels.secrets.status, () =>
    secretStore.getStorageStatus(),
  )
  ipcMain.handle(ipcRequestChannels.secrets.list, () => secretStore.listSecrets())
  ipcMain.handle(ipcRequestChannels.secrets.create, (_event, input: CreateLocalSecretInput) =>
    secretStore.createSecret(input),
  )
  ipcMain.handle(ipcRequestChannels.secrets.delete, async (_event, id: string) => {
    await secretStore.deleteSecret(id)
  })
}
