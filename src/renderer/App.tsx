import { Button } from '@heroui/react'
import { ChevronLeft, ChevronRight } from '@gravity-ui/icons';
import { usePastelFlowApp } from './shared/hooks/usePastelFlowApp'
import { createToolInputDefaults } from './shared/utils/viewLabels'
import { AppHeader } from './shared/layouts/AppHeader'
import { Workspace } from './shared/layouts/Workspace'
import { WorkspaceSidebar } from './shared/layouts/WorkspaceSidebar'
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
        <Button
          aria-label={app.isSidebarOpen ? '좌측 패널 닫기' : '좌측 패널 열기'}
          className="sidebar-toggle workspace-sidebar-toggle"
          isIconOnly
          variant="ghost"
          type="button"
          onClick={() => app.setIsSidebarOpen(!app.isSidebarOpen)}
        >
          {app.isSidebarOpen ? <ChevronLeft/> : <ChevronRight/>}
        </Button>

        {app.isSidebarOpen ? (
          <WorkspaceSidebar
            actions={app.actions}
            currentMode={app.workspaceMode}
            selectedCategory={app.selectedCategory}
            selectedActionId={app.selectedActionId}
            selectedCollectionFolderId={app.selectedCollectionFolderId}
            selectedSettingsCategory={app.selectedSettingsCategory}
            selectedToolId={app.selectedToolId}
            selectedWorkflowId={app.selectedWorkflowId}
            toolModules={app.toolModules}
            workflows={app.workflows}
            workspaceFolders={app.appSettings.workspaceFolders}
            onCategorySelect={app.openCategory}
            onCollectionFolderSelect={(folderId) => {
              app.setSelectedCollectionFolderId(folderId)
              if (app.workspaceMode === 'actions') {
                app.setSelectedActionId(null)
              }
              if (app.workspaceMode === 'workflows') {
                app.setSelectedWorkflowId(null)
              }
              if (app.workspaceMode === 'tools') {
                app.setSelectedToolId(null)
              }
            }}
            onCreateFolder={app.createWorkspaceFolder}
            onDeleteFolder={app.deleteWorkspaceFolder}
            onMoveFolder={app.moveWorkspaceFolder}
            onRenameFolder={app.renameWorkspaceFolder}
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
