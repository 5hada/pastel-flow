import type { IpcMain } from 'electron'
import type { CreateLocalSecretInput } from '../../../src/shared/secrets'
import type { SecretStore } from '../store/secretStore'

export function registerSecretIpc(
  ipcMain: IpcMain,
  secretStore: SecretStore,
): void {
  ipcMain.handle('secrets:list', () => secretStore.listSecrets())
  ipcMain.handle('secrets:create', (_event, input: CreateLocalSecretInput) =>
    secretStore.createSecret(input),
  )
  ipcMain.handle('secrets:delete', (_event, id: string) =>
    secretStore.deleteSecret(id),
  )
}
