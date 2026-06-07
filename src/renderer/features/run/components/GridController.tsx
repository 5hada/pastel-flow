import { PressEvent, Button } from "@heroui/react"
import { WorkflowListDisplayMode } from "../../../../shared/settings"

export function GridController({
  displayMode,
  gridColumnCount,
  isGridMode,
  onDisplayModeChange,
  onGridColumnCountChange,
}: {
  displayMode:WorkflowListDisplayMode
  gridColumnCount:number
  isGridMode:boolean
  onDisplayModeChange(value: WorkflowListDisplayMode): void
  onGridColumnCountChange(columnCount: number): Promise<void>
}) {
  const columnUp = (() =>void onGridColumnCountChange(Math.min(8, gridColumnCount + 1)))
  const columnDown = (() =>void onGridColumnCountChange(Math.max(2, gridColumnCount - 1)))
  
  return (
    <div className="section-actions">
      {isGridMode ? 
        <GridColumnController
          gridColumnCount={gridColumnCount}
          columnDown={columnDown}
          columnUp={columnUp}
        />
      : null}
      <TaskListDisplayToggle
        value={displayMode}
        onPress={onDisplayModeChange}
      />
    </div>
  )
}

export function GridColumnController({
  gridColumnCount,
  columnDown,
  columnUp,
}: {
  gridColumnCount: number
  columnDown(event: PressEvent): void
  columnUp(event: PressEvent): void
}) {
  return (
            <div aria-label="그리드 열 수" className="grid-column-stepper">
              <Button
                aria-label="그리드 열 수 줄이기"
                isDisabled={gridColumnCount <= 2}
                isIconOnly
                variant="ghost"
                onPress={columnDown}
              >
                -
              </Button>
              <span aria-label={`${gridColumnCount}열`}>{gridColumnCount}</span>
              <Button
                aria-label="그리드 열 수 늘리기"
                isDisabled={gridColumnCount >= 8}
                isIconOnly
                variant="ghost"
                onPress={columnUp}
              >
                +
              </Button>
            </div>
  )
}

export type TaskListDisplayToggleProps = {
  value: WorkflowListDisplayMode
  onPress(value: WorkflowListDisplayMode): void
}

export function TaskListDisplayToggle({
  value,
  onPress,
}: TaskListDisplayToggleProps) {
  return (
    <div aria-label="목록 표시 형식" className="display-toggle">
      {(['grid', 'list'] as WorkflowListDisplayMode[]).map((displayMode) => (
        <Button
          aria-label={displayMode === 'grid' ? '그리드 형식' : '목록 형식'}
          className={value === displayMode ? 'is-active' : ''}
          isIconOnly
          key={displayMode}
          variant="ghost"
          onPress={() => onPress(displayMode)}
        >
          <span
            aria-hidden="true"
            className={
              displayMode === 'grid' ? 'display-icon-grid' : 'display-icon-list'
            }
          >
            {displayMode === 'grid' ? (
              <>
                {Array.from({ length: 9 }, (_, index) => (
                  <i key={index} />
                ))}
              </>
            ) : (
              <>
                <i />
                <i />
                <i />
              </>
            )}
          </span>
        </Button>
      ))}
    </div>
  )
}
