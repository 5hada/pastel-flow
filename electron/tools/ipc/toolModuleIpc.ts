import {
  BrowserWindow,
  dialog,
  type IpcMain,
  type OpenDialogOptions,
} from 'electron'
import type { ToolModuleRunner } from '../runner/toolModuleRunner'
import type { ToolModuleStore } from '../store/toolModuleStore'
import type { TaskStore } from '../../tasks/store/taskStore'

export function registerToolModuleIpc(
  ipcMain: IpcMain,
  toolModuleStore: ToolModuleStore,
  toolModuleRunner: ToolModuleRunner,
  taskStore: TaskStore,
): void {
  ipcMain.handle('tools:list', () => toolModuleStore.listTools())
  ipcMain.handle('tools:register-folder', async (event) => {
    const browserWindow = BrowserWindow.fromWebContents(event.sender)
    const options: OpenDialogOptions = {
      properties: ['openDirectory'],
    }
    const result = browserWindow
      ? await dialog.showOpenDialog(browserWindow, options)
      : await dialog.showOpenDialog(options)

    if (result.canceled || !result.filePaths[0]) {
      return undefined
    }

    return toolModuleStore.registerToolFromPath(result.filePaths[0])
  })
  ipcMain.handle('tools:run', (_event, toolId, input) =>
    toolModuleRunner.runTool(
      toolId,
      input && typeof input === 'object'
        ? (input as Record<string, unknown>)
        : {},
    ),
  )
  ipcMain.handle('tools:create-action', async (_event, toolId) => {
    const tool = await toolModuleStore.getTool(toolId)
    return taskStore.createAction({
      name: tool.manifest.name,
      type: 'tool_action',
      config: {
        toolId: tool.id,
        version: tool.manifest.version,
      },
      inputSchema: tool.manifest.inputs.map((field) => ({
        id: field.key,
        name: field.key,
        type: field.type === 'json' ? 'json' : 'string',
        required: field.required,
        description: field.description,
      })),
      outputSchema: tool.manifest.outputs.map((field) => ({
        id: field.key,
        name: field.key,
        type: field.type === 'json' ? 'json' : 'string',
        required: field.required,
        description: field.description,
      })),
    })
  })
}
