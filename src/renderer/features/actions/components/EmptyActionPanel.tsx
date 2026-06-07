import type { WorkspaceFolder } from "../../../../shared/settings"
import type { ActionDefinition } from "../../../../shared/actions"
import { CollectionListPanel } from "../../../shared/components/CollectionListPanel"
import { Button } from "@heroui/react"
import { getWorkspaceFolderPathLabel } from "../../../shared/utils/workspaceFolderLabels"
import { getActionTypeLabel } from "../../../shared/utils/viewLabels"
import { getCommonIcon } from "../../../shared/assets/icon"

export function EmptyActionPanel({
  selectedCollectionFolderId,
  workspaceFolders,
  visibleActions,
  onClickAction,
  onSelectAction,
}: {
  selectedCollectionFolderId: string
  workspaceFolders: WorkspaceFolder[]
  visibleActions: ActionDefinition[]
  onClickAction(value: boolean): void
  onSelectAction(actionId: string | null): void
}) {
  return (
        <CollectionListPanel
        emptyText="표시할 Action이 없습니다."
        eyebrow="ACTIONS"
        folderLabel={getWorkspaceFolderPathLabel(
          selectedCollectionFolderId,
          workspaceFolders,
        )}
        headerAction={
          <Button
            aria-label="Action 추가"
            isIconOnly
            variant="ghost"
            type="button"
            onClick={() => onClickAction(true)}
          >
            {getCommonIcon('add')}
          </Button>
        }
        items={visibleActions.map((action) => ({
          id: action.id,
          title: action.name,
          meta: getActionTypeLabel(action.type),
          message: `${action.secretRefs?.length ?? 0}개 Secret`,
        }))}
        title="Action 목록"
        onEdit={onSelectAction}
      />
  )
}