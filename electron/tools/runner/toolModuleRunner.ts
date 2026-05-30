import { clipboard } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type {
  ToolModuleField,
  ToolModulePermission,
  ToolModuleRunResult,
} from '../../../src/shared/tools'
import type { ToolModuleStore } from '../store/toolModuleStore'

export type ToolModuleRunner = {
  runTool(
    toolId: string,
    input: Record<string, unknown>,
  ): Promise<ToolModuleRunResult>
}

export type ToolModuleRunnerOptions = {
  toolModuleStore: ToolModuleStore
}

type ToolLogicModule = {
  run?: (
    input: Record<string, unknown>,
    context: ToolRunContext,
  ) => Promise<unknown> | unknown
}

type ToolRunContext = {
  clipboard?: {
    readText(): Promise<string>
    writeText(value: string): Promise<void>
  }
  files?: {
    open(filePath: string): Promise<string>
    save(filePath: string, value: string): Promise<void>
  }
  network?: {
    fetch(input: string, init?: RequestInit): Promise<unknown>
  }
}

export function createToolModuleRunner({
  toolModuleStore,
}: ToolModuleRunnerOptions): ToolModuleRunner {
  return {
    async runTool(toolId, input) {
      const tool = await toolModuleStore.getTool(toolId)
      const normalizedInput = normalizeRunInput(tool.manifest.inputs, input)
      const logicPath = pathToFileURL(
        path.join(tool.sourcePath, 'logic.mjs'),
      ).href
      const logicModule = (await import(
        `${logicPath}?updatedAt=${encodeURIComponent(tool.updatedAt)}`
      )) as ToolLogicModule

      if (typeof logicModule.run !== 'function') {
        throw new Error('logic.mjs는 run(input, context) 함수를 export해야 합니다.')
      }

      const output = await logicModule.run(
        normalizedInput,
        createToolContext(tool.manifest.permissions),
      )

      if (!output || typeof output !== 'object' || Array.isArray(output)) {
        throw new Error('도구 실행 결과는 객체여야 합니다.')
      }

      validateOutputKeys(
        output as Record<string, unknown>,
        tool.manifest.outputs,
      )

      return {
        toolId,
        runAt: new Date().toISOString(),
        output: output as Record<string, unknown>,
      }
    },
  }
}

function normalizeRunInput(
  fields: ToolModuleField[],
  input: Record<string, unknown>,
): Record<string, unknown> {
  return fields.reduce<Record<string, unknown>>((result, field) => {
    const rawValue = input[field.key] ?? field.default

    if (field.required && isEmptyValue(rawValue)) {
      throw new Error(`${field.key} 입력값이 필요합니다.`)
    }

    if (isEmptyValue(rawValue)) {
      return result
    }

    return {
      ...result,
      [field.key]: normalizeValue(field, rawValue),
    }
  }, {})
}

function normalizeValue(field: ToolModuleField, value: unknown): unknown {
  switch (field.type) {
    case 'string':
    case 'file':
      return String(value)
    case 'number': {
      const numericValue = Number(value)
      if (!Number.isFinite(numericValue)) {
        throw new Error(`${field.key}는 숫자여야 합니다.`)
      }
      return numericValue
    }
    case 'boolean':
      return value === true || value === 'true'
    case 'string[]':
      return Array.isArray(value)
        ? value.map(String)
        : String(value)
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean)
    case 'number[]': {
      const values = Array.isArray(value) ? value : String(value).split('\n')
      return values.map((item) => {
        const numericValue = Number(item)
        if (!Number.isFinite(numericValue)) {
          throw new Error(`${field.key}는 숫자 배열이어야 합니다.`)
        }
        return numericValue
      })
    }
    case 'json':
      if (typeof value === 'string') {
        return JSON.parse(value)
      }
      return value
  }
}

function createToolContext(
  permissions: ToolModulePermission[],
): ToolRunContext {
  return {
    clipboard: permissions.includes('clipboard')
      ? {
          async readText() {
            return clipboard.readText()
          },
          async writeText(value) {
            clipboard.writeText(value)
          },
        }
      : undefined,
    files:
      permissions.includes('file.read') || permissions.includes('file.write')
        ? {
            async open(filePath) {
              assertPermission(permissions, 'file.read')
              return readFile(filePath, 'utf8')
            },
            async save(filePath, value) {
              assertPermission(permissions, 'file.write')
              await writeFile(filePath, value, 'utf8')
            },
          }
        : undefined,
    network: permissions.includes('network')
      ? {
          async fetch(input, init) {
            const response = await fetch(input, init)
            const contentType = response.headers.get('content-type') ?? ''
            return contentType.includes('application/json')
              ? response.json()
              : response.text()
          },
        }
      : undefined,
  }
}

function validateOutputKeys(
  output: Record<string, unknown>,
  fields: ToolModuleField[],
): void {
  for (const field of fields) {
    if (field.required && !(field.key in output)) {
      throw new Error(`${field.key} 출력값이 필요합니다.`)
    }
  }
}

function assertPermission(
  permissions: ToolModulePermission[],
  permission: ToolModulePermission,
): void {
  if (!permissions.includes(permission)) {
    throw new Error(`permission이 필요합니다: ${permission}`)
  }
}

function isEmptyValue(value: unknown): boolean {
  return value === undefined || value === null || value === ''
}
