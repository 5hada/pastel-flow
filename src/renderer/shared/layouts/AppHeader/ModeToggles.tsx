import { Button, ButtonGroup } from '@heroui/react'
import { getCommonIcon } from '../../assets/icon';
import type { ReactNode } from 'react'
import type { WorkspaceMode } from '../../state/taskFormState'

export type ModeTogglesProps = {
  currentMode: WorkspaceMode
  onRun(): void
  onActions(): void
  onWorkflows(): void
  onUrlGroups(): void
  onTodos(): void
  onTools(): void
  onSettings(): void
}

export function ModeToggles({
  currentMode,
  onActions,
  onRun,
  onSettings,
  onTodos,
  onTools,
  onUrlGroups,
  onWorkflows,
}: ModeTogglesProps) {
  const modes: {
    id: WorkspaceMode
    icon: ReactNode
    label: string
    onClick(): void
  }[] = [
    { id: 'run', icon: getCommonIcon('run'), label: '실행', onClick: onRun },
    { id: 'actions', icon: getCommonIcon('actions'), label: 'Action', onClick: onActions },
    { id: 'workflows', icon: getCommonIcon('workflows'), label: 'Workflow', onClick: onWorkflows },
    { id: 'urlGroups', icon: getCommonIcon('urlGroups'), label: 'URLs', onClick: onUrlGroups },
    { id: 'todos', icon: getCommonIcon('todos'), label: 'Todo', onClick: onTodos },
    { id: 'tools', icon: getCommonIcon('tools'), label: '도구', onClick: onTools },
    { id: 'settings', icon: getCommonIcon('settings'), label: '설정', onClick: onSettings },
  ]

  return (
    <ButtonGroup
      aria-label="작업 모드"
      className="top-mode-bar"
      size="sm"
      variant="ghost"
    >
      {modes.map((mode) => (
        <Button fullWidth
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
