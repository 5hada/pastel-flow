import { Button, ButtonGroup } from '@heroui/react'
import type { WorkspaceMode } from '../../state/taskFormState'

export type ModeTogglesProps = {
  currentMode: WorkspaceMode
  onRun(): void
  onActions(): void
  onWorkflows(): void
  onTools(): void
  onSettings(): void
}

export function ModeToggles({
  currentMode,
  onActions,
  onRun,
  onSettings,
  onTools,
  onWorkflows,
}: ModeTogglesProps) {
  const modes: {
    id: WorkspaceMode
    icon: string
    label: string
    onClick(): void
  }[] = [
    { id: 'run', icon: '▶', label: '실행', onClick: onRun },
    { id: 'actions', icon: '◆', label: 'Action', onClick: onActions },
    { id: 'workflows', icon: '▦', label: 'Workflow', onClick: onWorkflows },
    { id: 'tools', icon: '◇', label: '도구', onClick: onTools },
    { id: 'settings', icon: '⚙', label: '설정', onClick: onSettings },
  ]

  return (
    <ButtonGroup
      aria-label="작업 모드"
      className="top-mode-bar"
      size="sm"
      variant="ghost"
    >
      {modes.map((mode) => (
        <Button
          aria-label={mode.label}
          className={currentMode === mode.id ? 'is-active' : ''}
          variant={currentMode === mode.id ? 'secondary' : 'ghost'}
          key={mode.id}
          type="button"
          onClick={mode.onClick}
        >
          <span aria-hidden="true">{mode.icon}</span>
          <strong>{mode.label}</strong>
        </Button>
      ))}
    </ButtonGroup>
  )
}
