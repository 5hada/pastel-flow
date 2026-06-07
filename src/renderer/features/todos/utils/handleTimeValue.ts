import {
    parseDate,
    type DateValue
} from "@internationalized/date"
import type { TodoDraft, TodoSortMode } from "../type"
import type { TodoItem } from "../../../../shared/todos"

export const todoSortOptions: Array<{
  value: TodoSortMode
  label: string
}> = [
  { value: 'created', label: '추가순' },
  { value: 'dueSoon', label: '임박순' },
  { value: 'reverse', label: '과거순' },
]

export function createDraft(todo: TodoItem | null): TodoDraft {
  const dueAt = todo?.dueAt ?? getTodayDateString()

  return {
    title: todo?.title ?? '',
    dueAt,
    dueTime: parseDueTimeValue(todo?.dueAt),
    category: todo?.category ?? '',
    details: todo?.details ?? '',
    completed: todo?.completed ?? false,
  }
}

export function parseDraft(draft: TodoDraft) {
  return {
    title: draft.title.trim(),
    dueAt: formatTodoDueAt(draft.dueAt, draft.dueTime),
    category: draft.category.trim() || undefined,
    details: draft.details.trim() || undefined,
    completed: draft.completed,
  }
}

export function sortTodos(todos: TodoItem[], sortMode: TodoSortMode): TodoItem[] {
  const sortedTodos = [...todos]

  if (sortMode === 'dueSoon') {
    return sortedTodos.sort((left, right) => {
      const leftDueTime = getTodoDateTime(left.dueAt)
      const rightDueTime = getTodoDateTime(right.dueAt)

      if (leftDueTime !== rightDueTime) {
        return leftDueTime - rightDueTime
      }

      return getTodoDateTime(left.createdAt) - getTodoDateTime(right.createdAt)
    })
  }

  sortedTodos.sort(
    (left, right) =>
      getTodoDateTime(left.createdAt) - getTodoDateTime(right.createdAt),
  )

  return sortMode === 'reverse' ? sortedTodos.reverse() : sortedTodos
}

function getTodoDateTime(value?: string): number {
  if (!value) {
    return Number.POSITIVE_INFINITY
  }

  const date = value.trim().slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number)
    return new Date(year, month - 1, day).getTime()
  }

  const time = Date.parse(value)
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time
}

export function parseDueDateValue(dueAt: string): DateValue | null {
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

export function formatDueDateValue(date: DateValue | null): string {
  return date?.toString() ?? getTodayDateString()
}

function parseDueTimeValue(dueAt?: string): string {
  const time = dueAt?.match(/T(\d{2}:\d{2})/)?.[1]
  return time ?? ''
}

function formatTodoDueAt(dueAt: string, dueTime: string): string {
  const date = dueAt.trim().slice(0, 10) || getTodayDateString()
  const time = dueTime.trim()

  return time ? `${date}T${time}:00` : date
}

function getTodayDateString(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}