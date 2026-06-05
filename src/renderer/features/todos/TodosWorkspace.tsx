import { Button, Card } from '@heroui/react'
import { useEffect, useState, type FormEvent } from 'react'
import type { TodoItem } from '../../../shared/todos'
import { CollectionListPanel } from '../../shared/components/CollectionListPanel'
import { DetailItem } from '../../shared/components/DetailItem'
import { getCommonIcon } from '../../shared/assets/icon'
import { formatDate } from '../../shared/utils/viewLabels'

export type TodosWorkspaceProps = {
  includeCompletedTodos: boolean
  isLoading: boolean
  selectedTodoId: string | null
  todos: TodoItem[]
  onCreateTodo(input: {
    title: string
    dueAt?: string
    category?: string
    details?: string
  }): Promise<void>
  onDeleteTodo(id: string): Promise<void>
  onIncludeCompletedChange(value: boolean): void
  onSelectTodo(id: string | null): void
  onUpdateTodo(
    id: string,
    input: Partial<Pick<TodoItem, 'title' | 'dueAt' | 'category' | 'details' | 'completed'>>,
  ): Promise<void>
}

export function TodosWorkspace({
  includeCompletedTodos,
  isLoading,
  onCreateTodo,
  onDeleteTodo,
  onIncludeCompletedChange,
  onSelectTodo,
  onUpdateTodo,
  selectedTodoId,
  todos,
}: TodosWorkspaceProps) {
  const selectedTodo = todos.find((todo) => todo.id === selectedTodoId) ?? null
  const [isCreating, setIsCreating] = useState(false)
  const [draft, setDraft] = useState(createDraft(selectedTodo))

  useEffect(() => {
    setDraft(createDraft(selectedTodo))
    setIsCreating(false)
  }, [selectedTodo])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input = parseDraft(draft)
    if (!input.title) {
      return
    }

    if (selectedTodo) {
      await onUpdateTodo(selectedTodo.id, input)
    } else {
      await onCreateTodo(input)
    }
  }

  if (isLoading) {
    return (
      <Card className="mode-panel">
        <p className="empty-state">Todo를 불러오는 중입니다.</p>
      </Card>
    )
  }

  if (!selectedTodo && !isCreating) {
    return (
      <CollectionListPanel
        emptyText="표시할 Todo가 없습니다."
        eyebrow="TODOS"
        headerAction={
          <Button
            aria-label="Todo 추가"
            isIconOnly
            variant="ghost"
            type="button"
            onClick={() => setIsCreating(true)}
          >
            {getCommonIcon('add')}
          </Button>
        }
        items={todos.map((todo) => ({
          id: todo.id,
          title: todo.title,
          meta: getTodoMeta(todo),
          message: todo.details ?? todo.category ?? '',
        }))}
        title="Todo 목록"
        onEdit={onSelectTodo}
      />
    )
  }

  return (
    <Card className="mode-panel" aria-label="Todo 편집">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Todos</p>
          <h2>{selectedTodo?.title ?? '새 Todo'}</h2>
        </div>
        <Button
          aria-label="목록으로 돌아가기"
          isIconOnly
          variant="ghost"
          type="button"
          onClick={() => {
            setIsCreating(false)
            onSelectTodo(null)
          }}
        >
          {getCommonIcon('close')}
        </Button>
      </div>

      <form className="task-form" onSubmit={handleSubmit}>
        <label>
          Title
          <input
            value={draft.title}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                title: event.target.value,
              }))
            }
          />
        </label>
        <div className="form-grid">
          <label>
            Due
            <input
              type="datetime-local"
              value={draft.dueAt}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  dueAt: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Category
            <input
              value={draft.category}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  category: event.target.value,
                }))
              }
            />
          </label>
        </div>
        <label>
          Details
          <textarea
            rows={5}
            value={draft.details}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                details: event.target.value,
              }))
            }
          />
        </label>
        <label className="inline-check">
          <input
            checked={draft.completed}
            type="checkbox"
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                completed: event.target.checked,
              }))
            }
          />
          Completed
        </label>
        <div className="form-actions">
          <Button variant="primary" type="submit" isDisabled={!draft.title.trim()}>
            저장
          </Button>
          {selectedTodo ? (
            <Button
              className="danger-button"
              variant="danger"
              type="button"
              onClick={() => void onDeleteTodo(selectedTodo.id)}
            >
              삭제
            </Button>
          ) : null}
        </div>
      </form>

      {selectedTodo ? (
        <dl className="detail-list">
          <DetailItem label="Todo ID" value={selectedTodo.id} />
          <DetailItem label="Due" value={formatDate(selectedTodo.dueAt)} />
          <DetailItem
            label="Completed"
            value={selectedTodo.completed ? 'Yes' : 'No'}
          />
          <DetailItem label="Created" value={formatDate(selectedTodo.createdAt)} />
          <DetailItem label="Updated" value={formatDate(selectedTodo.updatedAt)} />
        </dl>
      ) : null}

      <label className="inline-check">
        <input
          checked={includeCompletedTodos}
          type="checkbox"
          onChange={(event) => onIncludeCompletedChange(event.target.checked)}
        />
        Show completed
      </label>
    </Card>
  )
}

type TodoDraft = {
  title: string
  dueAt: string
  category: string
  details: string
  completed: boolean
}

function createDraft(todo: TodoItem | null): TodoDraft {
  return {
    title: todo?.title ?? '',
    dueAt: toDateTimeLocalValue(todo?.dueAt),
    category: todo?.category ?? '',
    details: todo?.details ?? '',
    completed: todo?.completed ?? false,
  }
}

function parseDraft(draft: TodoDraft) {
  return {
    title: draft.title.trim(),
    dueAt: draft.dueAt ? new Date(draft.dueAt).toISOString() : undefined,
    category: draft.category.trim() || undefined,
    details: draft.details.trim() || undefined,
    completed: draft.completed,
  }
}

function getTodoMeta(todo: TodoItem): string {
  const status = todo.completed ? 'Done' : 'Open'
  const due = todo.dueAt ? formatDate(todo.dueAt) : 'No due date'
  return `${status} · ${due}`
}

function toDateTimeLocalValue(value?: string): string {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const timezoneOffsetMilliseconds = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - timezoneOffsetMilliseconds)
    .toISOString()
    .slice(0, 16)
}
