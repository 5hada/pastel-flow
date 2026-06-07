
export type TodoDraft = {
  title: string
  dueAt: string
  dueTime: string
  category: string
  details: string
  completed: boolean
}
export type TodoSortMode = 'created' | 'dueSoon' | 'reverse'