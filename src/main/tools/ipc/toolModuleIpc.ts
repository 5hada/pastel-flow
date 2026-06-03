import {
  BrowserWindow,
  dialog,
  type IpcMain,
  type OpenDialogOptions,
} from 'electron'
import { ipcRequestChannels } from '../../../shared/ipcChannels'
import type { ToolModuleRunner } from '../runner/toolModuleRunner'
import type { ToolModuleStore } from '../store/toolModuleStore'
import type { WorkflowStore } from '../../workflows/store/workflowStore'

export function registerToolModuleIpc(
  ipcMain: IpcMain,
  toolModuleStore: ToolModuleStore,
  toolModuleRunner: ToolModuleRunner,
  workflowStore: WorkflowStore,
): void {
  ipcMain.handle(ipcRequestChannels.tools.list, () => toolModuleStore.listTools())
  ipcMain.handle(ipcRequestChannels.tools.registerFolder, async (event) => {
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

    return toolModuleStore.registerToolRootFromPath(result.filePaths[0])
  })
  ipcMain.handle(ipcRequestChannels.tools.run, (_event, toolId, input) =>
    toolModuleRunner.runTool(
      toolId,
      input && typeof input === 'object'
        ? (input as Record<string, unknown>)
        : {},
    ),
  )
  ipcMain.handle(ipcRequestChannels.tools.createAction, async (_event, toolId) => {
    const tool = await toolModuleStore.getTool(toolId)
    return workflowStore.createAction({
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
