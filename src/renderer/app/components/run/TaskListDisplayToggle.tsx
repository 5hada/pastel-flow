import type { TaskListDisplayMode } from '../../../../shared/settings'

export type TaskListDisplayToggleProps = {
  value: TaskListDisplayMode
  onChange(value: TaskListDisplayMode): void
}

export function TaskListDisplayToggle({
  onChange,
  value,
}: TaskListDisplayToggleProps) {
  return (
    <div className="display-toggle" aria-label="목록 표시 형식">
      {(['grid', 'list'] as TaskListDisplayMode[]).map((displayMode) => (
        <button
          aria-label={displayMode === 'grid' ? '그리드 형식' : '목록 형식'}
          className={value === displayMode ? 'is-active' : ''}
          key={displayMode}
          type="button"
          title={displayMode === 'grid' ? '그리드' : '목록'}
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
        </button>
      ))}
    </div>
  )
}
