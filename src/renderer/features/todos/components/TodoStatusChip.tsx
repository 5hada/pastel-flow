import { Chip } from "@heroui/react"
import { TodoItem } from "../../../../shared/todos"

export function TodoStatusChip({ todo }: { todo: TodoItem }) {
  return (
    <Chip
      color={todo.completed ? 'accent' : 'warning'}
      size="sm"
      variant="soft"
      className=''
    >
      <Chip.Label>{todo.completed ? 'Done' : 'Open'}</Chip.Label>
    </Chip>
  )
}