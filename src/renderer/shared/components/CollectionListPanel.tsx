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
        <div className="grid gap-3">
          {items.map((item) => (
            <Card
              className="
              grid
              grid-cols-[minmax(0,1fr)_max-content_max-content]
              md:grid-cols-[minmax(0,1fr)_max-content_max-content_max-content] items-center
            "
              key={item.id}
              variant="secondary"
            >
              <div
                className="
                  grid min-w-0
                  grid-cols-1
                  md:contents
                "
              >
                <div className="grid min-w-0 gap-1 md:order-1">
                  <span className="truncate">{item.title}</span>
                  {item.message ? (<span className="truncate">{item.message}</span>) : null}
                </div>
                <div className="md:order-3">{item.status ? item.status : null}</div>

              </div>
              <div className='md:pr-4 md:order-2'>{item.meta ? renderListMeta(item.meta) : null}</div>
              <div className='justify-self-end md:order-4'>
                <Button
                  className=""
                  type="button"
                  variant="secondary"
                  onClick={() => onEdit(item.id)}
                >
                  {itemActionLabel}
                </Button>
              </div>
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
