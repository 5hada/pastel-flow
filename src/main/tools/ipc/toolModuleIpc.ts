import {
  BrowserWindow,
  dialog,
  type IpcMain,
  type OpenDialogOptions,
} from 'electron'
import { ipcRequestChannels } from '../../../shared/ipcChannels'
import type { ActionIOField } from '../../../shared/actions'
import type { ToolModuleField } from '../../../shared/tools'
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
      assertString(toolId, 'Tool ID'),
      input && typeof input === 'object'
        ? (input as Record<string, unknown>)
        : {},
    ),
  )
  ipcMain.handle(ipcRequestChannels.tools.createAction, async (_event, toolId) => {
    const tool = await toolModuleStore.getTool(assertString(toolId, 'Tool ID'))
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
        type: mapToolFieldTypeToActionIoType(field),
        required: field.required,
        description: field.description,
      })),
      outputSchema: tool.manifest.outputs.map((field) => ({
        id: field.key,
        name: field.key,
        type: mapToolFieldTypeToActionIoType(field),
        required: field.required,
        description: field.description,
      })),
    })
  })
}

function mapToolFieldTypeToActionIoType(
  field: ToolModuleField,
): ActionIOField['type'] {
  switch (field.type) {
    case 'record[]':
      return 'json'
    case 'color':
    case 'color[]':
      return 'string'
    case 'string':
    case 'number':
    case 'boolean':
    case 'boolean[]':
    case 'string[]':
    case 'number[]':
    case 'json':
    case 'file':
    case 'file[]':
    case 'image':
    case 'image[]':
    case 'url':
    case 'url[]':
      return field.type
  }
}

function assertString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label}가 필요합니다.`)
  }

  return value
}
