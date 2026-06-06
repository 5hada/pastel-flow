import { Input, Label, ListBox, Select, TextField } from '@heroui/react'
import {
  canMapActionField,
  getActionOutputSchema,
  type ActionDefinition,
  type ActionIOField,
  type TransformActionConfig,
} from '../../../../shared/actions'
import type {
  WorkflowDefinition,
  WorkflowInputMapping,
  WorkflowInputMappingSource,
} from '../../../../shared/workflows'
import { transformOptions } from './workflowActionOptions'

type ActionRetryPolicyEditorProps = {
  actionRef: WorkflowDefinition['actionRefs'][number]
  isLocked: boolean
  onUpdateRetryPolicy(
    actionRefId: string,
    retryPolicy: WorkflowDefinition['actionRefs'][number]['retryPolicy'],
  ): void
}

export function ActionRetryPolicyEditor({
  actionRef,
  isLocked,
  onUpdateRetryPolicy,
}: ActionRetryPolicyEditorProps) {
  const retryCount = actionRef.retryPolicy?.retryCount ?? 0
  const retryDelaySeconds = actionRef.retryPolicy?.retryDelaySeconds ?? 0

  function updateRetryPolicy(input: {
    retryCount?: number
    retryDelaySeconds?: number
  }) {
    const nextRetryCount = input.retryCount ?? retryCount
    const nextRetryDelaySeconds =
      input.retryDelaySeconds ?? retryDelaySeconds

    onUpdateRetryPolicy(
      actionRef.id,
      nextRetryCount === 0 && nextRetryDelaySeconds === 0
        ? undefined
        : {
            retryCount: nextRetryCount,
            retryDelaySeconds: nextRetryDelaySeconds,
          },
    )
  }

  return (
    <div className="action-input-mapping-editor">
      <TextField
        isDisabled={isLocked}
        name={`${actionRef.id}-retry-count`}
        type="number"
        value={String(retryCount)}
        onChange={(value) => updateRetryPolicy({ retryCount: Number(value) })}
      >
        <Label>Retry count</Label>
        <Input max={5} min={0} />
      </TextField>
      <TextField
        isDisabled={isLocked}
        name={`${actionRef.id}-retry-delay-seconds`}
        type="number"
        value={String(retryDelaySeconds)}
        onChange={(value) =>
          updateRetryPolicy({
            retryDelaySeconds: Number(value),
          })
        }
      >
        <Label>Retry delay seconds</Label>
        <Input max={300} min={0} />
      </TextField>
    </div>
  )
}

type TransformActionConfigEditorProps = {
  action: ActionDefinition
  isLocked: boolean
  onUpdateActionConfig(actionId: string, config: unknown): void
}

export function TransformActionConfigEditor({
  action,
  isLocked,
  onUpdateActionConfig,
}: TransformActionConfigEditorProps) {
  const config = normalizeTransformConfig(action.config)

  function updateConfig(input: Partial<TransformActionConfig>) {
    onUpdateActionConfig(action.id, {
      ...config,
      ...input,
    })
  }

  return (
    <div className="transform-config-editor">
      <Select
        isDisabled={isLocked}
        selectedKey={config.mode}
        onSelectionChange={(key) =>
          updateConfig({
            mode: String(key) as TransformActionConfig['mode'],
          })
        }
      >
        <Label>Mode</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {transformOptions.map((option) => (
              <ListBox.Item
                id={option.mode}
                key={option.mode}
                textValue={option.label}
              >
                {option.label}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
      {config.mode === 'pick_field' ? (
        <TextField
          isDisabled={isLocked}
          name={`${action.id}-transform-path`}
          value={config.path ?? ''}
          onChange={(value) => updateConfig({ path: value })}
        >
          <Label>Dot path</Label>
          <Input placeholder="items.0.title" />
        </TextField>
      ) : null}
      {config.mode === 'join' || config.mode === 'split' ? (
        <TextField
          isDisabled={isLocked}
          name={`${action.id}-transform-separator`}
          value={config.separator ?? '\n'}
          onChange={(value) => updateConfig({ separator: value })}
        >
          <Label>Separator</Label>
          <Input />
        </TextField>
      ) : null}
    </div>
  )
}

function normalizeTransformConfig(config: unknown): TransformActionConfig {
  const candidate = isRecord(config) ? config : {}
  const mode = isTransformMode(candidate.mode)
    ? candidate.mode
    : 'json_to_string'

  return {
    mode,
    path: typeof candidate.path === 'string' ? candidate.path : undefined,
    separator:
      typeof candidate.separator === 'string' ? candidate.separator : undefined,
  }
}

type ActionInputMappingEditorProps = {
  actionMap: Map<string, ActionDefinition>
  actionRef: WorkflowDefinition['actionRefs'][number]
  actionRefsBefore: WorkflowDefinition['actionRefs']
  inputSchema: ActionIOField[]
  isLocked: boolean
  onUpdateInputMapping(
    actionRefId: string,
    inputMapping: WorkflowInputMapping | undefined,
  ): void
}

export function ActionInputMappingEditor({
  actionMap,
  actionRef,
  actionRefsBefore,
  inputSchema,
  isLocked,
  onUpdateInputMapping,
}: ActionInputMappingEditorProps) {
  const outputOptions = actionRefsBefore.flatMap((sourceActionRef) => {
    const sourceAction = actionMap.get(sourceActionRef.actionId)
    if (!sourceAction) {
      return []
    }

    return getActionOutputSchema(sourceAction).map((outputField) => ({
      actionName: sourceAction.name,
      actionRefId: sourceActionRef.id,
      outputField,
      value: `${sourceActionRef.id}.${outputField.id}`,
    }))
  })
  const outputOptionByValue = new Map(
    outputOptions.map((option) => [option.value, option]),
  )

  function updateMapping(inputId: string, value: string) {
    const nextMapping = {
      ...(actionRef.inputMapping ?? {}),
    }

    if (value) {
      const option = outputOptionByValue.get(value)
      if (!option) {
        return
      }

      nextMapping[inputId] = {
        actionRefId: option.actionRefId,
        outputKey: option.outputField.id,
      }
    } else {
      delete nextMapping[inputId]
    }

    onUpdateInputMapping(
      actionRef.id,
      Object.keys(nextMapping).length > 0 ? nextMapping : undefined,
    )
  }

  function updateMappingPath(inputId: string, path: string) {
    const currentSource = actionRef.inputMapping?.[inputId]
    if (!currentSource) {
      return
    }

    const nextSource = {
      ...currentSource,
      path: path.trim() || undefined,
    }
    const nextMapping = {
      ...(actionRef.inputMapping ?? {}),
      [inputId]: nextSource,
    }

    onUpdateInputMapping(actionRef.id, nextMapping)
  }

  return (
    <div className="action-input-mapping-editor">
      {inputSchema.map((inputField) => {
        const currentSource = actionRef.inputMapping?.[inputField.id]
        const selectedOption = outputOptionByValue.get(
          formatMappingSelectValue(currentSource),
        )
        const canUsePath = selectedOption?.outputField.type === 'json'

        return (
          <div key={inputField.id}>
            <Select
              isDisabled={isLocked}
              selectedKey={formatMappingSelectValue(currentSource)}
              onSelectionChange={(key) => updateMapping(inputField.id, String(key))}
            >
              <Label>
                {inputField.name}
                {inputField.required ? ' *' : ''} · {inputField.type}
              </Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="" textValue="연결 없음">
                    연결 없음
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  {outputOptions.map((option) => (
                    <ListBox.Item
                      id={option.value}
                      isDisabled={!canMapActionField(option.outputField, inputField)}
                      key={`${inputField.id}-${option.value}`}
                      textValue={`${option.actionName}.${option.outputField.id}`}
                    >
                      {option.actionName}.{option.outputField.id} · {option.outputField.type}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            {canUsePath ? (
              <TextField
                isDisabled={isLocked}
                name={`${actionRef.id}-${inputField.id}-mapping-path`}
                value={currentSource?.path ?? ''}
                onChange={(value) => updateMappingPath(inputField.id, value)}
              >
                <Label>Dot path</Label>
                <Input placeholder="Dot path, e.g. items.0.title" />
              </TextField>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function isTransformMode(value: unknown): value is TransformActionConfig['mode'] {
  return (
    value === 'json_to_string' ||
    value === 'string_to_json' ||
    value === 'pick_field' ||
    value === 'join' ||
    value === 'split'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

type ActionSchemaSummaryProps = {
  inputSchema: ActionIOField[]
  missingInputs: ActionIOField[]
  outputSchema: ActionIOField[]
}

export function ActionSchemaSummary({
  inputSchema,
  missingInputs,
  outputSchema,
}: ActionSchemaSummaryProps) {
  return (
    <div className="action-schema-summary">
      <span className="schema-pill">IN {formatSchemaTypes(inputSchema)}</span>
      <span className="schema-pill">OUT {formatSchemaTypes(outputSchema)}</span>
      {missingInputs.length > 0 ? (
        <span className="schema-pill schema-pill-warning">
          누락 {missingInputs.map((field) => field.name).join(', ')}
        </span>
      ) : null}
    </div>
  )
}

function formatSchemaTypes(fields: ActionIOField[]): string {
  if (fields.length === 0) {
    return '-'
  }

  return fields.map((field) => `${field.id}:${field.type}`).join(', ')
}

function formatMappingSelectValue(
  source: WorkflowInputMappingSource | undefined,
): string {
  if (!source?.actionRefId || !source.outputKey) {
    return ''
  }

  return `${source.actionRefId}.${source.outputKey}`
}
