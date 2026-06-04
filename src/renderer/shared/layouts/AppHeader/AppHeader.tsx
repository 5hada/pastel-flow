import { Button } from '@heroui/react'
import {ArrowRotateRight} from '@gravity-ui/icons';
import { getWorkspaceModeLabel } from '../../utils/viewLabels'
import {
  ModeToggles,
  type ModeTogglesProps
} from './ModeToggles'
import {
  InfoLabels ,
  type InfoLabelsProps
} from './InfoLabels'

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

      <Button
        aria-label="작업 목록 새로고침"
        className="topbar-button"
        isIconOnly
        isDisabled={isLoading}
        variant="ghost"
        onClick={() => void onRefresh()}
      >
        {isLoading ? '...' : <ArrowRotateRight/>}
      </Button>
    </header>
  )
}
