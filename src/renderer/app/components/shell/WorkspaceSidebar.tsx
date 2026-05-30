import {
  isRestrictedDevicePolicy,
  type ActionDefinition,
  type TaskTemplate,
  type WorkflowDefinition,
} from '../../../../shared/tasks'
import type { RegisteredToolModule } from '../../../../shared/tools'
import type { NavigationCategory, SettingsCategory, WorkspaceMode } from '../../taskFormState'
import { getActionTypeLabel } from '../../utils/viewLabels'

export type WorkspaceSidebarProps = {
  currentMode: WorkspaceMode
  selectedCategory: NavigationCategory
  selectedActionId: string | null
  selectedSettingsCategory: SettingsCategory
  selectedToolId: string | null
  selectedWorkflowId: string | null
  actions: ActionDefinition[]
  tasks: TaskTemplate[]
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
  tasks,
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
  const restrictedCount = tasks.filter((task) =>
    isRestrictedDevicePolicy(task.permissions),
  ).length
  const runningCount = tasks.filter(
    (task) => task.state.status === 'running',
  ).length
  const scheduledCount = tasks.filter((task) => task.schedule?.enabled).length
  const failedCount = tasks.filter((task) => task.state.status === 'failed').length
  const secretCount = tasks.filter(
    (task) => (task.permissions.secretRefs?.length ?? 0) > 0,
  ).length
  const runCategories: {
    id: NavigationCategory
    icon: string
    label: string
    count: number
  }[] = [
    { id: 'all', icon: '□', label: '전체', count: tasks.length },
    { id: 'running', icon: '●', label: '실행 중', count: runningCount },
    { id: 'scheduled', icon: '◷', label: '예약됨', count: scheduledCount },
    { id: 'failed', icon: '!', label: '실패', count: failedCount },
    { id: 'restricted', icon: '◇', label: '제한됨', count: restrictedCount },
    { id: 'secret_required', icon: '◆', label: 'Secret 필요', count: secretCount },
  ]
  const settingsCategories: {
    id: SettingsCategory
    icon: string
    label: string
  }[] = [
    { id: 'general', icon: '◌', label: '일반' },
    { id: 'browser', icon: '▤', label: '브라우저' },
    { id: 'shortcuts', icon: '⌘', label: '단축키' },
    { id: 'devices', icon: '▣', label: '기기' },
    { id: 'secrets', icon: '◆', label: 'Secret' },
    { id: 'sync', icon: '⇄', label: '동기화' },
    { id: 'events', icon: '≡', label: '실행 이벤트' },
    { id: 'data', icon: '▥', label: '데이터 관리' },
  ]

  return (
    <aside className="workspace-sidebar" aria-label="보조 패널">
      <div className="sidebar-group">
        {currentMode === 'run'
          ? runCategories.map((category) => (
              <button
                className={`sidebar-item${
                  selectedCategory === category.id ? ' is-active' : ''
                }`}
                key={category.id}
                type="button"
                onClick={() => onCategorySelect(category.id)}
              >
                <span aria-hidden="true">{category.icon}</span>
                <strong>{category.label}</strong>
                <em>{category.count}</em>
              </button>
            ))
          : null}

        {currentMode === 'actions' ? (
          <>
            <div className="sidebar-heading compact-sidebar-heading">
              <p className="sidebar-label">Action 목록</p>
              <button
                aria-label="새 Action"
                className="sidebar-mini-button"
                title="새 Action"
                type="button"
                onClick={onCreateAction}
              >
                +
              </button>
            </div>
            {actions.length === 0 ? (
              <div className="sidebar-empty">
                <strong>Action</strong>
                <span>저장된 Action이 없습니다.</span>
              </div>
            ) : (
              actions.map((action) => (
                <button
                  className={`sidebar-item task-sidebar-item${
                    selectedActionId === action.id ? ' is-active' : ''
                  }`}
                  key={action.id}
                  type="button"
                  onClick={() => onSelectAction(action.id)}
                >
                  <span aria-hidden="true">◇</span>
                  <strong>{action.name}</strong>
                  <em>{getActionTypeLabel(action.type)}</em>
                </button>
              ))
            )}
          </>
        ) : null}

        {currentMode === 'workflows' ? (
          <>
            <div className="sidebar-heading compact-sidebar-heading">
              <p className="sidebar-label">Workflow 목록</p>
              <button
                aria-label="새 Workflow"
                className="sidebar-mini-button"
                title="새 Workflow"
                type="button"
                onClick={onCreateWorkflow}
              >
                +
              </button>
            </div>
            {workflows.length === 0 ? (
              <div className="sidebar-empty">
                <strong>Workflow</strong>
                <span>저장된 Workflow가 없습니다.</span>
              </div>
            ) : (
              workflows.map((workflow) => (
                <button
                  className={`sidebar-item task-sidebar-item${
                    selectedWorkflowId === workflow.id ? ' is-active' : ''
                  }`}
                  key={workflow.id}
                  type="button"
                  onClick={() => onSelectWorkflow(workflow)}
                >
                  <span aria-hidden="true">□</span>
                  <strong>{workflow.name}</strong>
                  <em>{workflow.actionRefs.length}개</em>
                </button>
              ))
            )}
          </>
        ) : null}

        {currentMode === 'tools' ? (
          toolModules.length === 0 ? (
            <div className="sidebar-empty">
              <strong>Tool Module</strong>
              <span>등록된 도구가 없습니다.</span>
            </div>
          ) : (
            toolModules.map((tool) => (
              <button
                className={`sidebar-item task-sidebar-item${
                  selectedToolId === tool.id ? ' is-active' : ''
                }`}
                key={tool.id}
                type="button"
                onClick={() => onSelectTool(tool)}
              >
                <span aria-hidden="true">◇</span>
                <strong>{tool.manifest.name}</strong>
                <em>v{tool.manifest.version}</em>
              </button>
            ))
          )
        ) : null}

        {currentMode === 'settings'
          ? settingsCategories.map((category) => (
              <button
                className={`sidebar-item${
                  selectedSettingsCategory === category.id ? ' is-active' : ''
                }`}
                key={category.id}
                type="button"
                onClick={() => onSelectSettingsCategory(category.id)}
              >
                <span aria-hidden="true">{category.icon}</span>
                <strong>{category.label}</strong>
              </button>
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
