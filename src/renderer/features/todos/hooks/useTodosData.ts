import { useState } from 'react'
import type {
  CreateTodoInput,
  TodoItem,
  UpdateTodoInput,
} from '../../../../shared/todos'
import { getErrorMessage } from '../../../shared/utils/viewLabels'
import type { TodosApi } from '../todosApi'

export function useTodosData(
  setErrorMessage: (message: string | null) => void,
) {
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null)
  const [includeCompletedTodos, setIncludeCompletedTodos] = useState(false)

  async function loadTodos(input?: { includeCompleted?: boolean }) {
    const todosApi = getTodosApi()
    if (!todosApi) {
      setTodos([])
      setSelectedTodoId(null)
      return
    }

    try {
      const loadedTodos = await todosApi.list({
        includeCompleted: input?.includeCompleted ?? includeCompletedTodos,
      })
      setTodos(loadedTodos)
      setSelectedTodoId((currentId) =>
        loadedTodos.some((todo) => todo.id === currentId) ? currentId : null,
      )
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function createTodo(input: CreateTodoInput) {
    const todosApi = getTodosApi()
    if (!todosApi) {
      return
    }

    try {
      const todo = await todosApi.create(input)
      setTodos((currentTodos) => [todo, ...currentTodos])
      setSelectedTodoId(todo.id)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function updateTodo(id: string, input: UpdateTodoInput) {
    const todosApi = getTodosApi()
    if (!todosApi) {
      return
    }

    try {
      const todo = await todosApi.update(id, input)
      setTodos((currentTodos) =>
        currentTodos
          .map((currentTodo) => (currentTodo.id === id ? todo : currentTodo))
          .filter((currentTodo) =>
            includeCompletedTodos ? true : !currentTodo.completed,
          ),
      )
      setSelectedTodoId((currentId) =>
        currentId === id && todo.completed && !includeCompletedTodos
          ? null
          : currentId,
      )
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function deleteTodo(id: string) {
    const todosApi = getTodosApi()
    if (!todosApi) {
      return
    }

    try {
      await todosApi.delete(id)
      setTodos((currentTodos) =>
        currentTodos.filter((todo) => todo.id !== id),
      )
      setSelectedTodoId((currentId) => (currentId === id ? null : currentId))
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  return {
    includeCompletedTodos,
    selectedTodoId,
    todos,
    createTodo,
    deleteTodo,
    loadTodos,
    setIncludeCompletedTodos,
    setSelectedTodoId,
    updateTodo,
  }
}

function getTodosApi(): TodosApi | null {
  const todosApi = window.pastelFlow?.todos
  if (
    !todosApi ||
    typeof todosApi.list !== 'function' ||
    typeof todosApi.create !== 'function' ||
    typeof todosApi.update !== 'function' ||
    typeof todosApi.delete !== 'function'
  ) {
    return null
  }

  return todosApi
}
