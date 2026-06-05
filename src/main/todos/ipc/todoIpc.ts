import type { IpcMain } from 'electron'
import { ipcRequestChannels } from '../../../shared/ipcChannels'
import type { CreateTodoInput, UpdateTodoInput } from '../../../shared/todos'
import type { TodoStore } from '../store/todoStore'

export function registerTodoIpc(
  ipcMain: IpcMain,
  todoStore: TodoStore,
): void {
  ipcMain.handle(ipcRequestChannels.todos.list, (_event, input) =>
    todoStore.listTodos(assertListTodosInput(input)),
  )
  ipcMain.handle(ipcRequestChannels.todos.create, (_event, input) =>
    todoStore.createTodo(assertCreateTodoInput(input)),
  )
  ipcMain.handle(ipcRequestChannels.todos.update, (_event, id, input) =>
    todoStore.updateTodo(
      assertString(id, 'Todo ID'),
      assertUpdateTodoInput(input),
    ),
  )
  ipcMain.handle(ipcRequestChannels.todos.delete, (_event, id) =>
    todoStore.deleteTodo(assertString(id, 'Todo ID')),
  )
}

function assertListTodosInput(value: unknown): {
  includeCompleted?: boolean
  includeDeleted?: boolean
} {
  const input = isRecord(value) ? value : {}

  return {
    includeCompleted: input.includeCompleted === true,
    includeDeleted: input.includeDeleted === true,
  }
}

function assertCreateTodoInput(value: unknown): CreateTodoInput {
  const input = assertRecord(value, 'Todo create input')
  if (typeof input.title !== 'string' || !input.title.trim()) {
    throw new Error('Todo title is required.')
  }

  return input as CreateTodoInput
}

function assertUpdateTodoInput(value: unknown): UpdateTodoInput {
  return assertRecord(value, 'Todo update input') as UpdateTodoInput
}

function assertRecord(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`)
  }

  return value
}

function assertString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} is required.`)
  }

  return value.trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
