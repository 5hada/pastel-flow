import type{ 
    RegisteredToolModule,
    ToolModuleRunResult
}from '../../../shared/tools'
import type { ActionDefinition } from '../../../shared/actions'

export type ToolsApi = {
  list(): Promise<RegisteredToolModule[]>
  registerFolder(): Promise<RegisteredToolModule[] | undefined>
  run(
    toolId: string,
    input: Record<string, unknown>,
  ): Promise<ToolModuleRunResult>
  createAction(toolId: string): Promise<ActionDefinition>
}