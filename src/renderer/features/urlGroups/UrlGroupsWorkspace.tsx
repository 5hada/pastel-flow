import { Button, Card } from '@heroui/react'
import { useEffect, useState, type FormEvent } from 'react'
import type { WorkspaceFolder } from '../../../shared/settings'
import type { UrlGroup, UrlGroupItem } from '../../../shared/urlGroups'
import { normalizeUrlGroupItems } from '../../../shared/urlGroups'
import { CollectionListPanel } from '../../shared/components/CollectionListPanel'
import { FormPanel } from '../../shared/components/FormPanel'
import {
  AlertDialogButton,
  FieldGrid,
  TextAreaField,
  TextInputField,
} from '../../shared/components/HeroForm'
import { getCommonIcon } from '../../shared/assets/icon'
import { formatDate } from '../../shared/utils/viewLabels'
import { getWorkspaceFolderPathLabel } from '../../shared/utils/workspaceFolderLabels'

export type UrlGroupsWorkspaceProps = {
  isLoading: boolean
  selectedCollectionFolderId: string
  selectedUrlGroupId: string | null
  urlGroups: UrlGroup[]
  workspaceFolders: WorkspaceFolder[]
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
  selectedCollectionFolderId,
  selectedUrlGroupId,
  urlGroups,
  workspaceFolders,
}: UrlGroupsWorkspaceProps) {
  const selectedUrlGroup =
    urlGroups.find((urlGroup) => urlGroup.id === selectedUrlGroupId) ?? null
  const [isCreating, setIsCreating] = useState(false)
  const [draft, setDraft] = useState(createDraft(selectedUrlGroup))

  useEffect(() => {
    setDraft(createDraft(selectedUrlGroup))
    if (selectedUrlGroup) {
      setIsCreating(false)
    }
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
        folderLabel={getWorkspaceFolderPathLabel(
          selectedCollectionFolderId,
          workspaceFolders,
        )}
        headerAction={
          <Button
            aria-label="URL Group 추가"
            isIconOnly
            variant="ghost"
            type="button"
            onClick={() => {
              onSelectUrlGroup(null)
              setDraft(createDraft(null))
              setIsCreating(true)
            }}
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
        onEdit={(urlGroupId) => {
          setIsCreating(false)
          onSelectUrlGroup(urlGroupId)
        }}
      />
    )
  }

  return (
    <Card className="mode-panel url-group-panel" aria-label="URL Group 편집">
      <UrlGroupSidePanel
        draft={draft}
        selectedUrlGroup={selectedUrlGroup}
        onClose={() => {
          setIsCreating(false)
          onSelectUrlGroup(null)
        }}
        onDeleteUrlGroup={onDeleteUrlGroup}
        onDraftChange={setDraft}
        onSubmit={handleSubmit}
      />
    </Card>
  )
}

function UrlGroupSidePanel({
  draft,
  onClose,
  onDeleteUrlGroup,
  onDraftChange,
  onSubmit,
  selectedUrlGroup,
}: {
  draft: UrlGroupDraft
  selectedUrlGroup: UrlGroup | null
  onClose(): void
  onDeleteUrlGroup(id: string): Promise<void>
  onDraftChange(
    value: UrlGroupDraft | ((currentDraft: UrlGroupDraft) => UrlGroupDraft),
  ): void
  onSubmit(event: FormEvent<HTMLFormElement>): void
}) {
  return (
    <div className="editor-detail" aria-label="URL Group 편집">
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
          onClick={onClose}
        >
          {getCommonIcon('close')}
        </Button>
      </div>

      <form onSubmit={onSubmit}>
        <FormPanel>
          <FieldGrid>
            <TextInputField
              label="이름"
              name="url-group-name"
              value={draft.name}
              onChange={(value) =>
                onDraftChange((currentDraft) => ({
                  ...currentDraft,
                  name: value,
                }))
              }
            />
            <TextInputField
              label="Tags"
              name="url-group-tags"
              placeholder="쉼표로 구분"
              value={draft.tags}
              onChange={(value) =>
                onDraftChange((currentDraft) => ({
                  ...currentDraft,
                  tags: value,
                }))
              }
            />
          </FieldGrid>
          <TextInputField
            label="설명"
            name="url-group-description"
            value={draft.description}
            onChange={(value) =>
              onDraftChange((currentDraft) => ({
                ...currentDraft,
                description: value,
              }))
            }
          />
          <TextAreaField
            label="URLs"
            name="url-group-urls"
            placeholder="한 줄에 하나씩 URL 입력"
            rows={8}
            value={draft.urls}
            onChange={(value) =>
              onDraftChange((currentDraft) => ({
                ...currentDraft,
                urls: value,
              }))
            }
          />
          <div className="form-actions">
            <Button variant="primary" type="submit" isDisabled={!draft.name.trim()}>
              저장
            </Button>
            {selectedUrlGroup ? (
              <AlertDialogButton
                onPress={() => void onDeleteUrlGroup(selectedUrlGroup.id)}
              />
            ) : null}
          </div>
        </FormPanel>
      </form>

      {selectedUrlGroup ? (
        <dl className="detail-list">
          <DetailCell label="URL Group ID" value={selectedUrlGroup.id} />
          <DetailCell
            label="URL"
            value={`${selectedUrlGroup.items.length}개`}
          />
          <DetailCell
            label="생성 시간"
            value={formatDate(selectedUrlGroup.createdAt)}
          />
          <DetailCell
            label="수정 시간"
            value={formatDate(selectedUrlGroup.updatedAt)}
          />
        </dl>
      ) : null}
    </div>
  )
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
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
