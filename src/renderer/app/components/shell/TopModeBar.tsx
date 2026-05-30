import type { WorkspaceMode } from '../../taskFormState'

export type TopModeBarProps = {
  currentMode: WorkspaceMode
  onActions(): void
  onRun(): void
  onSettings(): void
  onTools(): void
  onWorkflows(): void
}

export function TopModeBar({
  currentMode,
  onActions,
  onRun,
  onSettings,
  onTools,
  onWorkflows,
}: TopModeBarProps) {
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
    <nav className="top-mode-bar" aria-label="작업 모드">
      {modes.map((mode) => (
        <button
          aria-label={mode.label}
          className={currentMode === mode.id ? 'is-active' : ''}
          key={mode.id}
          type="button"
          title={mode.label}
          onClick={mode.onClick}
        >
          <span aria-hidden="true">{mode.icon}</span>
          <strong>{mode.label}</strong>
        </button>
      ))}
    </nav>
  )
}
