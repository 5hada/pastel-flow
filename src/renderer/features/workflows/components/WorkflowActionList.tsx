import { Button, Card, Checkbox, Input, Label, ListBox, Select } from '@heroui/react'
import { useEffect, useState } from 'react'
import type { ActionDefinition } from '../../../../shared/actions'
import type { WorkflowDefinition } from '../../../../shared/workflows'
import { getActionTypeLabel } from '../../../shared/utils/viewLabels'

export type WorkflowActionListProps = {
  actions: ActionDefinition[]
  workflow: WorkflowDefinition | null
  onAddAction(actionId: string): void
  onMoveAction(actionRefId: string, position: 'top' | 'bottom'): void
  onRemoveAction(actionRefId: string): void
  onReorderActions(actionRefIds: string[]): void
  onToggleAction(actionRefId: string): void
}

export function WorkflowActionList({
  actions,
  onAddAction,
  onMoveAction,
  onReorderActions,
  onRemoveAction,
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
        <Button variant="secondary" type="button" onClick={() => setIsPickerOpen(true)}>
          Action 추가
        </Button>
      </div>
      {sortedActionRefs.length === 0 ? (
        <p className="empty-state">이 Workflow에는 아직 Action이 없습니다.</p>
      ) : (
        sortedActionRefs.map((actionRef, index) => {
          const action = actionMap.get(actionRef.actionId)

          return (
            <div
              className="workflow-action-row"
              draggable
              key={actionRef.id}
              onDragStart={(event) => {
                event.dataTransfer.setData('text/plain', actionRef.id)
                event.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
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
              </div>
              <Checkbox
                aria-label="Action 활성화"
                className="toggle-switch"
                isSelected={actionRef.enabled}
                onChange={() => onToggleAction(actionRef.id)}
              >
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
              </Checkbox>
              <Button
                className="icon-button"
                isDisabled={index === 0}
                isIconOnly
                variant="ghost"
                type="button"
                onClick={() => onMoveAction(actionRef.id, 'top')}
              >
                ⇤
              </Button>
              <Button
                className="icon-button"
                isDisabled={index === sortedActionRefs.length - 1}
                isIconOnly
                variant="ghost"
                type="button"
                onClick={() => onMoveAction(actionRef.id, 'bottom')}
              >
                ⇥
              </Button>
              <Button
                className="icon-button danger-button"
                isIconOnly
                variant="danger"
                type="button"
                onClick={() => onRemoveAction(actionRef.id)}
              >
                ×
              </Button>
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
              {filteredActions.map((action) => (
                <div className="action-picker-row" key={action.id}>
                  <div>
                    <strong>{action.name}</strong>
                    <small>{getActionTypeLabel(action.type)}</small>
                  </div>
                  <Button variant="secondary" type="button" onClick={() => onAddAction(action.id)}>
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
