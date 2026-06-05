import type { WorkflowDefinition } from '../workflows'
import type {
  ActionDefinition,
  ActionIOField,
  TransformActionConfig,
} from './types'

export type WorkflowMappingValidationResult = {
  ok: boolean
  errors: string[]
}

export function getMissingRequiredActionInputs(
  action: ActionDefinition,
  inputMapping?: Record<string, string>,
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
    (source.type === 'image' && target.type === 'string')
  )
}

export function parseMappingSource(value: string): {
  actionRefId: string
  outputKey?: string
} {
  const [actionRefId = '', outputKey] = value.split('.', 2)

  return {
    actionRefId,
    outputKey,
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
