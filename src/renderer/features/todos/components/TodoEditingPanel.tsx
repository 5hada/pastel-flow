
import { TodoDateField } from './TodoDateField'
import { FormPanel } from '../../../shared/components/FormPanel'
import { AlertDialogButton } from '../../../shared/components/AlertDialogButton'
import {
  CheckboxField,
  FieldGrid,
  TextAreaField,
  TextInputField,
  XButton,
} from '../../../shared/components/HeroForm'
import { TodoDraft } from '../type'
import { DateValue } from '@internationalized/date'
import { TodoItem } from '../../../../shared/todos'
import { FormEvent } from 'react'
import { Button } from '@heroui/react'
import { formatDate } from '../../../shared/utils/viewLabels'



export function TodoEditingPanel({
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
        <XButton onPress={onClose}/>
      </div>

      <form onSubmit={onSubmit}>
        <FormPanel>
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
              label="시간"
              name="todo-due-time"
              type="time"
              value={draft.dueTime}
              onChange={(dueTime) =>
                onDraftChange((currentDraft) => ({
                  ...currentDraft,
                  dueTime,
                }))
              }
            />
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
              <AlertDialogButton onPress={() => void onDeleteTodo(selectedTodo.id)}/>
            ) : null}
          </div>
        </FormPanel>
      </form>

      {selectedTodo ? (
        <dl className="detail-list">
          <DetailCell label="Todo ID" value={selectedTodo.id} />
          <DetailCell label="Due" value={formatDate(selectedTodo.dueAt).value} />
          <DetailCell
            label="Completed"
            value={selectedTodo.completed ? 'Yes' : 'No'}
          />
          <DetailCell label="Created" value={formatDate(selectedTodo.createdAt).value} />
          <DetailCell label="Updated" value={formatDate(selectedTodo.updatedAt).value} />
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


function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}