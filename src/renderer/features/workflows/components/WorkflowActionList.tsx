import { Button, Card, Input, Label, ListBox, Select, Switch } from '@heroui/react'
import { ArrowLeftToLine, ArrowRightToLine, XmarkShape } from '@gravity-ui/icons';
import { useEffect, useState } from 'react'
import {
  getActionInputSchema,
  getActionOutputSchema,
  getMissingRequiredActionInputs,
  canMapActionField,
  type ActionDefinition,
  type ActionIOField,
  type TransformActionConfig,
} from '../../../../shared/actions'
import type { WorkflowDefinition } from '../../../../shared/workflows'
import { getActionTypeLabel } from '../../../shared/utils/viewLabels'

export type WorkflowActionListProps = {
  actions: ActionDefinition[]
  workflow: WorkflowDefinition | null
  isLocked?: boolean
  onAddAction(actionId: string): void
  onCreateTransformAction(mode: TransformActionConfig['mode']): Promise<void>
  onMoveAction(actionRefId: string, position: 'top' | 'bottom'): void
  onRemoveAction(actionRefId: string): void
  onReorderActions(actionRefIds: string[]): void
  onUpdateActionConfig(actionId: string, config: unknown): void
  onUpdateInputMapping(
    actionRefId: string,
    inputMapping: Record<string, string> | undefined,
  ): void
  onToggleAction(actionRefId: string): void
}

export function WorkflowActionList({
  actions,
  isLocked = false,
  onAddAction,
  onCreateTransformAction,
  onMoveAction,
  onReorderActions,
  onRemoveAction,
  onUpdateActionConfig,
  onUpdateInputMapping,
  onToggleAction,
  workflow,
}: WorkflowActionListProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [actionTypeFilter, setActionTypeFilter] = useState<
    ActionDefinition['type'] | 'all'
  >('all')
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!isPickerOpen) {
      return undefined
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsPickerOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isPickerOpen])

  if (!workflow) {
    return (
      <div className="empty-state-action">
        <p className="empty-state">선택된 Workflow가 없습니다.</p>
      </div>
    )
  }

  const actionMap = new Map(actions.map((action) => [action.id, action]))
  const sortedActionRefs = [...workflow.actionRefs].sort(
    (left, right) => left.order - right.order,
  )
  const actionTypes = Array.from(new Set(actions.map((action) => action.type)))
  const filteredActions = actions.filter((action) => {
    const matchesType =
      actionTypeFilter === 'all' || action.type === actionTypeFilter
    const normalizedQuery = query.trim().toLowerCase()
    const matchesQuery =
      !normalizedQuery ||
      action.name.toLowerCase().includes(normalizedQuery) ||
      getActionTypeLabel(action.type).toLowerCase().includes(normalizedQuery)

    return matchesType && matchesQuery
  })

  return (
    <div className="workflow-action-list">
      <div className="detail-actions">
        <Button
          isDisabled={isLocked}
          variant="secondary"
          type="button"
          onClick={() => setIsPickerOpen(true)}
        >
          Action 추가
        </Button>
      </div>
      {sortedActionRefs.length === 0 ? (
        <p className="empty-state">이 Workflow에는 아직 Action이 없습니다.</p>
      ) : (
        sortedActionRefs.map((actionRef, index) => {
          const action = actionMap.get(actionRef.actionId)
          const inputSchema = action ? getActionInputSchema(action) : []
          const outputSchema = action ? getActionOutputSchema(action) : []
          const missingInputs = action
            ? getMissingRequiredActionInputs(action, actionRef.inputMapping)
            : []

          return (
            <div
              className="workflow-action-row"
              draggable={!isLocked}
              key={actionRef.id}
              onDragStart={(event) => {
                if (isLocked) {
                  event.preventDefault()
                  return
                }
                event.dataTransfer.setData('text/plain', actionRef.id)
                event.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={(event) => {
                if (!isLocked) {
                  event.preventDefault()
                }
              }}
              onDrop={(event) => {
                if (isLocked) {
                  return
                }
                event.preventDefault()
                const sourceActionRefId = event.dataTransfer.getData('text/plain')
                if (!sourceActionRefId || sourceActionRefId === actionRef.id) {
                  return
                }
                onReorderActions(
                  moveActionRefByDrop(
                    sortedActionRefs.map((currentActionRef) => currentActionRef.id),
                    sourceActionRefId,
                    actionRef.id,
                  ),
                )
              }}
            >
              <span>{index + 1}</span>
              <div>
                <strong>{action?.name ?? actionRef.actionId}</strong>
                <small>{action ? getActionTypeLabel(action.type) : '연결 끊김'}</small>
                {action ? (
                  <ActionSchemaSummary
                    inputSchema={inputSchema}
                    missingInputs={missingInputs}
                    outputSchema={outputSchema}
                  />
                ) : null}
              </div>
              <Switch
                aria-label="Action 활성화"
                isDisabled={isLocked}
                isSelected={actionRef.enabled}
                onChange={() => onToggleAction(actionRef.id)}
              >
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch>
              <Button
                isDisabled={isLocked || index === 0}
                isIconOnly
                variant="ghost"
                type="button"
                onClick={() => onMoveAction(actionRef.id, 'top')}
              >
                <ArrowLeftToLine/>
              </Button>
              <Button
                isDisabled={isLocked || index === sortedActionRefs.length - 1}
                isIconOnly
                variant="ghost"
                type="button"
                onClick={() => onMoveAction(actionRef.id, 'bottom')}
              >
                <ArrowRightToLine/>
              </Button>
              <Button
                isIconOnly
                isDisabled={isLocked}
                variant="danger"
                type="button"
                onClick={() => onRemoveAction(actionRef.id)}
              >
                <XmarkShape/>
              </Button>
              {action && inputSchema.length > 0 ? (
                <ActionInputMappingEditor
                  actionRef={actionRef}
                  actionRefsBefore={sortedActionRefs.slice(0, index)}
                  actionMap={actionMap}
                  inputSchema={inputSchema}
                  isLocked={isLocked}
                  onUpdateInputMapping={onUpdateInputMapping}
                />
              ) : null}
              {action?.type === 'transform_action' ? (
                <TransformActionConfigEditor
                  action={action}
                  isLocked={isLocked}
                  onUpdateActionConfig={onUpdateActionConfig}
                />
              ) : null}
            </div>
          )
        })
      )}
      {isPickerOpen ? (
        <div className="action-picker-backdrop" role="presentation">
          <Card
            aria-label="Action 추가"
            className="action-picker-dialog"
            role="dialog"
            aria-modal="true"
          >
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Add actions</p>
                <h2>Action 추가</h2>
              </div>
              <Button
                aria-label="닫기"
                className="icon-button"
                isIconOnly
                variant="ghost"
                type="button"
                onClick={() => setIsPickerOpen(false)}
              >
                ×
              </Button>
            </div>
            <div className="action-picker-controls">
              <Input
                autoFocus
                placeholder="키워드 검색"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <Select
                selectedKey={actionTypeFilter}
                onSelectionChange={(key) =>
                  setActionTypeFilter(String(key) as typeof actionTypeFilter)
                }
              >
                <Label>Action 타입 필터</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="all" textValue="전체">
                      전체
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    {actionTypes.map((actionType) => (
                      <ListBox.Item
                        id={actionType}
                        key={actionType}
                        textValue={getActionTypeLabel(actionType)}
                      >
                        {getActionTypeLabel(actionType)}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>
            <div className="action-picker-list">
              <div className="action-picker-section">
                <strong>Built-in transforms</strong>
                <div className="action-picker-transform-grid">
                  {transformOptions.map((option) => (
                    <Button
                      isDisabled={isLocked}
                      key={option.mode}
                      variant="secondary"
                      type="button"
                      onClick={() => {
                        void onCreateTransformAction(option.mode)
                        setIsPickerOpen(false)
                      }}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
              {filteredActions.map((action) => (
                <div className="action-picker-row" key={action.id}>
                  <div>
                    <strong>{action.name}</strong>
                    <small>{getActionTypeLabel(action.type)}</small>
                  </div>
                  <Button
                    isDisabled={isLocked}
                    variant="secondary"
                    type="button"
                    onClick={() => onAddAction(action.id)}
                  >
                    추가
                  </Button>
                </div>
              ))}
              {filteredActions.length === 0 ? (
                <p className="empty-state">조건에 맞는 Action이 없습니다.</p>
              ) : null}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  )
}

const transformOptions: Array<{
  label: string
  mode: TransformActionConfig['mode']
}> = [
  { label: 'JSON to string', mode: 'json_to_string' },
  { label: 'String to JSON', mode: 'string_to_json' },
  { label: 'Pick field', mode: 'pick_field' },
  { label: 'Join', mode: 'join' },
  { label: 'Split', mode: 'split' },
]

function TransformActionConfigEditor({
  action,
  isLocked,
  onUpdateActionConfig,
}: {
  action: ActionDefinition
  isLocked: boolean
  onUpdateActionConfig(actionId: string, config: unknown): void
}) {
  const config = normalizeTransformConfig(action.config)

  function updateConfig(input: Partial<TransformActionConfig>) {
    onUpdateActionConfig(action.id, {
      ...config,
      ...input,
    })
  }

  return (
    <div className="transform-config-editor">
      <label>
        <span>Mode</span>
        <select
          disabled={isLocked}
          value={config.mode}
          onChange={(event) =>
            updateConfig({
              mode: event.target.value as TransformActionConfig['mode'],
            })
          }
        >
          {transformOptions.map((option) => (
            <option key={option.mode} value={option.mode}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {config.mode === 'pick_field' ? (
        <label>
          <span>Dot path</span>
          <input
            disabled={isLocked}
            placeholder="items.0.title"
            value={config.path ?? ''}
            onChange={(event) => updateConfig({ path: event.target.value })}
          />
        </label>
      ) : null}
      {config.mode === 'join' || config.mode === 'split' ? (
        <label>
          <span>Separator</span>
          <input
            disabled={isLocked}
            value={config.separator ?? '\n'}
            onChange={(event) => updateConfig({ separator: event.target.value })}
          />
        </label>
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

function ActionInputMappingEditor({
  actionMap,
  actionRef,
  actionRefsBefore,
  inputSchema,
  isLocked,
  onUpdateInputMapping,
}: {
  actionMap: Map<string, ActionDefinition>
  actionRef: WorkflowDefinition['actionRefs'][number]
  actionRefsBefore: WorkflowDefinition['actionRefs']
  inputSchema: ActionIOField[]
  isLocked: boolean
  onUpdateInputMapping(
    actionRefId: string,
    inputMapping: Record<string, string> | undefined,
  ): void
}) {
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

  function updateMapping(inputId: string, value: string) {
    const nextMapping = {
      ...(actionRef.inputMapping ?? {}),
    }

    if (value) {
      nextMapping[inputId] = value
    } else {
      delete nextMapping[inputId]
    }

    onUpdateInputMapping(
      actionRef.id,
      Object.keys(nextMapping).length > 0 ? nextMapping : undefined,
    )
  }

  return (
    <div className="action-input-mapping-editor">
      {inputSchema.map((inputField) => (
        <label key={inputField.id}>
          <span>
            {inputField.name}
            {inputField.required ? ' *' : ''} · {inputField.type}
          </span>
          <select
            disabled={isLocked}
            value={actionRef.inputMapping?.[inputField.id] ?? ''}
            onChange={(event) => updateMapping(inputField.id, event.target.value)}
          >
            <option value="">연결 없음</option>
            {outputOptions.map((option) => (
              <option
                disabled={!canMapActionField(option.outputField, inputField)}
                key={`${inputField.id}-${option.value}`}
                value={option.value}
              >
                {option.actionName}.{option.outputField.id} · {option.outputField.type}
              </option>
            ))}
          </select>
        </label>
      ))}
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

function ActionSchemaSummary({
  inputSchema,
  missingInputs,
  outputSchema,
}: {
  inputSchema: ActionIOField[]
  missingInputs: ActionIOField[]
  outputSchema: ActionIOField[]
}) {
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

function moveActionRefByDrop(
  ids: string[],
  sourceId: string,
  targetId: string,
): string[] {
  const nextIds = ids.filter((id) => id !== sourceId)
  const targetIndex = nextIds.indexOf(targetId)

  if (targetIndex === -1) {
    return ids
  }

  nextIds.splice(targetIndex, 0, sourceId)
  return nextIds
}
