import { randomUUID } from 'node:crypto'
import { cp, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  type RegisteredToolModule,
  type ToolModuleField,
  type ToolModuleFieldOption,
  type ToolModuleFieldType,
  type ToolModuleManifest,
  type ToolModulePermission,
  type ToolModuleValidationResult,
} from '../../../src/shared/tools'

export type ToolModuleStore = {
  listTools(): Promise<RegisteredToolModule[]>
  getTool(id: string): Promise<RegisteredToolModule>
  registerToolFromPath(sourcePath: string): Promise<RegisteredToolModule>
  validateToolPath(sourcePath: string): Promise<ToolModuleValidationResult>
}

export type ToolModuleStoreOptions = {
  dataDir: string
}

type ToolModulesFile = {
  tools: RegisteredToolModule[]
}

const supportedFieldTypes: ToolModuleFieldType[] = [
  'string',
  'number',
  'boolean',
  'string[]',
  'number[]',
  'json',
  'file',
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
        tools: Array.isArray(parsed.tools) ? parsed.tools : [],
      }
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return { tools: [] }
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
    const logicPath = path.join(sourcePath, 'logic.js')

    try {
      await stat(logicPath)
    } catch {
      errors.push('logic.js 파일이 필요합니다.')
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
        registeredAt: existingTool?.registeredAt ?? now,
        updatedAt: now,
        hasCustomView: await pathExists(path.join(destinationPath, 'view.html')),
        hasCustomStyle: await pathExists(path.join(destinationPath, 'style.css')),
      }

      await writeToolModulesFile({
        tools: [
          ...toolModulesFile.tools.filter((tool) => tool.id !== toolId),
          registeredTool,
        ],
      })

      return registeredTool
    },

    validateToolPath,
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
  if (candidate.schemaVersion !== '1.0') {
    errors.push('schemaVersion은 "1.0"이어야 합니다.')
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
  const outputs = normalizeFields(candidate.outputs, 'outputs', errors)
  const permissions = normalizePermissions(candidate.permissions, errors)

  if (errors.length > 0) {
    return undefined
  }

  return {
    schemaVersion: '1.0',
    id: candidate.id ?? '',
    name: candidate.name ?? '',
    version: candidate.version ?? '',
    description:
      typeof candidate.description === 'string'
        ? candidate.description
        : undefined,
    inputs,
    outputs,
    permissions,
  }
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
    value === 'file'
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
