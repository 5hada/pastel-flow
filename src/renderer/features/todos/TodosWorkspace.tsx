import type { DateValue } from '@internationalized/date'

import { parseDate } from '@internationalized/date'
import {
  Button,
  Calendar,
  Card,
  DateField,
  DatePicker,
  Label,
} from '@heroui/react'
import { useEffect, useState, type FormEvent } from 'react'
import type { WorkspaceFolder } from '../../../shared/settings'
import type { TodoItem } from '../../../shared/todos'
import { CollectionListPanel } from '../../shared/components/CollectionListPanel'
import {
  CheckboxField,
  FieldGrid,
  TextAreaField,
  TextInputField,
} from '../../shared/components/HeroForm'
import { getCommonIcon } from '../../shared/assets/icon'
import { formatDate } from '../../shared/utils/viewLabels'
import { getWorkspaceFolderPathLabel } from '../../shared/utils/workspaceFolderLabels'

export type TodosWorkspaceProps = {
  includeCompletedTodos: boolean
  isLoading: boolean
  selectedCollectionFolderId: string
  selectedTodoId: string | null
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
  selectedCollectionFolderId,
  todos,
  workspaceFolders,
}: TodosWorkspaceProps) {
  const selectedTodo = todos.find((todo) => todo.id === selectedTodoId) ?? null
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
        }
        items={todos.map((todo) => ({
          id: todo.id,
          title: todo.title,
          meta: getTodoMeta(todo),
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
      <TodoSidePanel
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

function TodoSidePanel({
  draft,
  includeCompletedTodos,
  onClose,
  onDateChange,
  onDeleteTodo,
  onDraftChange,
  onIncludeCompletedChange,
  onSubmit,
  selectedDate,
  selectedTodo,
}: {
  draft: TodoDraft
  includeCompletedTodos: boolean
  selectedDate: DateValue | null
  selectedTodo: TodoItem | null
  onClose(): void
  onDateChange(date: DateValue | null): void
  onDeleteTodo(id: string): Promise<void>
  onDraftChange(value: TodoDraft | ((currentDraft: TodoDraft) => TodoDraft)): void
  onIncludeCompletedChange(value: boolean): void
  onSubmit(event: FormEvent<HTMLFormElement>): void
}) {
  return (
    <div className="editor-detail" aria-label="Todo 편집">
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
          onClick={onClose}
        >
          {getCommonIcon('close')}
        </Button>
      </div>

      <form className="task-form" onSubmit={onSubmit}>
        <TextInputField
          label="Title"
          name="todo-title"
          value={draft.title}
          onChange={(value) =>
            onDraftChange((currentDraft) => ({
              ...currentDraft,
              title: value,
            }))
          }
        />
        <FieldGrid>
          <TodoDateField value={selectedDate} onChange={onDateChange} />
          <TextInputField
            label="Category"
            name="todo-category"
            value={draft.category}
            onChange={(value) =>
              onDraftChange((currentDraft) => ({
                ...currentDraft,
                category: value,
              }))
            }
          />
        </FieldGrid>
        <TextAreaField
          label="Details"
          name="todo-details"
          rows={5}
          value={draft.details}
          onChange={(value) =>
            onDraftChange((currentDraft) => ({
              ...currentDraft,
              details: value,
            }))
          }
        />
        <CheckboxField
          isSelected={draft.completed}
          label="Completed"
          onChange={(isSelected) =>
            onDraftChange((currentDraft) => ({
              ...currentDraft,
              completed: isSelected,
            }))
          }
        />
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
          <DetailCell label="Todo ID" value={selectedTodo.id} />
          <DetailCell label="Due" value={formatDate(selectedTodo.dueAt)} />
          <DetailCell
            label="Completed"
            value={selectedTodo.completed ? 'Yes' : 'No'}
          />
          <DetailCell label="Created" value={formatDate(selectedTodo.createdAt)} />
          <DetailCell label="Updated" value={formatDate(selectedTodo.updatedAt)} />
        </dl>
      ) : null}

      <CheckboxField
        isSelected={includeCompletedTodos}
        label="Show completed"
        onChange={onIncludeCompletedChange}
      />
    </div>
  )
}

function TodoDateField({
  value,
  onChange,
}: {
  value: DateValue | null
  onChange(date: DateValue | null): void
}) {
  return (
    <DatePicker className="w-60" value={value} onChange={onChange}>
      <Label>Due</Label>
      <DateField.Group fullWidth>
        <DateField.Input>
          {(segment) => <DateField.Segment segment={segment} />}
        </DateField.Input>
        <DateField.Suffix>
          <DatePicker.Trigger>
            <DatePicker.TriggerIndicator />
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <DatePicker.Popover className="flex">
        <Calendar aria-label="Event date">
          <Calendar.Header>
            <Calendar.YearPickerTrigger>
              <Calendar.YearPickerTriggerHeading />
              <Calendar.YearPickerTriggerIndicator />
            </Calendar.YearPickerTrigger>
            <Calendar.NavButton slot="previous" />
            <Calendar.NavButton slot="next" />
          </Calendar.Header>
          <Calendar.Grid>
            <Calendar.GridHeader>
              {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
            </Calendar.GridHeader>
            <Calendar.GridBody>
              {(date) => <Calendar.Cell date={date} />}
            </Calendar.GridBody>
          </Calendar.Grid>
          <Calendar.YearPickerGrid>
            <Calendar.YearPickerGridBody>
              {({ year }) => <Calendar.YearPickerCell year={year} />}
            </Calendar.YearPickerGridBody>
          </Calendar.YearPickerGrid>
        </Calendar>
      </DatePicker.Popover>
    </DatePicker>
  )
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
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
    dueAt: todo?.dueAt ?? '',
    category: todo?.category ?? '',
    details: todo?.details ?? '',
    completed: todo?.completed ?? false,
  }
}

function parseDraft(draft: TodoDraft) {
  return {
    title: draft.title.trim(),
    dueAt: draft.dueAt ? draft.dueAt : undefined,
    category: draft.category.trim() || undefined,
    details: draft.details.trim() || undefined,
    completed: draft.completed,
  }
}

function parseDueDateValue(dueAt: string): DateValue | null {
  const date = dueAt.trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null
  }

  try {
    return parseDate(date)
  } catch {
    return null
  }
}

function formatDueDateValue(date: DateValue | null): string {
  return date?.toString() ?? ''
}

function getTodoMeta(todo: TodoItem): string {
  const status = todo.completed ? 'Done' : 'Open'
  const due = todo.dueAt ? formatDate(todo.dueAt) : 'No due date'
  return `${status} · ${due}`
}
