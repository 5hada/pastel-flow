import { Button } from '@heroui/react'
import type { WorkflowListDisplayMode } from '../../../shared/settings'

export type TaskListDisplayToggleProps = {
  value: WorkflowListDisplayMode
  onChange(value: WorkflowListDisplayMode): void
}

export function TaskListDisplayToggle({
  onChange,
  value,
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
          onClick={() => onChange(displayMode)}
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
