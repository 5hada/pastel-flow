import { Button, Card } from '@heroui/react'
import type { CSSProperties } from 'react'
import type { WorkflowListDisplayMode } from '../../../../shared/settings'
import { GridController } from './GridController'
import { LaunchPanel, LaunchPanelProps } from './LaunchPanel'

export type RunWorkspaceProps = {
  categoryLabel: string
  gridColumnCount: number
  isLoading: boolean
  launchPanelProps: LaunchPanelProps
  onCreate(): void
  onDisplayModeChange(displayMode: WorkflowListDisplayMode): Promise<void>
  onGridColumnCountChange(columnCount: number): Promise<void>
}



export function RunWorkspaceLayout({
  categoryLabel,
  gridColumnCount,
  isLoading,
  launchPanelProps,
  onCreate,
  onDisplayModeChange,
  onGridColumnCountChange,
}: RunWorkspaceProps) {
  const isGridMode = launchPanelProps.displayMode === 'grid'
  return (
    <Card className="task-section launch-section" aria-label="Workflow 실행">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{categoryLabel}</p>
          <h2>실행할 Workflow</h2>
        </div>
        <GridController
          displayMode={launchPanelProps.displayMode}
          gridColumnCount={gridColumnCount}
          isGridMode={isGridMode}
          onDisplayModeChange={onDisplayModeChange}
          onGridColumnCountChange={onGridColumnCountChange}
        />
      </div>

      {isLoading ? (
        <p className="empty-state">작업을 불러오는 중입니다.</p>
      ) : launchPanelProps.workflows.length === 0 ? (
        <div className="empty-state empty-state-action">
          <p>아직 저장된 Workflow가 없습니다.</p>
          <Button variant="primary" type="button" onClick={onCreate}>
            Workflow 만들기
          </Button>
        </div>
      ) : (
        <div
          className="task-list workflow-grouped-list"
          style={
            isGridMode
              ? ({
                  '--workflow-grid-columns': gridColumnCount,
                } as CSSProperties)
              : undefined
          }
        >
          <LaunchPanel {...launchPanelProps} />
        </div>
      )}
    </Card>
  )
}