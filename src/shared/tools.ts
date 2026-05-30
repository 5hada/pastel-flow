export type ToolModuleFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'string[]'
  | 'number[]'
  | 'json'
  | 'file'

export type ToolModulePermission =
  | 'clipboard'
  | 'file.read'
  | 'file.write'
  | 'network'

export type ToolModuleField = {
  key: string
  type: ToolModuleFieldType
  required?: boolean
  default?: unknown
  description?: string
  ui?: ToolModuleFieldUi
}

export type ToolModuleFieldUi = {
  control?:
    | 'text'
    | 'textarea'
    | 'number'
    | 'toggle'
    | 'checkbox'
    | 'select'
    | 'radio'
    | 'color'
    | 'json'
    | 'list'
    | 'file'
  label?: string
  placeholder?: string
  helpText?: string
  options?: ToolModuleFieldOption[]
  min?: number
  max?: number
  step?: number
  rows?: number
}

export type ToolModuleFieldOption = {
  label: string
  value: string | number | boolean
  color?: string
}

export type ToolModuleManifest = {
  schemaVersion: '1.0'
  id: string
  name: string
  version: string
  description?: string
  inputs: ToolModuleField[]
  outputs: ToolModuleField[]
  permissions: ToolModulePermission[]
}

export type RegisteredToolModule = {
  id: string
  manifest: ToolModuleManifest
  sourcePath: string
  registeredAt: string
  updatedAt: string
  hasCustomView: boolean
  hasCustomStyle: boolean
}

export type ToolModuleValidationResult = {
  ok: boolean
  manifest?: ToolModuleManifest
  errors: string[]
}

export type ToolModuleRunResult = {
  toolId: string
  runAt: string
  output: Record<string, unknown>
}

export type ToolModuleRunInput = {
  toolId: string
  input: Record<string, unknown>
}
