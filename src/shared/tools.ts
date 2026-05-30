export type ToolModuleFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'boolean[]'
  | 'string[]'
  | 'number[]'
  | 'json'
  | 'file'
  | 'file[]'
  | 'image'
  | 'image[]'
  | 'color'
  | 'color[]'
  | 'url'
  | 'url[]'
  | 'record[]'

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
  fields?: ToolModuleField[]
  schema?: unknown
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
    | 'files'
    | 'image'
    | 'images'
    | 'url'
    | 'table'
  label?: string
  placeholder?: string
  helpText?: string
  options?: ToolModuleFieldOption[]
  min?: number
  max?: number
  step?: number
  rows?: number
  accept?: string
  multiple?: boolean
  fields?: ToolModuleField[]
}

export type ToolModuleOutputUi = {
  view?:
    | 'text'
    | 'code'
    | 'list'
    | 'table'
    | 'image'
    | 'gallery'
    | 'color'
    | 'palette'
    | 'link'
    | 'links'
    | 'file'
    | 'files'
    | 'download'
  label?: string
  helpText?: string
  emptyText?: string
  columns?: string[]
  thumbnail?: boolean
  maxItems?: number
  actions?: string[]
}

export type ToolModuleFieldOption = {
  label: string
  value: string | number | boolean
  color?: string
}

export type ToolModuleManifest = {
  schemaVersion: '1.0' | '1.1'
  id: string
  name: string
  version: string
  description?: string
  assets: ToolModuleAsset[]
  dataSources: ToolModuleDataSource[]
  datasets: ToolModuleDataset[]
  inputs: ToolModuleField[]
  outputs: ToolModuleOutputField[]
  indexing?: ToolModuleIndexing
  permissions: ToolModulePermission[]
}

export type ToolModuleOutputField = ToolModuleField & {
  ui?: ToolModuleOutputUi
}

export type ToolModuleAsset = {
  key: string
  path: string
  type: 'file' | 'image' | 'json' | 'text'
  description?: string
}

export type ToolModuleDataSource = {
  key: string
  type: 'file' | 'folder' | 'sqlite' | 'json' | 'csv' | 'http' | 'custom'
  required?: boolean
  description?: string
  permissions?: ToolModulePermission[]
  schema?: unknown
}

export type ToolModuleDataset = {
  key: string
  source: string
  recordType: ToolModuleFieldType
  schema?: ToolModuleField[]
  index?: boolean
  description?: string
}

export type ToolModuleIndexing = {
  enabled: boolean
  fields?: string[]
  datasets?: string[]
}

export type RegisteredToolModule = {
  id: string
  manifest: ToolModuleManifest
  sourcePath: string
  watchedRootPath?: string
  relativePath?: string
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
