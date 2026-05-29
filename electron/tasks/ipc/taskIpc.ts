import type { IpcMain } from 'electron'
import type { TaskStore } from '../store/taskStore'

export function registerTaskIpc(ipcMain: IpcMain, taskStore: TaskStore): void {
  ipcMain.handle('tasks:list', () => taskStore.listTasks())
  ipcMain.handle('tasks:create', (_event, input) => taskStore.createTask(input))
  ipcMain.handle('tasks:update', (_event, id, input) =>
    taskStore.updateTask(id, input),
  )
  ipcMain.handle('tasks:delete', (_event, id) => taskStore.deleteTask(id))
}
