import { Button } from '@heroui/react'
import { useState } from 'react'
import { FolderButton } from '../components/FolderButton'
import { EditableFolderRow } from './SideBar/EditableFolderRow'
import type { ActionDefinition } from '../../../shared/actions'
import type {
  WorkspaceFolder,
  WorkspaceFolderScope,
} from '../../../shared/settings'
import type { TodoItem } from '../../../shared/todos'
import type { RegisteredToolModule } from '../../../shared/tools'
import type { UrlGroup } from '../../../shared/urlGroups'
import type { WorkflowDefinition } from '../../../shared/workflows'
import { getCommonIcon } from '../assets/icon'
import type {
  NavigationCategory,
  SettingsCategory,
  WorkspaceMode,
} from '../state/taskFormState'
import { CommonFolderButton } from './SideBar/CommonFolderButton'
import { SettingsSidePanel } from '../../features/settings/SettingsSidePanel'
import { RunCategoryButtons } from '../../features/run/RunCategoryButtons'
// import { isTodoDueSoon } from '../utils/todoFilters'

export type WorkspaceSidebarProps = {
  actions: ActionDefinition[]
  currentMode: WorkspaceMode
  selectedCategory: NavigationCategory
  selectedCollectionFolderId: string
  selectedSettingsCategory: SettingsCategory
  selectedToolId: string | null
  selectedWorkflowId: string | null
  selectedActionId: string | null
  toolModules: RegisteredToolModule[]
  todos: TodoItem[]
  urlGroups: UrlGroup[]
  workflows: WorkflowDefinition[]
  workspaceFolders: WorkspaceFolder[]
  onCategorySelect(category: NavigationCategory): void
  onCollectionFolderSelect(folderId: string): void
  onCreateFolder(scope: WorkspaceFolderScope): Promise<void>
  onDeleteFolder(folderId: string): Promise<void>
  onMoveFolder(folderId: string, direction: -1 | 1): Promise<void>
  onRenameFolder(folderId: string, name: string): Promise<void>
  onSelectAction(actionId: string): void
  onSelectSettingsCategory(category: SettingsCategory): void
  onSelectTool(tool: RegisteredToolModule): void
  onSelectWorkflow(workflow: WorkflowDefinition): void
}

export function WorkspaceSidebar({
  actions,
  currentMode,
  selectedCategory,
  selectedCollectionFolderId,
  selectedSettingsCategory,
  todos,
  toolModules,
  urlGroups,
  workflows,
  workspaceFolders,
  onCategorySelect,
  onCollectionFolderSelect,
  onCreateFolder,
  onDeleteFolder,
  onMoveFolder,
  onRenameFolder,
  onSelectSettingsCategory,
}: WorkspaceSidebarProps) {
  const [isFolderEditMode, setIsFolderEditMode] = useState(false)
  const visibleActionCount = actions.filter(
    (action) => action.type !== 'transform_action',
  ).length
  const countMap: Record<WorkspaceMode,number> = {
  'actions': visibleActionCount,
  'todos': todos.length,
  'tools':toolModules.length,
  'urlGroups':urlGroups.length,
  'workflows':workflows.length,
  'run':0,
  'settings':0,
}

  return (
    <aside className="pl-6" aria-label="보조 패널">
      <div className="sidebar-group">
        {currentMode === 'run'
          ? (
              <>
                <RunCategoryButtons
                  selectedCategory={selectedCategory}
                  selectedCollectionFolderId={selectedCollectionFolderId}
                  workflows={workflows}
                  onCategorySelect={onCategorySelect}
                  onCollectionFolderSelect={onCollectionFolderSelect}
                />
                {workspaceFolders
                  .filter((folder) => folder.scope === 'workflows')
                  .sort((left, right) => left.order - right.order)
                  .map((folder) => (
                    <FolderButton
                      count={0}
                      icon={getCommonIcon('folderOpen')}
                      iconSelected={getCommonIcon('folderClose')}
                      id={folder.id}
                      isSelected={selectedCollectionFolderId === folder.id}
                      key={folder.id}
                      label={folder.name}
                      onSelect={(folderId) => {
                        onCategorySelect('all')
                        onCollectionFolderSelect(folderId)
                      }}
                    />
                  ))}
              </>
            )
          : null}
        {currentMode != 'run' && currentMode != 'settings' ? (
          <FolderSidebarSection
            countMap={countMap}
            currentMode={currentMode}
            editMode={isFolderEditMode}
            folders={workspaceFolders}
            scope={currentMode}
            selectedFolderId={selectedCollectionFolderId}
            onCreateFolder={onCreateFolder}
            onDeleteFolder={onDeleteFolder}
            onMoveFolder={onMoveFolder}
            onRenameFolder={onRenameFolder}
            onSelectFolder={onCollectionFolderSelect}
            onToggleEdit={setIsFolderEditMode}
          />
        ): null }
        {currentMode === 'settings'
          ? 
          <SettingsSidePanel
            selectedCategory={selectedSettingsCategory}
            onPress={onSelectSettingsCategory}
          />
          : null}
      </div>

      <div className="sidebar-note pl-4 pt-4">
        <span>Local first</span>
        <br/>
        <h6>Extension controlled</h6>
      </div>
    </aside>
  )
}

type SidePanelFolderProps = {
  countMap: Record<WorkspaceMode,number>
  folders: WorkspaceFolder[]
  selectedFolderId: string
  onDeleteFolder(folderId: string): Promise<void>
  onMoveFolder(folderId: string, direction: -1 | 1): Promise<void>
  onRenameFolder(folderId: string, name: string): Promise<void>
  onSelectFolder(folderId: string): void
} & SidePanelHeadProps

function FolderSidebarSection({
  countMap,
  folders,
  selectedFolderId,
  onDeleteFolder,
  onMoveFolder,
  onRenameFolder,
  onSelectFolder,
  ...sidePanelHeadProps
}: SidePanelFolderProps) {
  const { currentMode, editMode, scope } = sidePanelHeadProps
  const scopedFolders = folders
    .filter((folder) => folder.scope === scope)
    .sort((left, right) => left.order - right.order)

  return (
    <>
      <SidePanelHead
        {...sidePanelHeadProps}
      />
      {currentMode === 'todos'    ?          
        <FolderButton
          count={0}
          icon={getCommonIcon('scheduled')}
          id="due_soon"
          isSelected={selectedFolderId === 'due_soon'}
          label="임박"
          onSelect={onSelectFolder}
        />
      : null}
          <CommonFolderButton
            allCount={countMap[currentMode]}
            favoritesCount={0}
            isAllSelected={selectedFolderId === 'all'}
            isFavoritesSelected={selectedFolderId === 'favorites'}
            onSelectAll={onSelectFolder}
            onSelectFavorited={onSelectFolder}
          />
      {scopedFolders.map((folder, index) =>
        editMode ? (
          <EditableFolderRow
            folder={folder}
            isFirst={index === 0}
            isLast={index === scopedFolders.length - 1}
            key={folder.id}
            onDeleteFolder={onDeleteFolder}
            onMoveFolder={onMoveFolder}
            onRenameFolder={onRenameFolder}
          />
        ) : (
          <FolderButton
            count={0}
            icon={getCommonIcon('folderOpen')}
            iconSelected={getCommonIcon('folderClose')}
            id={folder.id}
            isSelected={selectedFolderId === folder.id}
            key={folder.id}
            label={folder.name}
            onSelect={onSelectFolder}
          />
        ),
      )}
    </>
  )
}

type SidePanelHeadProps = {
  currentMode: WorkspaceMode
  editMode: boolean
  scope: WorkspaceFolderScope
  onCreateFolder(scope: WorkspaceFolderScope): Promise<void>
  onToggleEdit(value: boolean): void
}

function SidePanelHead({
  currentMode,
  editMode,
  scope,
  onCreateFolder,
  onToggleEdit,
}: SidePanelHeadProps ) {
  return (
    <>
      {(currentMode != 'run' && currentMode != 'settings') ?
        <div className="sidebar-row items-center pt-3 mb-2">
          <span/>
          <p className="">목록</p>
          <div className="flex justify-end gap-1">
            <Button
              aria-label="폴더 추가"
              className="flex-1"
              isIconOnly
              isDisabled={editMode ? false : true}
              variant="ghost"
              type="button"
              onClick={() => void onCreateFolder(scope)}
            > 
              {editMode ? getCommonIcon('add') : null}
            </Button>
            <Button
              aria-label="폴더 편집"
              className="flex-1"
              isIconOnly
              variant={editMode ? 'secondary' : 'ghost'}
              type="button"
              onClick={() => onToggleEdit(!editMode)}
            >
              {getCommonIcon('edit')}
            </Button>
          </div>
        </div>
      : null }
    </>
  )
}

