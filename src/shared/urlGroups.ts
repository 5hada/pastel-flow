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
