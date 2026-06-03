import { useState } from 'react'
import type { TaskRunEvent, TaskRunEventStatus } from '../../../../shared/taskRunEvents'
import { formatDate, getTaskStatusLabel } from '../../../shared/utils/viewLabels'

export type TaskRunEventsPanelProps = {
  events: TaskRunEvent[]
}

export function TaskRunEventsPanel({ events }: TaskRunEventsPanelProps) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskRunEventStatus | 'all'>(
    'all',
  )
  const filteredEvents = events.filter((event) => {
    const matchesStatus =
      statusFilter === 'all' || event.status === statusFilter
    const normalizedQuery = query.trim().toLowerCase()
    const matchesQuery =
      !normalizedQuery ||
      (event.message ?? '').toLowerCase().includes(normalizedQuery) ||
      event.deviceId.toLowerCase().includes(normalizedQuery)

    return matchesStatus && matchesQuery
  })

  return (
    <section className="run-events" aria-label="최근 실행 이벤트">
      <h3>최근 실행 이벤트</h3>
      <div className="run-event-filters">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="이벤트 검색"
        />
        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as TaskRunEventStatus | 'all')
          }
        >
          <option value="all">전체 상태</option>
          <option value="running">실행 중</option>
          <option value="idle">대기</option>
          <option value="failed">실패</option>
        </select>
      </div>
      {filteredEvents.length === 0 ? (
        <p className="muted-text">아직 실행 이벤트가 없습니다.</p>
      ) : (
        <div className="run-event-list">
          {filteredEvents.slice(0, 8).map((event) => (
            <div className="run-event-row" key={event.id}>
              <span className={`status-pill status-${event.status}`}>
                {getTaskStatusLabel(event.status)}
              </span>
              <div>
                <strong>{event.message ?? '상태 변경'}</strong>
                <small>{formatDate(event.createdAt)}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
