import type { WorkspaceFolder } from '../../../shared/settings'

export function getWorkspaceFolderPathLabel(
  folderId: string,
  workspaceFolders: WorkspaceFolder[],
): string {
  if (folderId === 'all') {
    return '전체'
  }

  if (folderId === 'favorites') {
    return '즐겨찾기'
  }

  if (folderId === 'imminent') {
    return '임박'
  }

  const folder = workspaceFolders.find(
    (workspaceFolder) => workspaceFolder.id === folderId,
  )

  return folder ? `폴더 / ${folder.name}` : '폴더'
}
