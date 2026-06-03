import type { WorkflowListDisplayMode } from '../../../shared/settings'
import { SegmentedControl } from '../../shared/components/SegmentedControl'

export type TaskListDisplayToggleProps = {
  value: WorkflowListDisplayMode
  onChange(value: WorkflowListDisplayMode): void
}

export function TaskListDisplayToggle({
  onChange,
  value,
}: TaskListDisplayToggleProps) {
  return (
    <SegmentedControl
      ariaLabel="목록 표시 형식"
      options={(['grid', 'list'] as WorkflowListDisplayMode[]).map(
        (displayMode) => ({
          ariaLabel: displayMode === 'grid' ? '그리드 형식' : '목록 형식',
          content: (
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
          ),
          value: displayMode,
        }),
      )}
      value={value}
      onChange={onChange}
    />
  )
}
