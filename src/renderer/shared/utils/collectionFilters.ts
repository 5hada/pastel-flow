export function filterByFolder<TItem extends { id: string }>(
  items: TItem[],
  folderId: string,
  assignments: Record<string, string>,
): TItem[] {
  if (folderId === 'all') {
    return items
  }

  if (folderId === 'favorites') {
    return []
  }

  return items.filter((item) => assignments[item.id] === folderId)
}
