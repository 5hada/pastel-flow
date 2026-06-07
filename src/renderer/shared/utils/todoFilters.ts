import type { TodoItem } from '../../../shared/todos'
import type { NavigationCategory } from '../state/taskFormState'

const dueSoonWindowDays = 7

export function filterTodosByCategory(
  todos: TodoItem[],
  category: NavigationCategory,
): TodoItem[] {
  if (category !== 'due_soon') {
    return todos
  }

  return todos.filter(isTodoDueSoon)
}

export function isTodoDueSoon(todo: TodoItem): boolean {
  if (todo.completed || !todo.dueAt) {
    return false
  }

  const dueTime = getTodoDateTime(todo.dueAt)
  if (!Number.isFinite(dueTime)) {
    return false
  }

  return dueTime <= getDueSoonWindowEndTime()
}

function getTodoDateTime(value: string): number {
  const date = value.trim().slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number)
    return new Date(year, month - 1, day).getTime()
  }

  const time = Date.parse(value)
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time
}

function getDueSoonWindowEndTime(): number {
  const windowEnd = new Date()
  windowEnd.setDate(windowEnd.getDate() + dueSoonWindowDays)
  windowEnd.setHours(23, 59, 59, 999)
  return windowEnd.getTime()
}
