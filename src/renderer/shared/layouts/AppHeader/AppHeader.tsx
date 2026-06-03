import { getWorkspaceModeLabel } from '../../utils/viewLabels'
import {
  ModeToggles,
  type ModeTogglesProps
} from './ModeToggles'
import {
  InfoLabels ,
  type InfoLabelsProps
} from './InfoLabels'
import { IconButton } from '../../components/IconButton'

export type AppHeaderProps = {
  infoLabelProps: InfoLabelsProps
  modeTogglesProps: ModeTogglesProps
  isLoading: boolean
  onRefresh(): Promise<void>
}

export function AppHeader({
  infoLabelProps,
  modeTogglesProps,
  isLoading,
  onRefresh,
}: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-brand">
        <img className="app-mark" src="/pastel-flow.svg" alt="" aria-hidden="true" />
        <div>
          <h1>Pastel Flow</h1>
          <p>{getWorkspaceModeLabel(modeTogglesProps.currentMode)}</p>
        </div>
      </div>

      <ModeToggles
        currentMode={modeTogglesProps.currentMode}
        onActions={modeTogglesProps.onActions}
        onRun={modeTogglesProps.onRun}
        onSettings={modeTogglesProps.onSettings}
        onTools={modeTogglesProps.onTools}
        onWorkflows={modeTogglesProps.onWorkflows}
      />

      {InfoLabels(infoLabelProps)}

      <IconButton
        aria-label="작업 목록 새로고침"
        className="topbar-button"
        icon={isLoading ? '...' : '↻'}
        isDisabled={isLoading}
        onClick={() => void onRefresh()}
      />
    </header>
  )
}
