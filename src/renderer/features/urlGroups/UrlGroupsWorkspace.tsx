import { Button, Card } from '@heroui/react'
import { useEffect, useState, type FormEvent } from 'react'
import type { UrlGroup, UrlGroupItem } from '../../../shared/urlGroups'
import { normalizeUrlGroupItems } from '../../../shared/urlGroups'
import { CollectionListPanel } from '../../shared/components/CollectionListPanel'
import { DetailItem } from '../../shared/components/DetailItem'
import { getCommonIcon } from '../../shared/assets/icon'
import { formatDate } from '../../shared/utils/viewLabels'

export type UrlGroupsWorkspaceProps = {
  isLoading: boolean
  selectedUrlGroupId: string | null
  urlGroups: UrlGroup[]
  onCreateUrlGroup(input: {
    name: string
    description?: string
    tags?: string[]
    items: UrlGroupItem[]
  }): Promise<void>
  onDeleteUrlGroup(id: string): Promise<void>
  onSelectUrlGroup(id: string | null): void
  onUpdateUrlGroup(
    id: string,
    input: Partial<Pick<UrlGroup, 'name' | 'description' | 'tags' | 'items'>>,
  ): Promise<void>
}

export function UrlGroupsWorkspace({
  isLoading,
  onCreateUrlGroup,
  onDeleteUrlGroup,
  onSelectUrlGroup,
  onUpdateUrlGroup,
  selectedUrlGroupId,
  urlGroups,
}: UrlGroupsWorkspaceProps) {
  const selectedUrlGroup =
    urlGroups.find((urlGroup) => urlGroup.id === selectedUrlGroupId) ?? null
  const [isCreating, setIsCreating] = useState(false)
  const [draft, setDraft] = useState(createDraft(selectedUrlGroup))

  useEffect(() => {
    setDraft(createDraft(selectedUrlGroup))
    setIsCreating(false)
  }, [selectedUrlGroup])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input = parseDraft(draft)
    if (!input.name) {
      return
    }

    if (selectedUrlGroup) {
      await onUpdateUrlGroup(selectedUrlGroup.id, input)
    } else {
      await onCreateUrlGroup({
        name: input.name,
        description: input.description,
        tags: input.tags,
        items: input.items ?? [],
      })
    }
  }

  if (isLoading) {
    return (
      <Card className="mode-panel">
        <p className="empty-state">URL Groups를 불러오는 중입니다.</p>
      </Card>
    )
  }

  if (!selectedUrlGroup && !isCreating) {
    return (
      <CollectionListPanel
        emptyText="표시할 URL Group이 없습니다."
        eyebrow="URL GROUPS"
        headerAction={
          <Button
            aria-label="URL Group 추가"
            isIconOnly
            variant="ghost"
            type="button"
            onClick={() => setIsCreating(true)}
          >
            {getCommonIcon('add')}
          </Button>
        }
        items={urlGroups.map((urlGroup) => ({
          id: urlGroup.id,
          title: urlGroup.name,
          meta: `${urlGroup.items.filter((item) => item.enabled).length} active / ${urlGroup.items.length} URLs`,
          message: urlGroup.description ?? urlGroup.tags.join(', '),
        }))}
        title="URL Group 목록"
        onEdit={onSelectUrlGroup}
      />
    )
  }

  return (
    <Card className="mode-panel url-group-panel" aria-label="URL Group 편집">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">URL Groups</p>
          <h2>{selectedUrlGroup?.name ?? '새 URL Group'}</h2>
        </div>
        <Button
          aria-label="목록으로 돌아가기"
          isIconOnly
          variant="ghost"
          type="button"
          onClick={() => {
            setIsCreating(false)
            onSelectUrlGroup(null)
          }}
        >
          {getCommonIcon('close')}
        </Button>
      </div>

      <form className="task-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            이름
            <input
              value={draft.name}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  name: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Tags
            <input
              placeholder="쉼표로 구분"
              value={draft.tags}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  tags: event.target.value,
                }))
              }
            />
          </label>
        </div>
        <label>
          설명
          <input
            value={draft.description}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                description: event.target.value,
              }))
            }
          />
        </label>
        <label>
          URLs
          <textarea
            placeholder="한 줄에 하나씩 URL 입력"
            rows={8}
            value={draft.urls}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                urls: event.target.value,
              }))
            }
          />
        </label>
        <div className="form-actions">
          <Button variant="primary" type="submit" isDisabled={!draft.name.trim()}>
            저장
          </Button>
          {selectedUrlGroup ? (
            <Button
              className="danger-button"
              variant="danger"
              type="button"
              onClick={() => void onDeleteUrlGroup(selectedUrlGroup.id)}
            >
              삭제
            </Button>
          ) : null}
        </div>
      </form>

      {selectedUrlGroup ? (
        <dl className="detail-list">
          <DetailItem label="URL Group ID" value={selectedUrlGroup.id} />
          <DetailItem
            label="URL"
            value={`${selectedUrlGroup.items.length}개`}
          />
          <DetailItem
            label="생성 시간"
            value={formatDate(selectedUrlGroup.createdAt)}
          />
          <DetailItem
            label="수정 시간"
            value={formatDate(selectedUrlGroup.updatedAt)}
          />
        </dl>
      ) : null}
    </Card>
  )
}

type UrlGroupDraft = {
  name: string
  description: string
  tags: string
  urls: string
}

function createDraft(urlGroup: UrlGroup | null): UrlGroupDraft {
  return {
    name: urlGroup?.name ?? '',
    description: urlGroup?.description ?? '',
    tags: urlGroup?.tags.join(', ') ?? '',
    urls: urlGroup?.items.map((item) => item.url).join('\n') ?? '',
  }
}

function parseDraft(draft: UrlGroupDraft): {
  name: string
  description?: string
  tags: string[]
  items: UrlGroupItem[]
} {
  return {
    name: draft.name.trim(),
    description: draft.description.trim() || undefined,
    tags: draft.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    items: normalizeUrlGroupItems(
      draft.urls
        .split(/\r?\n/)
        .map((url) => url.trim())
        .filter(Boolean)
        .map((url) => ({
          id: crypto.randomUUID(),
          url,
          enabled: true,
        })),
    ),
  }
}
