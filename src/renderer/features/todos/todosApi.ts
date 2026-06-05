import type {
  CreateTodoInput,
  TodoItem,
  UpdateTodoInput,
} from '../../../shared/todos'

export type TodosApi = {
  list(input?: ListTodosInput): Promise<TodoItem[]>
  create(input: CreateTodoInput): Promise<TodoItem>
  update(id: string, input: UpdateTodoInput): Promise<TodoItem>
  delete(id: string): Promise<void>
}

export type ListTodosInput = {
  includeCompleted?: boolean
  includeDeleted?: boolean
}
