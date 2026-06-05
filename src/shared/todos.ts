export type TodoItem = {
  id: string
  title: string
  dueAt?: string
  category?: string
  details?: string
  completed: boolean
  completedAt?: string
  deletedAt?: string
  createdAt: string
  updatedAt: string
}

export type CreateTodoInput = {
  title: string
  dueAt?: string
  category?: string
  details?: string
}

export type UpdateTodoInput = Partial<
  Pick<TodoItem, 'title' | 'dueAt' | 'category' | 'details' | 'completed'>
>
