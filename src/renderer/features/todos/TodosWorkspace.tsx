import type { DateValue } from '@internationalized/date'
import {
  Button,
  Card,
} from '@heroui/react'
import { useEffect, useState, type FormEvent } from 'react'
import type { WorkspaceFolder } from '../../../shared/settings'
import type { TodoItem } from '../../../shared/todos'
import { CollectionListPanel } from '../../shared/components/CollectionListPanel'
import { SelectField } from '../../shared/components/HeroForm'
import { getCommonIcon } from '../../shared/assets/icon'
import { formatDate } from '../../shared/utils/viewLabels'
import { getWorkspaceFolderPathLabel } from '../../shared/utils/workspaceFolderLabels'
import { TodoEditingPanel, TodoStatusChip } from './components'
import { TodoSortMode } from './type'
import { createDraft, formatDueDateValue, parseDraft, parseDueDateValue, sortTodos, todoSortOptions } from './utils'

export type TodosWorkspaceProps = {
  includeCompletedTodos: boolean
  isLoading: boolean
  selectedCollectionFolderId: string
  selectedTodoId: string | null
  sortMode: TodoSortMode
  todos: TodoItem[]
  workspaceFolders: WorkspaceFolder[]
  onCreateTodo(input: {
    title: string
    dueAt?: string
    category?: string
    details?: string
  }): Promise<void>
  onDeleteTodo(id: string): Promise<void>
  onIncludeCompletedChange(value: boolean): void
  onSelectTodo(id: string | null): void
  onSortModeChange(value: TodoSortMode): void
  onUpdateTodo(
    id: string,
    input: Partial<
      Pick<TodoItem, 'title' | 'dueAt' | 'category' | 'details' | 'completed'>
    >,
  ): Promise<void>
}

export function TodosWorkspace({
  includeCompletedTodos,
  isLoading,
  onCreateTodo,
  onDeleteTodo,
  onIncludeCompletedChange,
  onSelectTodo,
  onSortModeChange,
  onUpdateTodo,
  selectedTodoId,
  sortMode,
  selectedCollectionFolderId,
  todos,
  workspaceFolders,
}: TodosWorkspaceProps) {
  const selectedTodo = todos.find((todo) => todo.id === selectedTodoId) ?? null
  const sortedTodos = sortTodos(todos, sortMode)
  const [isCreating, setIsCreating] = useState(false)
  const [draft, setDraft] = useState(createDraft(selectedTodo))
  const [selectedDate, setSelectedDate] = useState<DateValue | null>(
    parseDueDateValue(draft.dueAt),
  )

  useEffect(() => {
    const nextDraft = createDraft(selectedTodo)
    setDraft(nextDraft)
    setSelectedDate(parseDueDateValue(nextDraft.dueAt))
    if (selectedTodo) {
      setIsCreating(false)
    }
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
    setIsCreating(false)
    onSelectTodo(null)
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
        folderLabel={getWorkspaceFolderPathLabel(
          selectedCollectionFolderId,
          workspaceFolders,
        )}
        headerAction={
          <div className="section-actions justify-center">
            <SelectField
              label=''
              options={todoSortOptions}
              selectedKey={sortMode}
              onChange={onSortModeChange}
            />
            <Button
              aria-label="Todo 추가"
              isIconOnly
              variant="ghost"
              type="button"
              onClick={() => {
                onSelectTodo(null)
                setDraft(createDraft(null))
                setSelectedDate(null)
                setIsCreating(true)
              }}
            >
              {getCommonIcon('add')}
            </Button>
          </div>
        }
        items={sortedTodos.map((todo) => ({
          id: todo.id,
          title: todo.title,
          meta: <TodoStatusChip todo={todo} />,
          status: todo.dueAt ? (
            <div className="grid w-fit grid-cols-2 gap-x-2">
              <span className="min-w-18 text-sm">{formatDate(todo.dueAt).date}</span>
              <span className="min-w-12 text-sm">{formatDate(todo.dueAt).time}</span>
            </div>
          ) : null,
          message: todo.details ?? todo.category ?? '',
        }))}
        title="Todo 목록"
        onEdit={(todoId) => {
          setIsCreating(false)
          onSelectTodo(todoId)
        }}
      />
    )
  }

  return (
    <Card className="mode-panel" aria-label="Todo 편집">
      <TodoEditingPanel
        draft={draft}
        includeCompletedTodos={includeCompletedTodos}
        selectedDate={selectedDate}
        selectedTodo={selectedTodo}
        onClose={() => {
          setIsCreating(false)
          onSelectTodo(null)
        }}
        onDateChange={(date) => {
          setSelectedDate(date)
          setDraft((currentDraft) => ({
            ...currentDraft,
            dueAt: formatDueDateValue(date),
          }))
        }}
        onDeleteTodo={onDeleteTodo}
        onDraftChange={setDraft}
        onIncludeCompletedChange={onIncludeCompletedChange}
        onSubmit={handleSubmit}
      />
    </Card>
  )
}
