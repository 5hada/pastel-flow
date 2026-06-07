import { Button, Chip } from "@heroui/react"
import { ReactNode } from "react"


export function FolderButton({
  count,
  icon,
  iconSelected,
  id,
  isSelected,
  label,
  onSelect,
}: {
  count?: number
  icon: ReactNode
  iconSelected?: ReactNode
  id: string
  isSelected: boolean
  label: string
  onSelect(id: string): void
}) {
  return (
    <Button
      fullWidth
      className="sidebar-row"
      variant={isSelected ? 'secondary' : 'ghost'}
      type="button"
      onClick={() => onSelect(id)}
    >
      <span aria-hidden="true">{isSelected ? icon : iconSelected ?? icon}</span>
      <strong>{label}</strong>
      <Chip size="sm" variant='tertiary'>
        <Chip.Label>{count}</Chip.Label>
      </Chip>
    </Button>
  )
}