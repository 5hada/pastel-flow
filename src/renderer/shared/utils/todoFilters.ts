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

  const dueTime = Date.parse(todo.dueAt)
  if (Number.isNaN(dueTime)) {
    return false
  }

  return dueTime <= getDueSoonWindowEndTime()
}

function getDueSoonWindowEndTime(): number {
  const windowEnd = new Date()
  windowEnd.setDate(windowEnd.getDate() + dueSoonWindowDays)
  windowEnd.setHours(23, 59, 59, 999)
  return windowEnd.getTime()
}
