import { FolderButton } from "../../components/FolderButton"
import { getCommonIcon } from "../../assets/icon"


export function CommonFolderButton({
    allCount,
    favoritesCount,
    isAllSelected,
    isFavoritesSelected,
    onSelectAll,
    onSelectFavorited,
}: {
    allCount: number
    favoritesCount?: number
    isAllSelected: boolean
    isFavoritesSelected: boolean
    onSelectAll(id: string): void
    onSelectFavorited(id: string): void
}) {
    return (
        <>
          <FolderButton
            count={allCount}
            icon={getCommonIcon('list')}
            id="all"
            isSelected={isAllSelected}
            label="전체"
            onSelect={onSelectAll}
          />
          <FolderButton
            count={(favoritesCount) ? favoritesCount : 0}
            icon={getCommonIcon('starred')}
            id="favorites"
            isSelected={isFavoritesSelected}
            label="즐겨찾기"
            onSelect={onSelectFavorited}
          />
        </>
    )
}