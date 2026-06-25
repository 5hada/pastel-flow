import { Button, Card, Chip } from '@heroui/react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type {
  CreateScrapInput,
  ScrapItem,
  ScrapSourceType,
  ScrapStatus,
  UpdateScrapInput,
} from '../../../shared/scraps'
import type { WorkspaceFolder } from '../../../shared/settings'
import { AlertDialogButton } from '../../shared/components/AlertDialogButton'
import { CollectionListPanel } from '../../shared/components/CollectionListPanel'
import {
  FieldGrid,
  SelectField,
  TextAreaField,
  TextInputField,
} from '../../shared/components/HeroForm'
import { getCommonIcon } from '../../shared/assets/icon'
import { formatDate } from '../../shared/utils/viewLabels'
import { getWorkspaceFolderPathLabel } from '../../shared/utils/workspaceFolderLabels'

export type ScrapsWorkspaceProps = {
  isLoading: boolean
  scraps: ScrapItem[]
  selectedCollectionFolderId: string
  selectedScrapId: string | null
  workspaceFolders: WorkspaceFolder[]
  onCreateScrap(input: CreateScrapInput): Promise<void>
  onDeleteScrap(id: string): Promise<void>
  onSelectScrap(id: string | null): void
  onUpdateScrap(id: string, input: UpdateScrapInput): Promise<void>
}

export function ScrapsWorkspace({
  isLoading,
  onCreateScrap,
  onDeleteScrap,
  onSelectScrap,
  onUpdateScrap,
  scraps,
  selectedCollectionFolderId,
  selectedScrapId,
  workspaceFolders,
}: ScrapsWorkspaceProps) {
  const selectedScrap =
    scraps.find((scrap) => scrap.id === selectedScrapId) ?? null
  const [isCreating, setIsCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState<ScrapSourceFilter>('all')
  const [draft, setDraft] = useState(createDraft(selectedScrap))

  useEffect(() => {
    setDraft(createDraft(selectedScrap))
    if (selectedScrap) {
      setIsCreating(false)
    }
  }, [selectedScrap])

  const visibleScraps = useMemo(
    () => filterScraps(scraps, query, sourceFilter),
    [query, scraps, sourceFilter],
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (selectedScrap) {
      await onUpdateScrap(selectedScrap.id, parseUpdateDraft(draft))
    } else {
      const input = parseCreateDraft(draft)
      if (!input) {
        return
      }
      await onCreateScrap(input)
    }
    setIsCreating(false)
  }

  if (isLoading) {
    return (
      <Card className="mode-panel">
        <p className="empty-state">Scrap을 불러오는 중입니다.</p>
      </Card>
    )
  }

  if (!selectedScrap && !isCreating) {
    return (
      <CollectionListPanel
        emptyText="저장된 Scrap이 없습니다."
        eyebrow="SCRAPS"
        folderLabel={getWorkspaceFolderPathLabel(
          selectedCollectionFolderId,
          workspaceFolders,
        )}
        headerAction={
          <div className="section-actions justify-center">
            <TextInputField
              label=""
              name="scrap-search"
              placeholder="검색"
              value={query}
              onChange={setQuery}
            />
            <SelectField<ScrapSourceFilter>
              label=""
              options={sourceFilterOptions}
              selectedKey={sourceFilter}
              onChange={setSourceFilter}
            />
            <Button
              aria-label="Scrap 추가"
              isIconOnly
              variant="ghost"
              type="button"
              onClick={() => {
                onSelectScrap(null)
                setDraft(createDraft(null))
                setIsCreating(true)
              }}
            >
              {getCommonIcon('add')}
            </Button>
          </div>
        }
        items={visibleScraps.map((scrap) => ({
          id: scrap.id,
          title: scrap.title,
          meta: getSourceTypeLabel(scrap.source.sourceType),
          status: <ScrapStatusChip status={scrap.status} />,
          message: getScrapMessage(scrap),
        }))}
        title="Scrap 목록"
        onEdit={(scrapId) => {
          setIsCreating(false)
          onSelectScrap(scrapId)
        }}
      />
    )
  }

  return (
    <Card className="mode-panel" aria-label="Scrap 편집">
      <div className="editor-detail" aria-label="Scrap 편집">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Scraps</p>
            <h2>{selectedScrap?.title ?? '새 Scrap'}</h2>
          </div>
          <Button
            aria-label="목록으로 돌아가기"
            isIconOnly
            variant="ghost"
            type="button"
            onClick={() => {
              setIsCreating(false)
              onSelectScrap(null)
            }}
          >
            {getCommonIcon('close')}
          </Button>
        </div>

        <form className="task-form" onSubmit={handleSubmit}>
          <FieldGrid>
            <TextInputField
              label="제목"
              name="scrap-title"
              value={draft.title}
              onChange={(value) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  title: value,
                }))
              }
            />
            <SelectField<EditableScrapSourceType>
              isDisabled={Boolean(selectedScrap)}
              label="Source"
              options={sourceTypeOptions}
              selectedKey={draft.sourceType}
              onChange={(value) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  sourceType: value,
                  sourceValue: '',
                }))
              }
            />
          </FieldGrid>
          <SourceValueField draft={draft} onDraftChange={setDraft} />
          <FieldGrid>
            <SelectField<ScrapStatus>
              label="상태"
              options={statusOptions}
              selectedKey={draft.status}
              onChange={(value) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  status: value,
                }))
              }
            />
            <TextInputField
              label="Tags"
              name="scrap-tags"
              placeholder="쉼표로 구분"
              value={draft.tags}
              onChange={(value) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  tags: value,
                }))
              }
            />
            <TextInputField
              label="Collection IDs"
              name="scrap-collections"
              placeholder="쉼표로 구분"
              value={draft.collectionIds}
              onChange={(value) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  collectionIds: value,
                }))
              }
            />
          </FieldGrid>
          <TextAreaField
            label="요약"
            name="scrap-summary"
            rows={4}
            value={draft.summary}
            onChange={(value) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                summary: value,
              }))
            }
          />
          <div className="form-actions">
            <Button
              isDisabled={!canSubmitDraft(draft, Boolean(selectedScrap))}
              type="submit"
              variant="primary"
            >
              저장
            </Button>
            {selectedScrap ? (
              <AlertDialogButton
                onPress={() => void onDeleteScrap(selectedScrap.id)}
              />
            ) : null}
          </div>
        </form>

        {selectedScrap ? (
          <dl className="detail-list">
            <DetailCell label="Scrap ID" value={selectedScrap.id} />
            <DetailCell
              label="Source"
              value={getSourceTypeLabel(selectedScrap.source.sourceType)}
            />
            <DetailCell
              label="생성 시간"
              value={formatDate(selectedScrap.createdAt).value}
            />
            <DetailCell
              label="수정 시간"
              value={formatDate(selectedScrap.updatedAt).value}
            />
          </dl>
        ) : null}
      </div>
    </Card>
  )
}

function SourceValueField({
  draft,
  onDraftChange,
}: {
  draft: ScrapDraft
  onDraftChange(value: ScrapDraft | ((currentDraft: ScrapDraft) => ScrapDraft)): void
}) {
  if (draft.sourceType === 'memo' || draft.sourceType === 'text') {
    return (
      <TextAreaField
        label={draft.sourceType === 'memo' ? '메모' : '텍스트'}
        name="scrap-source-value"
        rows={8}
        value={draft.sourceValue}
        onChange={(value) =>
          onDraftChange((currentDraft) => ({
            ...currentDraft,
            sourceValue: value,
          }))
        }
      />
    )
  }

  return (
    <TextInputField
      label={draft.sourceType === 'url' ? 'URL' : '파일 경로'}
      name="scrap-source-value"
      type={draft.sourceType === 'url' ? 'url' : 'text'}
      value={draft.sourceValue}
      onChange={(value) =>
        onDraftChange((currentDraft) => ({
          ...currentDraft,
          sourceValue: value,
        }))
      }
    />
  )
}

function ScrapStatusChip({ status }: { status: ScrapStatus }) {
  return (
    <Chip size="sm" variant="secondary">
      <Chip.Label>{getStatusLabel(status)}</Chip.Label>
    </Chip>
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

type ScrapDraft = {
  title: string
  sourceType: EditableScrapSourceType
  sourceValue: string
  status: ScrapStatus
  tags: string
  collectionIds: string
  summary: string
}

type EditableScrapSourceType = Extract<
  ScrapSourceType,
  'url' | 'file' | 'memo' | 'text'
>

type ScrapSourceFilter = EditableScrapSourceType | 'all'

const sourceTypeOptions: Array<{
  value: EditableScrapSourceType
  label: string
}> = [
  { value: 'url', label: 'URL' },
  { value: 'file', label: '파일' },
  { value: 'memo', label: '메모' },
  { value: 'text', label: '텍스트' },
]

const sourceFilterOptions: Array<{
  value: ScrapSourceFilter
  label: string
}> = [
  { value: 'all', label: '전체' },
  ...sourceTypeOptions,
]

const statusOptions: Array<{
  value: ScrapStatus
  label: string
}> = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'processing', label: 'Processing' },
  { value: 'classified', label: 'Classified' },
  { value: 'archived', label: 'Archived' },
  { value: 'dismissed', label: 'Dismissed' },
]

function createDraft(scrap: ScrapItem | null): ScrapDraft {
  return {
    title: scrap?.title ?? '',
    sourceType: getEditableSourceType(scrap),
    sourceValue: scrap ? getSourceValue(scrap) : '',
    status: scrap?.status ?? 'inbox',
    tags: scrap?.tags.join(', ') ?? '',
    collectionIds: scrap?.collectionIds.join(', ') ?? '',
    summary: scrap?.summary ?? '',
  }
}

function getEditableSourceType(scrap: ScrapItem | null): EditableScrapSourceType {
  const sourceType = scrap?.source.sourceType
  return sourceType === 'url' ||
    sourceType === 'file' ||
    sourceType === 'memo' ||
    sourceType === 'text'
    ? sourceType
    : 'text'
}

function getSourceValue(scrap: ScrapItem): string {
  switch (scrap.source.sourceType) {
    case 'url':
      return scrap.source.url
    case 'file':
      return scrap.source.path
    case 'memo':
    case 'text':
    case 'clipboard':
      return scrap.source.content
    case 'browser_selection':
      return scrap.source.selectedText
    case 'external':
      return JSON.stringify(scrap.source.payload, null, 2)
  }
}

function parseCreateDraft(draft: ScrapDraft): CreateScrapInput | null {
  const title = draft.title.trim()
  const sourceValue = draft.sourceValue.trim()
  if (!sourceValue) {
    return null
  }

  return {
    title: title || undefined,
    source: createSourceInput(draft.sourceType, sourceValue),
    status: draft.status,
    collectionIds: parseCsv(draft.collectionIds),
    tags: parseCsv(draft.tags),
  }
}

function createSourceInput(
  sourceType: EditableScrapSourceType,
  sourceValue: string,
): CreateScrapInput['source'] {
  switch (sourceType) {
    case 'url':
      return { sourceType, url: sourceValue }
    case 'file':
      return { sourceType, path: sourceValue }
    case 'memo':
    case 'text':
      return { sourceType, content: sourceValue }
  }
}

function parseUpdateDraft(draft: ScrapDraft): UpdateScrapInput {
  return {
    title: draft.title.trim(),
    status: draft.status,
    collectionIds: parseCsv(draft.collectionIds),
    tags: parseCsv(draft.tags),
    summary: draft.summary.trim() || undefined,
  }
}

function canSubmitDraft(draft: ScrapDraft, isEditing: boolean): boolean {
  return isEditing || draft.sourceValue.trim().length > 0
}

function filterScraps(
  scraps: ScrapItem[],
  query: string,
  sourceFilter: ScrapSourceFilter,
): ScrapItem[] {
  const normalizedQuery = query.trim().toLowerCase()
  return scraps.filter((scrap) => {
    const matchesSource =
      sourceFilter === 'all' || scrap.source.sourceType === sourceFilter
    const matchesQuery =
      !normalizedQuery ||
      [
        scrap.title,
        scrap.summary,
        scrap.tags.join(' '),
        getSourceValue(scrap),
      ]
        .filter(Boolean)
        .join('\n')
        .toLowerCase()
        .includes(normalizedQuery)

    return matchesSource && matchesQuery
  })
}

function getScrapMessage(scrap: ScrapItem): string {
  return scrap.summary || scrap.tags.join(', ') || getSourceValue(scrap)
}

function getSourceTypeLabel(sourceType: ScrapSourceType): string {
  switch (sourceType) {
    case 'url':
      return 'URL'
    case 'file':
      return 'File'
    case 'memo':
      return 'Memo'
    case 'text':
      return 'Text'
    case 'browser_selection':
      return 'Browser'
    case 'clipboard':
      return 'Clipboard'
    case 'external':
      return 'External'
  }
}

function getStatusLabel(status: ScrapStatus): string {
  switch (status) {
    case 'inbox':
      return 'Inbox'
    case 'processing':
      return 'Processing'
    case 'classified':
      return 'Classified'
    case 'archived':
      return 'Archived'
    case 'dismissed':
      return 'Dismissed'
  }
}

function parseCsv(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}
