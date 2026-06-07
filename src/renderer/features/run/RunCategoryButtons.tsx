import type { NavigationCategory } from "../../shared/state/taskFormState"
import type { WorkflowDefinition } from "../../../shared/workflows"
import { createRunCategories } from "./createRunCatgories"
import { FolderButton } from "../../shared/components/FolderButton"

export function RunCategoryButtons({
    selectedCategory,
    selectedCollectionFolderId,
    workflows,
    onCategorySelect,
    onCollectionFolderSelect,
}: {
    selectedCategory: NavigationCategory
    selectedCollectionFolderId: string
    workflows: WorkflowDefinition[]
    onCategorySelect(category: NavigationCategory): void
    onCollectionFolderSelect(folderId: string): void
}) {
    const runCategories = createRunCategories(workflows)
    return (
        <>
            {<div className='pt-14'></div>}
            {runCategories.map((category) => (
              <FolderButton
                count={category.count}
                icon={category.icon}
                id={category.id}
                isSelected={selectedCategory === category.id && selectedCollectionFolderId === 'all'}
                key={category.id}
                label={category.label}
                onSelect={(id) => {
                  onCollectionFolderSelect('all')
                  onCategorySelect(id as NavigationCategory)
                }}
              />
            ))}
        </>
    )
}