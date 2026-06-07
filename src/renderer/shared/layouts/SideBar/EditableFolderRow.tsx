import { Button, Input } from "@heroui/react"
import { useState } from "react"
import { getCommonIcon } from "../../assets/icon"
import type { WorkspaceFolder } from "../../../../shared/settings"

export function EditableFolderRow({
  folder,
  isFirst,
  isLast,
  onDeleteFolder,
  onMoveFolder,
  onRenameFolder,
}: {
  folder: WorkspaceFolder
  isFirst: boolean
  isLast: boolean
  onDeleteFolder(folderId: string): Promise<void>
  onMoveFolder(folderId: string, direction: -1 | 1): Promise<void>
  onRenameFolder(folderId: string, name: string): Promise<void>
}) {
  const [name, setName] = useState(folder.name)

  return (
    <div className="flex mb-2">
      <Input
        className='w-20'
        aria-label="폴더 이름"
        value={name}
        onBlur={() => void onRenameFolder(folder.id, name)}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur()
          }
        }}
      />
      <Button
        className=''
        aria-label="위로 이동"
        isDisabled={isFirst}
        isIconOnly
        variant="ghost"
        type="button"
        onClick={() => void onMoveFolder(folder.id, -1)}
      >
        ↑
      </Button>
      <Button
        className=''
        aria-label="아래로 이동"
        isDisabled={isLast}
        isIconOnly
        variant="ghost"
        type="button"
        onClick={() => void onMoveFolder(folder.id, 1)}
      >
        ↓
      </Button>
      <Button
        className=''
        aria-label="폴더 삭제"
        isIconOnly
        variant="danger"
        type="button"
        onClick={() => void onDeleteFolder(folder.id)}
      >
        {getCommonIcon('close')}
      </Button>
    </div>
  )
}