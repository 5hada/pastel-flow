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

    const registeredTools = await toolModuleStore.registerToolRootFromPath(
      result.filePaths[0],
    )
    await syncToolActionsWithManifests(registeredTools, workflowStore)

    return registeredTools
  })
  ipcMain.handle(ipcRequestChannels.tools.run, (_event, toolId, input) =>
    toolModuleRunner.runTool(
      assertString(toolId, 'Tool ID'),
      input && typeof input === 'object'
        ? (input as Record<string, unknown>)
        : {},
    ),
  )
  ipcMain.handle(ipcRequestChannels.tools.createAction, async (_event, toolId, inputDefaults) => {
    const tool = await toolModuleStore.getTool(assertString(toolId, 'Tool ID'))
    return workflowStore.createAction({
      name: tool.manifest.name,
      type: 'tool_action',
      config: {
        toolId: tool.id,
        version: tool.manifest.version,
        inputDefaults: normalizeToolInputDefaults(
          inputDefaults,
          tool.manifest.inputs,
        ),
      },
      inputSchema: createActionInputSchema(tool.manifest.inputs),
      outputSchema: createActionInputSchema(tool.manifest.outputs),
    })
  })
}

async function syncToolActionsWithManifests(
  tools: Awaited<ReturnType<ToolModuleStore['registerToolRootFromPath']>>,
  workflowStore: WorkflowStore,
): Promise<void> {
  const toolById = new Map(tools.map((tool) => [tool.id, tool]))
  const actions = await workflowStore.listActions()

  await Promise.all(
    actions.flatMap((action) => {
      if (action.type !== 'tool_action' || !isRecord(action.config)) {
        return []
      }

      const toolId = typeof action.config.toolId === 'string'
        ? action.config.toolId
        : undefined
      const tool = toolId ? toolById.get(toolId) : undefined
      if (!tool) {
        return []
      }

      return workflowStore.updateAction(action.id, {
        config: {
          ...action.config,
          version: tool.manifest.version,
        },
        inputSchema: createActionInputSchema(tool.manifest.inputs),
        outputSchema: createActionInputSchema(tool.manifest.outputs),
      })
    }),
  )
}

function normalizeToolInputDefaults(
  value: unknown,
  fields: ToolModuleField[],
): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  const input = value as Record<string, unknown>
  const entries = fields.flatMap((field) => {
    const fieldValue = input[field.key]

    if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
      return []
    }

    return [[field.key, fieldValue]]
  })

  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

function createActionInputSchema(fields: ToolModuleField[]): ActionIOField[] {
  return fields.map((field) => ({
    id: field.key,
    name: field.key,
    type: mapToolFieldTypeToActionIoType(field),
    required: field.required,
    description: field.description,
  }))
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
