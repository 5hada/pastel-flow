import type { IpcMain } from 'electron'
import type { CreateLocalSecretInput } from '../../../src/shared/secrets'
import type { TaskStore } from '../../tasks/store/taskStore'
import type { SecretStore } from '../store/secretStore'

export function registerSecretIpc(
  ipcMain: IpcMain,
  secretStore: SecretStore,
  taskStore: TaskStore,
): void {
  ipcMain.handle('secrets:list', () => secretStore.listSecrets())
  ipcMain.handle('secrets:create', (_event, input: CreateLocalSecretInput) =>
    secretStore.createSecret(input),
  )
  ipcMain.handle('secrets:delete', async (_event, id: string) => {
    await secretStore.deleteSecret(id)
    await removeSecretRefsFromTasks(taskStore, id)
  })
}

async function removeSecretRefsFromTasks(
  taskStore: TaskStore,
  secretId: string,
): Promise<void> {
  const tasks = await taskStore.listTasks()

  await Promise.all(
    tasks.map(async (task) => {
      const secretRefs = task.permissions.secretRefs?.filter(
        (secretRef) => secretRef.id !== secretId,
      )

      if (secretRefs?.length === task.permissions.secretRefs?.length) {
        return
      }

      await taskStore.updateTask(task.id, {
        permissions: {
          ...task.permissions,
          secretRefs,
        },
      })
    }),
  )
}
