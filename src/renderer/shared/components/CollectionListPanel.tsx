import { Button, Card, Chip } from '@heroui/react'
import type { ReactNode } from 'react'

export type CollectionListItem = {
  id: string
  title: string
  meta?: ReactNode
  status?: ReactNode
  message?: ReactNode
}

export type CollectionListPanelProps = {
  emptyAction?: ReactNode
  emptyText: string
  eyebrow: string
  folderLabel?: ReactNode
  headerAction?: ReactNode
  isFramed?: boolean
  items: CollectionListItem[]
  itemActionLabel?: string
  title: string
  onEdit(id: string): void
}

export function CollectionListPanel({
  emptyAction,
  emptyText,
  folderLabel,
  headerAction,
  eyebrow,
  isFramed = true,
  items,
  itemActionLabel = '수정',
  onEdit,
  title,
}: CollectionListPanelProps) {
  const Wrapper = isFramed ? Card : 'div'

  return (
    <Wrapper
      aria-label={title}
      className={isFramed ? 'mode-panel collection-list-panel' : 'collection-list-panel'}
    >
      <div className="panel-heading">
        <p className="eyebrow">{eyebrow}</p>
        <div className="collection-list-heading-actions">
          {folderLabel ? (
            <span className="collection-list-folder-path">{folderLabel}</span>
          ) : null}
          {headerAction}
        </div>
      </div>
      {items.length === 0 ? (
        <div className="empty-state empty-state-action">
          <p>{emptyText}</p>
          {emptyAction}
        </div>
      ) : (
        <div className="task-list">
          {items.map((item) => (
            <Card
              className="task-row collection-list-row"
              key={item.id}
              variant="secondary"
            >
              <div className="task-row-summary">
                <span className="task-row-title">{item.title}</span>
                {item.meta ? renderListMeta(item.meta) : null}
                {item.message ? (
                  <span className="task-row-meta">{item.message}</span>
                ) : null}
              </div>
              {item.status ? <div>{item.status}</div> : null}
              <Button
                className="px-6"
                type="button"
                variant="secondary"
                onClick={() => onEdit(item.id)}
              >
                {itemActionLabel}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </Wrapper>
  )
}

function renderListMeta(meta: ReactNode) {
  return typeof meta === 'string' || typeof meta === 'number' ? (
    <Chip size="sm" variant="secondary">
      <Chip.Label>{meta}</Chip.Label>
    </Chip>
  ) : (
    meta
  )
}
