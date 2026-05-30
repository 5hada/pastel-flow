import { randomUUID } from 'node:crypto'
import { cp, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  type ToolModuleAsset,
  type ToolModuleDataSource,
  type ToolModuleDataset,
  type RegisteredToolModule,
  type ToolModuleField,
  type ToolModuleFieldOption,
  type ToolModuleFieldType,
  type ToolModuleIndexing,
  type ToolModuleManifest,
  type ToolModuleOutputField,
  type ToolModulePermission,
  type ToolModuleValidationResult,
} from '../../../src/shared/tools'

export type ToolModuleStore = {
  listTools(): Promise<RegisteredToolModule[]>
  getTool(id: string): Promise<RegisteredToolModule>
  registerToolFromPath(sourcePath: string): Promise<RegisteredToolModule>
  registerToolRootFromPath(rootPath: string): Promise<RegisteredToolModule[]>
  validateToolPath(sourcePath: string): Promise<ToolModuleValidationResult>
}

export type ToolModuleStoreOptions = {
  dataDir: string
}

type ToolModulesFile = {
  tools: RegisteredToolModule[]
  watchedRoots: string[]
}

const supportedFieldTypes: ToolModuleFieldType[] = [
  'string',
  'number',
  'boolean',
  'boolean[]',
  'string[]',
  'number[]',
  'json',
  'file',
  'file[]',
  'image',
  'image[]',
  'color',
  'color[]',
  'url',
  'url[]',
  'record[]',
]

const supportedPermissions: ToolModulePermission[] = [
  'clipboard',
  'file.read',
  'file.write',
  'network',
]

export function createToolModuleStore({
  dataDir,
}: ToolModuleStoreOptions): ToolModuleStore {
  const toolsFilePath = path.join(dataDir, 'toolModules.json')
  const toolModulesDir = path.join(dataDir, 'tool-modules')

  async function readToolModulesFile(): Promise<ToolModulesFile> {
    try {
      const raw = await readFile(toolsFilePath, 'utf8')
      const parsed = JSON.parse(raw) as Partial<ToolModulesFile>

      return {
        tools: Array.isArray(parsed.tools)
          ? parsed.tools.map(normalizeRegisteredTool)
          : [],
        watchedRoots: Array.isArray(parsed.watchedRoots)
          ? parsed.watchedRoots.filter((root) => typeof root === 'string')
          : [],
      }
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return { tools: [], watchedRoots: [] }
      }

      throw error
    }
  }

  async function writeToolModulesFile(
    toolModulesFile: ToolModulesFile,
  ): Promise<void> {
    await mkdir(dataDir, { recursive: true })
    await writeFile(
      toolsFilePath,
      `${JSON.stringify(toolModulesFile, null, 2)}\n`,
      'utf8',
    )
  }

  async function validateToolPath(
    sourcePath: string,
  ): Promise<ToolModuleValidationResult> {
    const errors: string[] = []
    const manifestPath = path.join(sourcePath, 'manifest.json')
    const logicPath = path.join(sourcePath, 'logic.mjs')
    if (!(await pathExists(logicPath))) {
      errors.push('logic.mjs 파일이 필요합니다.')
    }

    let manifest: ToolModuleManifest | undefined
    try {
      const rawManifest = await readFile(manifestPath, 'utf8')
      manifest = normalizeManifest(JSON.parse(rawManifest), errors)
    } catch (error) {
      errors.push(
        error instanceof SyntaxError
          ? 'manifest.json 형식이 올바르지 않습니다.'
          : 'manifest.json 파일이 필요합니다.',
      )
    }

    return {
      ok: errors.length === 0,
      manifest,
      errors,
    }
  }

  return {
    async listTools() {
      await refreshWatchedRoots()
      return (await readToolModulesFile()).tools.sort((left, right) =>
        left.manifest.name.localeCompare(right.manifest.name),
      )
    },

    async getTool(id) {
      const tool = (await readToolModulesFile()).tools.find(
        (currentTool) => currentTool.id === id,
      )

      if (!tool) {
        throw new Error(`Tool module not found: ${id}`)
      }

      return tool
    },

    async registerToolFromPath(sourcePath) {
      const validation = await validateToolPath(sourcePath)

      if (!validation.ok || !validation.manifest) {
        throw new Error(validation.errors.join('\n'))
      }

      const now = new Date().toISOString()
      const toolId = validation.manifest.id
      const destinationPath = path.join(
        toolModulesDir,
        `${toolId}-${validation.manifest.version}-${randomUUID()}`,
      )
      await mkdir(toolModulesDir, { recursive: true })
      await cp(sourcePath, destinationPath, {
        recursive: true,
        force: true,
      })

      const toolModulesFile = await readToolModulesFile()
      const existingTool = toolModulesFile.tools.find(
        (tool) => tool.id === toolId,
      )
      const registeredTool: RegisteredToolModule = {
        id: toolId,
        manifest: validation.manifest,
        sourcePath: destinationPath,
        relativePath: path.basename(sourcePath),
        registeredAt: existingTool?.registeredAt ?? now,
        updatedAt: now,
        hasCustomView: await pathExists(path.join(destinationPath, 'view.html')),
        hasCustomStyle: await pathExists(path.join(destinationPath, 'style.css')),
      }

      await writeToolModulesFile({
        watchedRoots: toolModulesFile.watchedRoots,
        tools: [
          ...toolModulesFile.tools.filter((tool) => tool.id !== toolId),
          registeredTool,
        ],
      })

      return registeredTool
    },

    async registerToolRootFromPath(rootPath) {
      const watchedRootPath = path.resolve(rootPath)
      const modulePaths = await findToolModulePaths(watchedRootPath)

      if (modulePaths.length === 0) {
        throw new Error('등록 가능한 Tool Module을 찾지 못했습니다.')
      }

      const toolModulesFile = await readToolModulesFile()
      const registeredTools = await createRegisteredToolsFromRoot(
        watchedRootPath,
        modulePaths,
        toolModulesFile.tools,
      )
      const registeredToolIds = new Set(registeredTools.map((tool) => tool.id))

      await writeToolModulesFile({
        watchedRoots: [
          ...new Set([...toolModulesFile.watchedRoots, watchedRootPath]),
        ],
        tools: [
          ...toolModulesFile.tools.filter(
            (tool) =>
              tool.watchedRootPath !== watchedRootPath &&
              !registeredToolIds.has(tool.id),
          ),
          ...registeredTools,
        ],
      })

      return registeredTools
    },

    validateToolPath,
  }

  async function refreshWatchedRoots(): Promise<void> {
    const toolModulesFile = await readToolModulesFile()
    if (toolModulesFile.watchedRoots.length === 0) {
      return
    }

    const watchedRootSet = new Set(toolModulesFile.watchedRoots)
    const retainedTools = toolModulesFile.tools.filter(
      (tool) => !tool.watchedRootPath || !watchedRootSet.has(tool.watchedRootPath),
    )
    const refreshedTools: RegisteredToolModule[] = []
    const existingTools = toolModulesFile.tools

    for (const watchedRootPath of watchedRootSet) {
      if (!(await pathExists(watchedRootPath))) {
        continue
      }

      const modulePaths = await findToolModulePaths(watchedRootPath)
      refreshedTools.push(
        ...(await createRegisteredToolsFromRoot(
          watchedRootPath,
          modulePaths,
          existingTools,
        )),
      )
    }

    const refreshedToolIds = new Set(refreshedTools.map((tool) => tool.id))
    await writeToolModulesFile({
      watchedRoots: [...watchedRootSet],
      tools: [
        ...retainedTools.filter((tool) => !refreshedToolIds.has(tool.id)),
        ...refreshedTools,
      ],
    })
  }

  async function createRegisteredToolsFromRoot(
    watchedRootPath: string,
    modulePaths: string[],
    existingTools: RegisteredToolModule[],
  ): Promise<RegisteredToolModule[]> {
    const now = new Date().toISOString()
    const registeredTools: RegisteredToolModule[] = []

    for (const modulePath of modulePaths) {
      const validation = await validateToolPath(modulePath)
      if (!validation.ok || !validation.manifest) {
        continue
      }

      const existingTool = existingTools.find(
        (tool) => tool.id === validation.manifest?.id,
      )
      registeredTools.push({
        id: validation.manifest.id,
        manifest: validation.manifest,
        sourcePath: modulePath,
        watchedRootPath,
        relativePath: path.relative(watchedRootPath, modulePath) || '.',
        registeredAt: existingTool?.registeredAt ?? now,
        updatedAt: now,
        hasCustomView: await pathExists(path.join(modulePath, 'view.html')),
        hasCustomStyle: await pathExists(path.join(modulePath, 'style.css')),
      })
    }

    return registeredTools
  }
}

function normalizeRegisteredTool(tool: RegisteredToolModule): RegisteredToolModule {
  return {
    ...tool,
    manifest: normalizeStoredManifest(tool.manifest),
    watchedRootPath:
      typeof tool.watchedRootPath === 'string' ? tool.watchedRootPath : undefined,
    hasCustomView: tool.hasCustomView === true,
    hasCustomStyle: tool.hasCustomStyle === true,
  }
}

function normalizeStoredManifest(
  manifest: ToolModuleManifest,
): ToolModuleManifest {
  return {
    ...manifest,
    schemaVersion:
      manifest.schemaVersion === '1.1' || manifest.schemaVersion === '1.0'
        ? manifest.schemaVersion
        : '1.0',
    assets: Array.isArray(manifest.assets) ? manifest.assets : [],
    dataSources: Array.isArray(manifest.dataSources)
      ? manifest.dataSources
      : [],
    datasets: Array.isArray(manifest.datasets) ? manifest.datasets : [],
    inputs: Array.isArray(manifest.inputs) ? manifest.inputs : [],
    outputs: Array.isArray(manifest.outputs) ? manifest.outputs : [],
    permissions: Array.isArray(manifest.permissions)
      ? manifest.permissions
      : [],
  }
}

function normalizeManifest(
  value: unknown,
  errors: string[],
): ToolModuleManifest | undefined {
  if (!value || typeof value !== 'object') {
    errors.push('manifest.json은 객체여야 합니다.')
    return undefined
  }

  const candidate = value as Partial<ToolModuleManifest>
  if (candidate.schemaVersion !== '1.0' && candidate.schemaVersion !== '1.1') {
    errors.push('schemaVersion은 "1.0" 또는 "1.1"이어야 합니다.')
  }

  if (!isToolId(candidate.id)) {
    errors.push('id는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.')
  }

  if (!isNonEmptyString(candidate.name)) {
    errors.push('name이 필요합니다.')
  }

  if (!isNonEmptyString(candidate.version)) {
    errors.push('version이 필요합니다.')
  }

  const inputs = normalizeFields(candidate.inputs, 'inputs', errors)
  const outputs = normalizeOutputFields(candidate.outputs, errors)
  const assets = normalizeAssets(candidate.assets, errors)
  const dataSources = normalizeDataSources(candidate.dataSources, errors)
  const datasets = normalizeDatasets(candidate.datasets, errors)
  const indexing = normalizeIndexing(candidate.indexing)
  const permissions = normalizePermissions(candidate.permissions, errors)

  if (errors.length > 0) {
    return undefined
  }

  return {
    schemaVersion: candidate.schemaVersion ?? '1.1',
    id: candidate.id ?? '',
    name: candidate.name ?? '',
    version: candidate.version ?? '',
    description:
      typeof candidate.description === 'string'
        ? candidate.description
        : undefined,
    assets,
    dataSources,
    datasets,
    inputs,
    outputs,
    indexing,
    permissions,
  }
}

function normalizeOutputFields(
  value: unknown,
  errors: string[],
): ToolModuleOutputField[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.reduce<ToolModuleOutputField[]>((fields, field) => {
    const normalizedField = normalizeFields([field], 'outputs', errors)[0]
    if (!normalizedField) {
      return fields
    }
    const candidate = field as Partial<ToolModuleOutputField>
    return [
      ...fields,
      {
      ...normalizedField,
      ui: normalizeOutputUi(candidate.ui),
      },
    ]
  }, [])
}

function normalizeFields(
  value: unknown,
  fieldName: string,
  errors: string[],
): ToolModuleField[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.reduce<ToolModuleField[]>((fields, field, index) => {
    if (!field || typeof field !== 'object') {
      errors.push(`${fieldName}[${index}] 형식이 올바르지 않습니다.`)
      return fields
    }

    const candidate = field as Partial<ToolModuleField>
    if (!isNonEmptyString(candidate.key)) {
      errors.push(`${fieldName}[${index}].key가 필요합니다.`)
      return fields
    }

    if (!isFieldType(candidate.type)) {
      errors.push(`${fieldName}[${index}].type이 지원되지 않습니다.`)
      return fields
    }

    return [
      ...fields,
      {
        key: candidate.key,
        type: candidate.type,
        required: candidate.required === true,
        default: candidate.default,
        description:
          typeof candidate.description === 'string'
            ? candidate.description
            : undefined,
        ui: normalizeFieldUi(candidate.ui),
        fields: Array.isArray(candidate.fields)
          ? normalizeFields(candidate.fields, `${fieldName}[${index}].fields`, errors)
          : undefined,
        schema: candidate.schema,
      },
    ]
  }, [])
}

function normalizeFieldUi(value: unknown): ToolModuleField['ui'] {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const candidate = value as NonNullable<ToolModuleField['ui']>
  return {
    control: isFieldControl(candidate.control) ? candidate.control : undefined,
    label:
      typeof candidate.label === 'string' && candidate.label.trim()
        ? candidate.label
        : undefined,
    placeholder:
      typeof candidate.placeholder === 'string' && candidate.placeholder.trim()
        ? candidate.placeholder
        : undefined,
    helpText:
      typeof candidate.helpText === 'string' && candidate.helpText.trim()
        ? candidate.helpText
        : undefined,
    options: normalizeFieldOptions(candidate.options),
    min: normalizeOptionalNumber(candidate.min),
    max: normalizeOptionalNumber(candidate.max),
    step: normalizeOptionalNumber(candidate.step),
    rows: normalizeOptionalNumber(candidate.rows),
    accept:
      typeof candidate.accept === 'string' && candidate.accept.trim()
        ? candidate.accept
        : undefined,
    multiple: candidate.multiple === true,
    fields: Array.isArray(candidate.fields)
      ? normalizeFields(candidate.fields, 'ui.fields', [])
      : undefined,
  }
}

function normalizeOutputUi(value: unknown): ToolModuleOutputField['ui'] {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const candidate = value as NonNullable<ToolModuleOutputField['ui']>
  return {
    view: isOutputView(candidate.view) ? candidate.view : undefined,
    label: typeof candidate.label === 'string' ? candidate.label : undefined,
    helpText:
      typeof candidate.helpText === 'string' ? candidate.helpText : undefined,
    emptyText:
      typeof candidate.emptyText === 'string' ? candidate.emptyText : undefined,
    columns: Array.isArray(candidate.columns)
      ? candidate.columns.filter((column) => typeof column === 'string')
      : undefined,
    thumbnail: candidate.thumbnail === true,
    maxItems: normalizeOptionalNumber(candidate.maxItems),
    actions: Array.isArray(candidate.actions)
      ? candidate.actions.filter((action) => typeof action === 'string')
      : undefined,
  }
}

function normalizeAssets(value: unknown, errors: string[]): ToolModuleAsset[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.reduce<ToolModuleAsset[]>((assets, asset, index) => {
    if (!asset || typeof asset !== 'object') {
      errors.push(`assets[${index}] 형식이 올바르지 않습니다.`)
      return assets
    }

    const candidate = asset as Partial<ToolModuleAsset>
    if (!isNonEmptyString(candidate.key) || !isNonEmptyString(candidate.path)) {
      errors.push(`assets[${index}]에는 key와 path가 필요합니다.`)
      return assets
    }

    if (!isAssetType(candidate.type)) {
      errors.push(`assets[${index}].type이 지원되지 않습니다.`)
      return assets
    }

    return [
      ...assets,
      {
        key: candidate.key,
        path: candidate.path,
        type: candidate.type,
        description: candidate.description,
      },
    ]
  }, [])
}

function normalizeDataSources(
  value: unknown,
  errors: string[],
): ToolModuleDataSource[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.reduce<ToolModuleDataSource[]>((result, dataSource, index) => {
    if (!dataSource || typeof dataSource !== 'object') {
      errors.push(`dataSources[${index}] 형식이 올바르지 않습니다.`)
      return result
    }

    const candidate = dataSource as Partial<ToolModuleDataSource>
    if (!isNonEmptyString(candidate.key) || !isDataSourceType(candidate.type)) {
      errors.push(`dataSources[${index}]에는 key와 지원 type이 필요합니다.`)
      return result
    }

    return [
      ...result,
      {
        key: candidate.key,
        type: candidate.type,
        required: candidate.required === true,
        description: candidate.description,
        permissions: normalizePermissions(candidate.permissions, errors),
        schema: candidate.schema,
      },
    ]
  }, [])
}

function normalizeDatasets(
  value: unknown,
  errors: string[],
): ToolModuleDataset[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.reduce<ToolModuleDataset[]>((result, dataset, index) => {
    if (!dataset || typeof dataset !== 'object') {
      errors.push(`datasets[${index}] 형식이 올바르지 않습니다.`)
      return result
    }

    const candidate = dataset as Partial<ToolModuleDataset>
    if (
      !isNonEmptyString(candidate.key) ||
      !isNonEmptyString(candidate.source) ||
      !isFieldType(candidate.recordType)
    ) {
      errors.push(`datasets[${index}]에는 key, source, recordType이 필요합니다.`)
      return result
    }

    return [
      ...result,
      {
        key: candidate.key,
        source: candidate.source,
        recordType: candidate.recordType,
        schema: Array.isArray(candidate.schema)
          ? normalizeFields(candidate.schema, `datasets[${index}].schema`, errors)
          : undefined,
        index: candidate.index === true,
        description: candidate.description,
      },
    ]
  }, [])
}

function normalizeIndexing(value: unknown): ToolModuleIndexing | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const candidate = value as Partial<ToolModuleIndexing>
  return {
    enabled: candidate.enabled === true,
    fields: Array.isArray(candidate.fields)
      ? candidate.fields.filter((field) => typeof field === 'string')
      : undefined,
    datasets: Array.isArray(candidate.datasets)
      ? candidate.datasets.filter((dataset) => typeof dataset === 'string')
      : undefined,
  }
}

function normalizeFieldOptions(value: unknown): ToolModuleFieldOption[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const options = value.reduce<ToolModuleFieldOption[]>((result, option) => {
    if (!option || typeof option !== 'object') {
      return result
    }

    const candidate = option as Partial<ToolModuleFieldOption>
    if (
      typeof candidate.label !== 'string' ||
      !isOptionValue(candidate.value)
    ) {
      return result
    }

    return [
      ...result,
      {
        label: candidate.label,
        value: candidate.value,
        color:
          typeof candidate.color === 'string' && candidate.color.trim()
            ? candidate.color
            : undefined,
      },
    ]
  }, [])

  return options.length > 0 ? options : undefined
}

function normalizePermissions(
  value: unknown,
  errors: string[],
): ToolModulePermission[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.reduce<ToolModulePermission[]>((permissions, permission) => {
    if (!isPermission(permission)) {
      errors.push(`지원하지 않는 permission입니다: ${String(permission)}`)
      return permissions
    }

    return permissions.includes(permission)
      ? permissions
      : [...permissions, permission]
  }, [])
}

async function pathExists(value: string): Promise<boolean> {
  try {
    await stat(value)
    return true
  } catch {
    return false
  }
}

function isToolId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9-]+$/.test(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isFieldType(value: unknown): value is ToolModuleFieldType {
  return supportedFieldTypes.includes(value as ToolModuleFieldType)
}

function isFieldControl(
  value: unknown,
): value is NonNullable<ToolModuleField['ui']>['control'] {
  return (
    value === 'text' ||
    value === 'textarea' ||
    value === 'number' ||
    value === 'toggle' ||
    value === 'checkbox' ||
    value === 'select' ||
    value === 'radio' ||
    value === 'color' ||
    value === 'json' ||
    value === 'list' ||
    value === 'file' ||
    value === 'files' ||
    value === 'image' ||
    value === 'images' ||
    value === 'url' ||
    value === 'table'
  )
}

function isOutputView(
  value: unknown,
): value is NonNullable<ToolModuleOutputField['ui']>['view'] {
  return (
    value === 'text' ||
    value === 'code' ||
    value === 'list' ||
    value === 'table' ||
    value === 'image' ||
    value === 'gallery' ||
    value === 'color' ||
    value === 'palette' ||
    value === 'link' ||
    value === 'links' ||
    value === 'file' ||
    value === 'files' ||
    value === 'download'
  )
}

function isAssetType(value: unknown): value is ToolModuleAsset['type'] {
  return (
    value === 'file' ||
    value === 'image' ||
    value === 'json' ||
    value === 'text'
  )
}

function isDataSourceType(value: unknown): value is ToolModuleDataSource['type'] {
  return (
    value === 'file' ||
    value === 'folder' ||
    value === 'sqlite' ||
    value === 'json' ||
    value === 'csv' ||
    value === 'http' ||
    value === 'custom'
  )
}

function isOptionValue(value: unknown): value is ToolModuleFieldOption['value'] {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function isPermission(value: unknown): value is ToolModulePermission {
  return supportedPermissions.includes(value as ToolModulePermission)
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}

async function findToolModulePaths(rootPath: string): Promise<string[]> {
  const results: string[] = []

  async function walk(currentPath: string): Promise<void> {
    if (path.basename(currentPath) === 'node_modules') {
      return
    }

    if (
      (await pathExists(path.join(currentPath, 'manifest.json'))) &&
      (await pathExists(path.join(currentPath, 'logic.mjs')))
    ) {
      results.push(currentPath)
      return
    }

    const entries = await readdir(currentPath, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await walk(path.join(currentPath, entry.name))
      }
    }
  }

  await walk(rootPath)
  return results
}
