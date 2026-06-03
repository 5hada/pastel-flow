import { usePastelFlowApp } from './shared/hooks/usePastelFlowApp'
import { createToolInputDefaults } from './shared/utils/viewLabels'
import { AppHeader } from './shared/layouts/AppHeader'
import { Workspace } from './shared/layouts/Workspace'
import { WorkspaceSidebar } from './shared/layouts/WorkspaceSidebar'
import { IconButton } from './shared/components/IconButton'
import './shared/styles/index.css'

export default function App() {
  const app = usePastelFlowApp()

  return (
    <main className="app-shell">
      <AppHeader
        infoLabelProps={{
          actionCount: app.actions.length,
          workflowCount: app.workflows.length,
          toolCount: app.toolModules.length,
        }}
        modeTogglesProps={{
          currentMode: app.workspaceMode,
          onRun: app.openRunMode,
          onActions: app.openActionMode,
          onWorkflows: app.openWorkflowMode,
          onTools: app.openToolsMode,
          onSettings: app.openSettingsMode,
        }}
        isLoading={app.isLoading}
        onRefresh={app.refreshWorkspaceData}
      />

      {app.errorMessage ? <p className="error-message">{app.errorMessage}</p> : null}

      <div className={`app-workspace${app.isSidebarOpen ? '' : ' is-sidebar-collapsed'}`}>
        <IconButton
          aria-label={app.isSidebarOpen ? '좌측 패널 닫기' : '좌측 패널 열기'}
          className="sidebar-toggle workspace-sidebar-toggle"
          icon="☰"
          type="button"
          onClick={() => app.setIsSidebarOpen(!app.isSidebarOpen)}
        />

        {app.isSidebarOpen ? (
          <WorkspaceSidebar
            actions={app.actions}
            tasks={app.tasks}
            toolModules={app.toolModules}
            workflows={app.workflows}
            currentMode={app.workspaceMode}
            selectedCategory={app.selectedCategory}
            selectedActionId={app.selectedActionId}
            selectedSettingsCategory={app.selectedSettingsCategory}
            selectedToolId={app.selectedToolId}
            selectedWorkflowId={app.selectedWorkflowId}
            onCategorySelect={app.openCategory}
            onCreateAction={() => app.setSelectedActionId(null)}
            onCreateWorkflow={() => {
              app.setSelectedWorkflowId(null)
              app.setSelectedTaskId(null)
            }}
            onSelectAction={app.setSelectedActionId}
            onSelectSettingsCategory={app.setSelectedSettingsCategory}
            onSelectTool={(tool) => {
              app.setSelectedToolId(tool.id)
              app.setToolRunResult(null)
              app.setToolMessage(null)
              app.setToolInputValues(createToolInputDefaults(tool))
            }}
            onSelectWorkflow={app.selectWorkflow}
          />
        ) : null}

        <div className="workspace-content">
          <Workspace currentMode={app.workspaceMode} context={app} />
        </div>
      </div>
    </main>
  )
}
