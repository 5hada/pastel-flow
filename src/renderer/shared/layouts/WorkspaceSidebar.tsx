import { Button } from '@heroui/react'
import {
  CurlyBrackets,
  Database,
  Bell,
  ArrowsRotateLeft,
  ShieldKeyhole,
  Display,
  Keyboard,
  Magnifier,
  Palette,
  Circles4Square,
  ListUl,
  Star,
  ClockArrowRotateLeft,
  TriangleExclamation,
  Arrows3RotateRight,
  Ban
} from '@gravity-ui/icons';
import { useState } from 'react'
import {
  type ActionDefinition,
} from '../../../shared/actions'
import { isRestrictedDevicePolicy } from '../../../shared/devices'
import type { WorkflowDefinition } from '../../../shared/workflows'
import type { RegisteredToolModule } from '../../../shared/tools'
import type { NavigationCategory, SettingsCategory, WorkspaceMode } from '../state/taskFormState'
import { getActionTypeLabel } from '../utils/viewLabels'

export type WorkspaceSidebarProps = {
  currentMode: WorkspaceMode
  selectedCategory: NavigationCategory
  selectedActionId: string | null
  selectedSettingsCategory: SettingsCategory
  selectedToolId: string | null
  selectedWorkflowId: string | null
  actions: ActionDefinition[]
  toolModules: RegisteredToolModule[]
  workflows: WorkflowDefinition[]
  onCategorySelect(category: NavigationCategory): void
  onCreateAction(): void
  onCreateWorkflow(): void
  onSelectAction(actionId: string): void
  onSelectSettingsCategory(category: SettingsCategory): void
  onSelectTool(tool: RegisteredToolModule): void
  onSelectWorkflow(workflow: WorkflowDefinition): void
}

export function WorkspaceSidebar({
  toolModules,
  actions,
  workflows,
  currentMode,
  selectedCategory,
  selectedActionId,
  selectedSettingsCategory,
  selectedToolId,
  selectedWorkflowId,
  onCategorySelect,
  onCreateAction,
  onCreateWorkflow,
  onSelectAction,
  onSelectSettingsCategory,
  onSelectTool,
  onSelectWorkflow,
}: WorkspaceSidebarProps) {
  const [actionTypeFilter, setActionTypeFilter] = useState<
    ActionDefinition['type'] | 'all'
  >('all')
  const restrictedCount = workflows.filter((workflow) =>
    isRestrictedDevicePolicy(workflow.permissions),
  ).length
  const favoritesCount = workflows.filter((workflow) =>
    {}
  ).length
  const runningCount = workflows.filter(
    (workflow) => workflow.state.status === 'running',
  ).length
  const scheduledCount = workflows.filter((workflow) => workflow.schedule?.enabled).length
  const failedCount = workflows.filter(
    (workflow) => workflow.state.status === 'failed',
  ).length
  const secretCount = workflows.filter(
    (workflow) => (workflow.permissions.secretRefs?.length ?? 0) > 0,
  ).length
  const runCategories: {
    id: NavigationCategory
    icon: any
    label: string
    count: number
  }[] = [
    { id: 'all', icon: <ListUl/>, label: '전체', count: workflows.length },
    { id: 'favorites', icon: <Star/>, label: '즐겨찾기', count: favoritesCount },
    { id: 'running', icon: <Arrows3RotateRight/>, label: '실행 중', count: runningCount },
    { id: 'scheduled', icon: <ClockArrowRotateLeft/>, label: '예약됨', count: scheduledCount },
    { id: 'failed', icon: <TriangleExclamation/>, label: '실패', count: failedCount },
    { id: 'restricted', icon: <Ban/>, label: '제한됨', count: restrictedCount },
    { id: 'secret_required', icon: <ShieldKeyhole/>, label: 'Secret 필요', count: secretCount },
  ]
  const settingsCategories: {
    id: SettingsCategory
    icon: any
    label: string
  }[] = [
    { id: 'general', icon: <Circles4Square/>, label: '일반' },
    { id: 'appearance', icon: <Palette/>, label: '모양' },
    { id: 'browser', icon: <Magnifier/>, label: '브라우저' },
    { id: 'shortcuts', icon: <Keyboard/>, label: '단축키' },
    { id: 'devices', icon: <Display/>, label: '기기' },
    { id: 'secrets', icon: <ShieldKeyhole/>, label: 'Secret' },
    { id: 'sync', icon: <ArrowsRotateLeft/>, label: '동기화' },
    { id: 'events', icon: <Bell/>, label: '실행 이벤트' },
    { id: 'data', icon: <Database/>, label: '데이터 관리' },
    { id: 'developer', icon: <CurlyBrackets/>, label: '개발자' },
  ] 
  const actionTypeOptions = Array.from(
    new Set(actions.map((action) => action.type)),
  )
  const visibleActions = actions.filter(
    (action) => actionTypeFilter === 'all' || action.type === actionTypeFilter,
  )

  return (
    <aside className="workspace-sidebar" aria-label="보조 패널">
      <div className="sidebar-group">
        {currentMode === 'run'
          ? runCategories.map((category) => (
              <Button
                className={`sidebar-item${
                  selectedCategory === category.id ? ' is-active' : ''
                }`}
                variant={selectedCategory === category.id ? 'secondary' : 'ghost'}
                key={category.id}
                type="button"
                onClick={() => onCategorySelect(category.id)}
              >
                <span aria-hidden="true">{category.icon}</span>
                <strong>{category.label}</strong>
                <em>{category.count}</em>
              </Button>
            ))
          : null}

        {currentMode === 'actions' ? (
          <>
            <div className="sidebar-heading compact-sidebar-heading">
              <p className="sidebar-label">Action 목록</p>
              <Button
                aria-label="새 Action"
                className="sidebar-mini-button"
                isIconOnly
                variant="ghost"
                type="button"
                onClick={onCreateAction}
              >
                +
              </Button>
            </div>
            {actions.length === 0 ? (
              <div className="sidebar-empty">
                <strong>Action</strong>
                <span>저장된 Action이 없습니다.</span>
              </div>
            ) : (
              <>
                <div className="sidebar-filter-bar">
                  <Button
                    className={actionTypeFilter === 'all' ? 'is-active' : ''}
                    variant={actionTypeFilter === 'all' ? 'secondary' : 'ghost'}
                    type="button"
                    onClick={() => setActionTypeFilter('all')}
                  >
                    전체
                  </Button>
                  {actionTypeOptions.map((actionType) => (
                    <Button
                      className={
                        actionTypeFilter === actionType ? 'is-active' : ''
                      }
                      variant={actionTypeFilter === actionType ? 'secondary' : 'ghost'}
                      key={actionType}
                      type="button"
                      onClick={() => setActionTypeFilter(actionType)}
                    >
                      {getActionTypeLabel(actionType)}
                    </Button>
                  ))}
                </div>
                {visibleActions.map((action) => (
                  <Button
                    className={`sidebar-item task-sidebar-item${
                      selectedActionId === action.id ? ' is-active' : ''
                    }`}
                    variant={selectedActionId === action.id ? 'secondary' : 'ghost'}
                    key={action.id}
                    type="button"
                    onClick={() => onSelectAction(action.id)}
                  >
                    <span aria-hidden="true">◇</span>
                    <strong>{action.name}</strong>
                    <em>{getActionTypeLabel(action.type)}</em>
                  </Button>
                ))}
              </>
            )}
          </>
        ) : null}

        {currentMode === 'workflows' ? (
          <>
            <div className="sidebar-heading compact-sidebar-heading">
              <p className="sidebar-label">Workflow 목록</p>
              <Button
                aria-label="새 Workflow"
                className="sidebar-mini-button"
                isIconOnly
                variant="ghost"
                type="button"
                onClick={onCreateWorkflow}
              >
                +
              </Button>
            </div>
            {workflows.length === 0 ? (
              <div className="sidebar-empty">
                <strong>Workflow</strong>
                <span>저장된 Workflow가 없습니다.</span>
              </div>
            ) : (
              workflows.map((workflow) => (
                <Button
                  className={`sidebar-item task-sidebar-item${
                    selectedWorkflowId === workflow.id ? ' is-active' : ''
                  }`}
                  variant={selectedWorkflowId === workflow.id ? 'secondary' : 'ghost'}
                  key={workflow.id}
                  type="button"
                  onClick={() => onSelectWorkflow(workflow)}
                >
                  <span aria-hidden="true">□</span>
                  <strong>{workflow.name}</strong>
                  <em>{workflow.actionRefs.length}개</em>
                </Button>
              ))
            )}
          </>
        ) : null}

        {currentMode === 'tools' ? (
          toolModules.length === 0 ? (
            <div className="sidebar-empty px-3 py-2">
              <strong>Tool Module</strong><br/>
              <span>등록된 도구가 없습니다.</span>
            </div>
          ) : (
            toolModules.map((tool) => (
              <Button
                className={`sidebar-item task-sidebar-item${
                  selectedToolId === tool.id ? ' is-active' : ''
                }`}
                variant={selectedToolId === tool.id ? 'secondary' : 'ghost'}
                key={tool.id}
                type="button"
                onClick={() => onSelectTool(tool)}
              >
                <span aria-hidden="true">◇</span>
                <strong>{tool.manifest.name}</strong>
                <em>v{tool.manifest.version}</em>
              </Button>
            ))
          )
        ) : null}

        {currentMode === 'settings'
          ? settingsCategories.map((category) => (
              <Button
                className={`sidebar-item${
                  selectedSettingsCategory === category.id ? ' is-active' : ''
                }`}
                variant={selectedSettingsCategory === category.id ? 'secondary' : 'ghost'}
                key={category.id}
                type="button"
                onClick={() => onSelectSettingsCategory(category.id)}
              >
                <span aria-hidden="true">{category.icon}</span>
                <strong>{category.label}</strong>
              </Button>
            ))
          : null}
      </div>

      <div className="sidebar-note">
        <span>Local first</span>
        <strong>전용 프로필</strong>
      </div>
    </aside>
  )
}
