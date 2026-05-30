import type { WorkspaceMode } from '../../taskFormState'
import { getWorkspaceModeLabel } from '../../utils/viewLabels'
import { TopModeBar } from './TopModeBar'

export type AppHeaderProps = {
  actionCount: number
  currentMode: WorkspaceMode
  isLoading: boolean
  toolCount: number
  workflowCount: number
  onActions(): void
  onRefresh(): Promise<void>
  onRun(): void
  onSettings(): void
  onTools(): void
  onWorkflows(): void
}

export function AppHeader({
  actionCount,
  currentMode,
  isLoading,
  onActions,
  onRefresh,
  onRun,
  onSettings,
  onTools,
  onWorkflows,
  toolCount,
  workflowCount,
}: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-brand">
        <img className="app-mark" src="/pastel-flow.svg" alt="" aria-hidden="true" />
        <div>
          <h1>Pastel Flow</h1>
          <p>{getWorkspaceModeLabel(currentMode)}</p>
        </div>
      </div>

      <TopModeBar
        currentMode={currentMode}
        onActions={onActions}
        onRun={onRun}
        onSettings={onSettings}
        onTools={onTools}
        onWorkflows={onWorkflows}
      />

      <div className="app-header-meta" aria-label="작업 공간 요약">
        <span>Workflow {workflowCount}</span>
        <span>Action {actionCount}</span>
        <span>Tool {toolCount}</span>
      </div>

      <button
        aria-label="작업 목록 새로고침"
        className="topbar-button"
        type="button"
        disabled={isLoading}
        title="새로고침"
        onClick={() => void onRefresh()}
      >
        {isLoading ? '...' : '↻'}
      </button>
    </header>
  )
}
