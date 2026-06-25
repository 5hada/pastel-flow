import type { ReactNode } from 'react'
import { Button, ButtonGroup } from '@heroui/react'
import { getCommonIcon } from '../../assets/icon'
import type { WorkspaceMode } from '../../state/taskFormState'

export type ModeTogglesProps = {
  currentMode: WorkspaceMode
  onRun(): void
  onActions(): void
  onWorkflows(): void
  onUrlGroups(): void
  onScraps(): void
  onTodos(): void
  onTools(): void
  onSettings(): void
}

export function ModeToggles({
  currentMode,
  onActions,
  onRun,
  onSettings,
  onScraps,
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
    { id: 'scraps', icon: getCommonIcon('scraps'), label: 'Scraps', onClick: onScraps },
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
        <Button
          aria-label={mode.label}
          className="px-2"
          fullWidth
          key={mode.id}
          size="sm"
          type="button"
          variant={currentMode === mode.id ? 'secondary' : 'ghost'}
          onPress={mode.onClick}
        >
          <span aria-hidden="true">{mode.icon}</span>
          <strong>{mode.label}</strong>
        </Button>
      ))}
    </ButtonGroup>
  )
}
