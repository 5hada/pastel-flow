import type {
  WorkflowDefinition,
  WorkflowInputMapping,
  WorkflowInputMappingSource,
} from '../workflows'
import type {
  ActionDefinition,
  ActionIOField,
  DatabaseActionConfig,
  ScrapActionConfig,
  TransformActionConfig,
} from './types'

export type WorkflowMappingValidationResult = {
  ok: boolean
  errors: string[]
}

export function getMissingRequiredActionInputs(
  action: ActionDefinition,
  inputMapping?: WorkflowInputMapping,
): ActionIOField[] {
  return getActionInputSchema(action).filter(
    (field) =>
      field.required &&
      !inputMapping?.[field.id] &&
      !hasActionInputDefault(action, field.id),
  )
}

export function getActionInputSchema(
  action: ActionDefinition,
): ActionIOField[] {
  if (action.inputSchema) {
    return action.inputSchema
  }

  switch (action.type) {
    case 'crawler_action':
      return [
        {
          id: 'urls',
          name: 'URLs',
          type: 'url[]',
          required: true,
        },
      ]
    case 'browser_action':
      return [
        {
          id: 'initialUrls',
          name: 'Initial URLs',
          type: 'url[]',
          required: true,
        },
      ]
    case 'discord_dry_run_action':
    case 'notion_dry_run_action':
    case 'trading_dry_run_action':
      return []
    case 'transform_action':
      return getTransformInputSchema(action.config as Partial<TransformActionConfig>)
    case 'tool_action':
      return []
    case 'webhook_action':
      return [
        {
          id: 'payload',
          name: 'Payload',
          type: 'json',
          required: true,
        },
      ]
    case 'scrap_action':
      return getScrapInputSchema(action.config as Partial<ScrapActionConfig>)
    case 'database_action':
      return getDatabaseInputSchema(action.config as Partial<DatabaseActionConfig>)
    case 'macro_action':
      return [
        {
          id: 'input',
          name: 'Input',
          type: 'json',
        },
      ]
  }
}

export function getActionOutputSchema(
  action: ActionDefinition,
): ActionIOField[] {
  if (action.outputSchema) {
    return action.outputSchema
  }

  switch (action.type) {
    case 'crawler_action':
      return [
        {
          id: 'outputPath',
          name: 'Output path',
          type: 'file',
        },
        {
          id: 'lastMessage',
          name: 'Last message',
          type: 'string',
        },
      ]
    case 'browser_action':
    case 'discord_dry_run_action':
    case 'notion_dry_run_action':
    case 'trading_dry_run_action':
      return [
        {
          id: 'lastMessage',
          name: 'Last message',
          type: 'string',
        },
      ]
    case 'transform_action':
      return getTransformOutputSchema(action.config as Partial<TransformActionConfig>)
    case 'tool_action':
      return []
    case 'webhook_action':
      return [
        {
          id: 'response',
          name: 'Response',
          type: 'json',
        },
      ]
    case 'scrap_action':
      return getScrapOutputSchema(action.config as Partial<ScrapActionConfig>)
    case 'database_action':
      return getDatabaseOutputSchema(action.config as Partial<DatabaseActionConfig>)
    case 'macro_action':
      return [
        {
          id: 'output',
          name: 'Output',
          type: 'json',
        },
      ]
  }
}

function getScrapInputSchema(
  config: Partial<ScrapActionConfig>,
): ActionIOField[] {
  switch (config.mode) {
    case 'ingest':
      return [{ id: 'source', name: 'Source', type: 'json', required: true }]
    case 'classify':
      return [{ id: 'scrap', name: 'Scrap', type: 'scrap', required: true }]
    case 'search':
      return [{ id: 'query', name: 'Query', type: 'json', required: true }]
    case 'update':
      return [{ id: 'scrap', name: 'Scrap', type: 'scrap', required: true }]
    default:
      return []
  }
}

function getScrapOutputSchema(
  config: Partial<ScrapActionConfig>,
): ActionIOField[] {
  switch (config.mode) {
    case 'search':
      return [{ id: 'results', name: 'Results', type: 'scrap[]' }]
    case 'classify':
      return [{ id: 'classification', name: 'Classification', type: 'json' }]
    case 'ingest':
    case 'update':
    default:
      return [{ id: 'scrap', name: 'Scrap', type: 'scrap' }]
  }
}

function getDatabaseInputSchema(
  config: Partial<DatabaseActionConfig>,
): ActionIOField[] {
  switch (config.mode) {
    case 'upsert':
      return [{ id: 'record', name: 'Record', type: 'json', required: true }]
    case 'query':
    default:
      return [{ id: 'query', name: 'Query', type: 'json', required: true }]
  }
}

function getDatabaseOutputSchema(
  config: Partial<DatabaseActionConfig>,
): ActionIOField[] {
  switch (config.mode) {
    case 'upsert':
      return [{ id: 'record', name: 'Record', type: 'json' }]
    case 'query':
    default:
      return [{ id: 'rows', name: 'Rows', type: 'json' }]
  }
}

function getTransformInputSchema(
  config: Partial<TransformActionConfig>,
): ActionIOField[] {
  switch (config.mode) {
    case 'string_to_json':
      return [{ id: 'text', name: 'Text', type: 'string', required: true }]
    case 'pick_field':
      return [{ id: 'source', name: 'Source', type: 'json', required: true }]
    case 'join':
      return [{ id: 'items', name: 'Items', type: 'string[]', required: true }]
    case 'split':
      return [{ id: 'text', name: 'Text', type: 'string', required: true }]
    case 'json_to_string':
    default:
      return [{ id: 'value', name: 'Value', type: 'json', required: true }]
  }
}

function getTransformOutputSchema(
  config: Partial<TransformActionConfig>,
): ActionIOField[] {
  switch (config.mode) {
    case 'string_to_json':
    case 'pick_field':
      return [{ id: 'value', name: 'Value', type: 'json' }]
    case 'join':
    case 'json_to_string':
      return [{ id: 'text', name: 'Text', type: 'string' }]
    case 'split':
      return [{ id: 'items', name: 'Items', type: 'string[]' }]
    default:
      return [{ id: 'text', name: 'Text', type: 'string' }]
  }
}

export function validateWorkflowInputMappings(
  workflow: WorkflowDefinition,
  actions: ActionDefinition[],
): WorkflowMappingValidationResult {
  const actionMap = new Map(actions.map((action) => [action.id, action]))
  const sortedActionRefs = workflow.actionRefs
    .filter((actionRef) => actionRef.enabled)
    .sort((left, right) => left.order - right.order)
  const outputFieldsByActionRefId = new Map<string, ActionIOField[]>()
  const errors: string[] = []

  for (const actionRef of sortedActionRefs) {
    const action = actionMap.get(actionRef.actionId)
    if (!action) {
      errors.push(`Action을 찾을 수 없습니다: ${actionRef.actionId}`)
      continue
    }

    const inputSchema = getActionInputSchema(action)
    for (const inputField of inputSchema) {
      if (!inputField.required) {
        continue
      }

      const mapping = actionRef.inputMapping?.[inputField.id]
      if (
        !mapping &&
        getMissingRequiredActionInputs(action, actionRef.inputMapping).some(
          (field) => field.id === inputField.id,
        )
      ) {
        errors.push(`${action.name}.${inputField.name} 입력 연결이 필요합니다.`)
        continue
      }

      if (!mapping) {
        continue
      }

      const source = parseMappingSource(mapping)
      const sourceFields = outputFieldsByActionRefId.get(source.actionRefId)
      if (!sourceFields) {
        errors.push(`${action.name}.${inputField.name} 입력 source를 찾을 수 없습니다.`)
        continue
      }

      const sourceField = source.outputKey
        ? sourceFields.find((field) => field.id === source.outputKey)
        : sourceFields[0]
      if (!sourceField) {
        errors.push(`${action.name}.${inputField.name} 출력 key를 찾을 수 없습니다.`)
        continue
      }

      if (!canMapActionField(sourceField, inputField)) {
        errors.push(
          `${action.name}.${inputField.name} 타입이 맞지 않습니다: ${sourceField.type} -> ${inputField.type}`,
        )
      }

      if (source.path && !isValidDotPath(source.path)) {
        errors.push(`${action.name}.${inputField.name} dot path 형식이 올바르지 않습니다.`)
      }

      if (source.path && sourceField.type !== 'json') {
        errors.push(`${action.name}.${inputField.name} dot path는 json 출력에만 사용할 수 있습니다.`)
      }
    }

    outputFieldsByActionRefId.set(actionRef.id, getActionOutputSchema(action))
  }

  return {
    ok: errors.length === 0,
    errors,
  }
}

export function canMapActionField(
  source: ActionIOField,
  target: ActionIOField,
): boolean {
  if (source.type === 'any' || target.type === 'any') {
    return true
  }

  if (source.type === target.type) {
    return true
  }

  return (
    (source.type === 'string' && target.type === 'url') ||
    (source.type === 'url' && target.type === 'string') ||
    (source.type === 'json' && target.type === 'string') ||
    (source.type === 'string[]' && target.type === 'json') ||
    (source.type === 'url[]' && target.type === 'json') ||
    (source.type === 'file' && target.type === 'string') ||
    (source.type === 'image' && target.type === 'string') ||
    (source.type === 'scrap' && target.type === 'json') ||
    (source.type === 'scrap[]' && target.type === 'json') ||
    (source.type === 'document' && target.type === 'json') ||
    (source.type === 'chunk[]' && target.type === 'json')
  )
}

export function parseMappingSource(
  value: WorkflowInputMappingSource,
): WorkflowInputMappingSource {
  return {
    actionRefId: value.actionRefId,
    outputKey: value.outputKey,
    path: value.path,
  }
}

function hasActionInputDefault(action: ActionDefinition, inputId: string): boolean {
  if (action.type !== 'tool_action' || !isRecord(action.config)) {
    return false
  }

  const inputDefaults = action.config.inputDefaults
  if (!isRecord(inputDefaults)) {
    return false
  }

  const value = inputDefaults[inputId]
  return value !== undefined && value !== null && value !== ''
}

function isValidDotPath(value: string): boolean {
  return value
    .split('.')
    .every((segment) => /^[A-Za-z0-9_-]+$/.test(segment))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
