import { Input, Label, ListBox, Select } from '@heroui/react'
import { useState } from 'react'
import type { RunStatus, WorkflowRunEvent } from '../../../../shared/runStatus'
import { formatDate, getTaskStatusLabel } from '../../../shared/utils/viewLabels'

export type WorkflowRunEventsPanelProps = {
  events: WorkflowRunEvent[]
}

export function WorkflowRunEventsPanel({ events }: WorkflowRunEventsPanelProps) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<RunStatus | 'all'>(
    'all',
  )
  const filteredEvents = events.filter((event) => {
    const matchesStatus =
      statusFilter === 'all' || event.status === statusFilter
    const normalizedQuery = query.trim().toLowerCase()
    const matchesQuery =
      !normalizedQuery ||
      (event.message ?? '').toLowerCase().includes(normalizedQuery) ||
      (event.deviceId ?? '').toLowerCase().includes(normalizedQuery)

    return matchesStatus && matchesQuery
  })

  return (
    <section className="run-events" aria-label="최근 실행 이벤트">
      <h3>최근 실행 이벤트</h3>
      <div className="run-event-filters">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="이벤트 검색"
        />
        <Select
          selectedKey={statusFilter}
          onSelectionChange={(key) =>
            setStatusFilter(String(key) as RunStatus | 'all')
          }
        >
          <Label>상태</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="all" textValue="전체 상태">
                전체 상태
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="running" textValue="실행 중">
                실행 중
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="idle" textValue="대기">
                대기
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="failed" textValue="실패">
                실패
                <ListBox.ItemIndicator />
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
      </div>
      {filteredEvents.length === 0 ? (
        <p className="muted-text">아직 실행 이벤트가 없습니다.</p>
      ) : (
        <div className="run-event-list">
          {filteredEvents.slice(0, 8).map((event) => (
            <div className="run-event-row" key={event.id || event.createdAt}>
              <span className={`status-pill status-${event.status}`}>
                {getTaskStatusLabel(event.status)}
              </span>
              <div>
                <strong>{event.message ?? '상태 변경'}</strong>
                <small>{formatDate(event.createdAt).value}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
