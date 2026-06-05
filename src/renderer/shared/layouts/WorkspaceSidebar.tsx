import { Button } from '@heroui/react'
import { useState, type ReactNode } from 'react'
import type { ActionDefinition } from '../../../shared/actions'
import { isRestrictedDevicePolicy } from '../../../shared/devices'
import type {
  WorkspaceFolder,
  WorkspaceFolderScope,
} from '../../../shared/settings'
import type { RegisteredToolModule } from '../../../shared/tools'
import type { WorkflowDefinition } from '../../../shared/workflows'
import { getCommonIcon, getSettingsIcon } from '../assets/icon'
import type {
  NavigationCategory,
  SettingsCategory,
  WorkspaceMode,
} from '../state/taskFormState'

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
  toolModules,
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
  const runCategories = createRunCategories(workflows)
  const visibleActionCount = actions.filter(
    (action) => action.type !== 'transform_action',
  ).length

  return (
    <aside className="workspace-sidebar" aria-label="보조 패널">
      <div className="sidebar-group">
        {currentMode === 'run'
          ? (
              <>
                {runCategories.map((category) => (
                  <FolderButton
                    count={category.count}
                    icon={category.icon}
                    id={category.id}
                    isSelected={
                      selectedCategory === category.id &&
                      selectedCollectionFolderId === 'all'
                    }
                    key={category.id}
                    label={category.label}
                    onSelect={(id) => {
                      onCollectionFolderSelect('all')
                      onCategorySelect(id as NavigationCategory)
                    }}
                  />
                ))}
                {workspaceFolders
                  .filter((folder) => folder.scope === 'workflows')
                  .sort((left, right) => left.order - right.order)
                  .map((folder) => (
                    <FolderButton
                      count={0}
                      icon={getCommonIcon('folderOpen')}
                      iconClosed={getCommonIcon('folderClose')}
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

        {currentMode === 'actions' ? (
          <FolderSidebarSection
            count={visibleActionCount}
            editMode={isFolderEditMode}
            folders={workspaceFolders}
            scope="actions"
            selectedFolderId={selectedCollectionFolderId}
            title="Action 폴더"
            onCreateFolder={onCreateFolder}
            onDeleteFolder={onDeleteFolder}
            onEditModeChange={setIsFolderEditMode}
            onMoveFolder={onMoveFolder}
            onRenameFolder={onRenameFolder}
            onSelectFolder={onCollectionFolderSelect}
          />
        ) : null}

        {currentMode === 'workflows' ? (
          <FolderSidebarSection
            count={workflows.length}
            editMode={isFolderEditMode}
            folders={workspaceFolders}
            scope="workflows"
            selectedFolderId={selectedCollectionFolderId}
            title="Workflow 폴더"
            onCreateFolder={onCreateFolder}
            onDeleteFolder={onDeleteFolder}
            onEditModeChange={setIsFolderEditMode}
            onMoveFolder={onMoveFolder}
            onRenameFolder={onRenameFolder}
            onSelectFolder={onCollectionFolderSelect}
          />
        ) : null}

        {currentMode === 'tools' ? (
          <FolderSidebarSection
            count={toolModules.length}
            editMode={isFolderEditMode}
            folders={workspaceFolders}
            scope="tools"
            selectedFolderId={selectedCollectionFolderId}
            title="Tool 폴더"
            onCreateFolder={onCreateFolder}
            onDeleteFolder={onDeleteFolder}
            onEditModeChange={setIsFolderEditMode}
            onMoveFolder={onMoveFolder}
            onRenameFolder={onRenameFolder}
            onSelectFolder={onCollectionFolderSelect}
          />
        ) : null}

        {currentMode === 'settings'
          ? settingsCategories.map((category) => (
              <Button
                className={`sidebar-item${
                  selectedSettingsCategory === category.id ? ' is-active' : ''
                }`}
                variant={
                  selectedSettingsCategory === category.id ? 'secondary' : 'ghost'
                }
                key={category.id}
                type="button"
                onClick={() => onSelectSettingsCategory(category.id)}
              >
                <span aria-hidden="true">{getSettingsIcon(category.id)}</span>
                <strong>{category.label}</strong>
              </Button>
            ))
          : null}
      </div>

      <div className="sidebar-note">
        <span>Local first</span>
        <strong>Extension controlled</strong>
      </div>
    </aside>
  )
}

function FolderSidebarSection({
  count,
  editMode,
  folders,
  scope,
  selectedFolderId,
  title,
  onCreateFolder,
  onDeleteFolder,
  onEditModeChange,
  onMoveFolder,
  onRenameFolder,
  onSelectFolder,
}: {
  count: number
  editMode: boolean
  folders: WorkspaceFolder[]
  scope: WorkspaceFolderScope
  selectedFolderId: string
  title: string
  onCreateFolder(scope: WorkspaceFolderScope): Promise<void>
  onDeleteFolder(folderId: string): Promise<void>
  onEditModeChange(value: boolean): void
  onMoveFolder(folderId: string, direction: -1 | 1): Promise<void>
  onRenameFolder(folderId: string, name: string): Promise<void>
  onSelectFolder(folderId: string): void
}) {
  const scopedFolders = folders
    .filter((folder) => folder.scope === scope)
    .sort((left, right) => left.order - right.order)

  return (
    <>
      <div className="sidebar-heading compact-sidebar-heading">
        <p className="sidebar-label">{title}</p>
        <div className="sidebar-heading-actions">
          <Button
            aria-label="폴더 추가"
            className="sidebar-mini-button"
            isIconOnly
            variant="ghost"
            type="button"
            onClick={() => void onCreateFolder(scope)}
          >
            {getCommonIcon('add')}
          </Button>
          <Button
            aria-label="폴더 편집"
            className="sidebar-mini-button"
            isIconOnly
            variant={editMode ? 'secondary' : 'ghost'}
            type="button"
            onClick={() => onEditModeChange(!editMode)}
          >
            {getCommonIcon('edit')}
          </Button>
        </div>
      </div>
      <FolderButton
        count={count}
        icon={getCommonIcon('list')}
        id="all"
        isSelected={selectedFolderId === 'all'}
        label="전체"
        onSelect={onSelectFolder}
      />
      <FolderButton
        count={0}
        icon={getCommonIcon('starred')}
        id="favorites"
        isSelected={selectedFolderId === 'favorites'}
        label="즐겨찾기"
        onSelect={onSelectFolder}
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
            iconClosed={getCommonIcon('folderClose')}
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

function EditableFolderRow({
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
    <div className="sidebar-folder-editor">
      <input
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

function FolderButton({
  count,
  icon,
  iconClosed,
  id,
  isSelected,
  label,
  onSelect,
}: {
  count: number
  icon: ReactNode
  iconClosed?: ReactNode
  id: string
  isSelected: boolean
  label: string
  onSelect(id: string): void
}) {
  return (
    <Button
      className={`sidebar-item${isSelected ? ' is-active' : ''}`}
      variant={isSelected ? 'secondary' : 'ghost'}
      type="button"
      onClick={() => onSelect(id)}
    >
      <span aria-hidden="true">{isSelected ? icon : iconClosed ?? icon}</span>
      <strong>{label}</strong>
      <em>{count}</em>
    </Button>
  )
}

function createRunCategories(workflows: WorkflowDefinition[]): {
  id: NavigationCategory
  icon: ReactNode
  label: string
  count: number
}[] {
  return [
    {
      id: 'all',
      icon: getCommonIcon('list'),
      label: '전체',
      count: workflows.length,
    },
    { id: 'favorites', icon: getCommonIcon('starred'), label: '즐겨찾기', count: 0 },
    {
      id: 'running',
      icon: getCommonIcon('running'),
      label: '실행 중',
      count: workflows.filter((workflow) => workflow.state.status === 'running')
        .length,
    },
    {
      id: 'scheduled',
      icon: getCommonIcon('scheduled'),
      label: '예약됨',
      count: workflows.filter((workflow) => workflow.schedule?.enabled).length,
    },
    {
      id: 'failed',
      icon: getCommonIcon('warning'),
      label: '실패',
      count: workflows.filter((workflow) => workflow.state.status === 'failed')
        .length,
    },
    {
      id: 'restricted',
      icon: getCommonIcon('blocked'),
      label: '제한됨',
      count: workflows.filter((workflow) =>
        isRestrictedDevicePolicy(workflow.permissions),
      ).length,
    },
    {
      id: 'secret_required',
      icon: getCommonIcon('secret'),
      label: 'Secret 필요',
      count: workflows.filter(
        (workflow) => (workflow.permissions.secretRefs?.length ?? 0) > 0,
      ).length,
    },
  ]
}

const settingsCategories: {
  id: SettingsCategory
  label: string
}[] = [
  { id: 'general', label: '일반' },
  { id: 'appearance', label: '모양' },
  { id: 'browser', label: '브라우저' },
  { id: 'shortcuts', label: '단축키' },
  { id: 'devices', label: '기기' },
  { id: 'secrets', label: 'Secret' },
  { id: 'sync', label: '동기화' },
  { id: 'events', label: '실행 이벤트' },
  { id: 'data', label: '데이터 관리' },
  { id: 'developer', label: '개발자' },
]
