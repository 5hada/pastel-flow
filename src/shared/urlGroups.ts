export type UrlGroupItem = {
  id: string
  url: string
  label?: string
  enabled: boolean
}

export type UrlGroup = {
  id: string
  name: string
  description?: string
  tags: string[]
  items: UrlGroupItem[]
  createdAt: string
  updatedAt: string
}

export type UrlGroupItemRunStatus =
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'skipped'

export type UrlGroupItemRun = {
  id: string
  runId: string
  workflowId: string
  actionRunId: string
  urlGroupId: string
  urlItemId: string
  url: string
  status: UrlGroupItemRunStatus
  startedAt?: string
  endedAt?: string
  message?: string
  error?: string
  createdAt: string
  updatedAt: string
}

export type CreateUrlGroupInput = {
  name: string
  description?: string
  tags?: string[]
  items?: UrlGroupItem[]
}

export type UpdateUrlGroupInput = Partial<
  Pick<UrlGroup, 'name' | 'description' | 'tags' | 'items'>
>

export function normalizeUrlGroupItems(items: unknown): UrlGroupItem[] {
  if (!Array.isArray(items)) {
    return []
  }

  return items.flatMap((item): UrlGroupItem[] => {
    if (!item || typeof item !== 'object') {
      return []
    }

    const candidate = item as Partial<UrlGroupItem>
    if (typeof candidate.url !== 'string' || !candidate.url.trim()) {
      return []
    }

    return [
      {
        id:
          typeof candidate.id === 'string' && candidate.id.trim()
            ? candidate.id.trim()
            : crypto.randomUUID(),
        url: candidate.url.trim(),
        label:
          typeof candidate.label === 'string' && candidate.label.trim()
            ? candidate.label.trim()
            : undefined,
        enabled: candidate.enabled !== false,
      },
    ]
  })
}
