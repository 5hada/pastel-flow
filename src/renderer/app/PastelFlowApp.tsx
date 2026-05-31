import { ActionWorkspacePanel } from './components/actions/ActionWorkspacePanel'
import { TaskLaunchPanel } from './components/run/TaskLaunchPanel'
import { AppSettingsPanel } from './components/settings/AppSettingsPanel'
import { AppHeader } from './components/shell/AppHeader'
import { WorkspaceSidebar } from './components/shell/WorkspaceSidebar'
import { EditWorkspace } from './components/tasks/EditWorkspace'
import { ToolsPanel } from './components/tools/ToolsPanel'
import { usePastelFlowApp } from './usePastelFlowApp'
import {
  createToolInputDefaults,
  getNavigationCategoryLabel,
} from './utils/viewLabels'

function App() {
  const {
    actions,
    appSettings,
    confirmDeleteTaskId,
    createForm,
    currentDevice,
    editForm,
    errorMessage,
    isLoading,
    isSidebarOpen,
    pruneMessage,
    runningWorkflowId,
    secretForm,
    secretStorageStatus,
    secrets,
    selectedActionId,
    selectedCategory,
    selectedSettingsCategory,
    selectedTask,
    selectedToolId,
    selectedWorkflowId,
    settingsErrorMessage,
    settingsForm,
    settingsSaveState,
    stoppingWorkflowId,
    syncMessage,
    syncResult,
    syncStatus,
    taskRunEvents,
    tasks,
    toolInputValues,
    toolMessage,
    toolModules,
    toolRunResult,
    userDataPath,
    workflows,
    workspaceMode,
    closeSettingsMode,
    handleCreateSecret,
    handleCreateTask,
    handleCreateWorkflow,
    handleDeleteWorkflow,
    handleCreateToolAction,
    handleDeleteSecret,
    handleDeleteAction,
    handleDeleteTask,
    handleExportSyncSnapshot,
    handleExportSyncSnapshotFile,
    handleImportSyncSnapshot,
    handleImportSyncSnapshotFile,
    handlePruneTaskRunEvents,
    handleRegisterToolModule,
    handleRunWorkflow,
    handleRunToolModule,
    handleSaveSettings,
    handleStopWorkflow,
    handleTaskListDisplayModeChange,
    handleUpdateTask,
    handleUpdateAction,
    handleUpdateWorkflow,
    handleWorkflowGridColumnCountChange,
    openActionMode,
    openCategory,
    openRunMode,
    openSettingsMode,
    openToolsMode,
    openWorkflowMode,
    refreshWorkspaceData,
    selectWorkflow,
    setConfirmDeleteTaskId,
    setCreateForm,
    setEditForm,
    setIsSidebarOpen,
    setSecretForm,
    setSettingsForm,
    setSelectedActionId,
    setSelectedSettingsCategory,
    setSelectedTaskId,
    setSelectedToolId,
    setSelectedWorkflowId,
    setToolInputValues,
    setToolMessage,
    setToolRunResult,
  } = usePastelFlowApp()

  return (
    <main className="app-shell">
      <AppHeader
        actionCount={actions.length}
        currentMode={workspaceMode}
        isLoading={isLoading}
        toolCount={toolModules.length}
        workflowCount={workflows.length}
        onActions={openActionMode}
        onRefresh={refreshWorkspaceData}
        onRun={openRunMode}
        onSettings={openSettingsMode}
        onTools={openToolsMode}
        onWorkflows={openWorkflowMode}
      />

      {errorMessage ? <p className="error-message">{errorMessage}</p> : null}

      <div className={`app-workspace${isSidebarOpen ? '' : ' is-sidebar-collapsed'}`}>
        <button
          aria-label={isSidebarOpen ? '좌측 패널 닫기' : '좌측 패널 열기'}
          className="sidebar-toggle workspace-sidebar-toggle"
          type="button"
          title={isSidebarOpen ? '패널 닫기' : '패널 열기'}
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          ☰
        </button>

        {isSidebarOpen ? (
          <WorkspaceSidebar
            actions={actions}
            tasks={tasks}
            toolModules={toolModules}
            workflows={workflows}
            currentMode={workspaceMode}
            selectedCategory={selectedCategory}
            selectedActionId={selectedActionId}
            selectedSettingsCategory={selectedSettingsCategory}
            selectedToolId={selectedToolId}
            selectedWorkflowId={selectedWorkflowId}
            onCategorySelect={openCategory}
            onCreateAction={() => setSelectedActionId(null)}
            onCreateWorkflow={() => {
              setSelectedWorkflowId(null)
              setSelectedTaskId(null)
            }}
            onSelectAction={setSelectedActionId}
            onSelectSettingsCategory={setSelectedSettingsCategory}
            onSelectTool={(tool) => {
              setSelectedToolId(tool.id)
              setToolRunResult(null)
              setToolMessage(null)
              setToolInputValues(createToolInputDefaults(tool))
            }}
            onSelectWorkflow={selectWorkflow}
          />
        ) : null}

        <div className="workspace-content">
          {workspaceMode === 'run' ? (
            <TaskLaunchPanel
              workflows={workflows}
              categoryLabel={getNavigationCategoryLabel(selectedCategory)}
              displayMode={appSettings.taskListDisplayMode}
              isLoading={isLoading}
              runningWorkflowId={runningWorkflowId}
              selectedWorkflowId={selectedWorkflowId}
              stoppingWorkflowId={stoppingWorkflowId}
              gridColumnCount={appSettings.workflowGridColumnCount}
              workflowHierarchy={appSettings.workflowHierarchy}
              onCreate={openWorkflowMode}
              onDisplayModeChange={handleTaskListDisplayModeChange}
              onGridColumnCountChange={handleWorkflowGridColumnCountChange}
              onRun={handleRunWorkflow}
              onStop={handleStopWorkflow}
              onSelect={selectWorkflow}
            />
          ) : null}

          {workspaceMode === 'actions' ? (
            <ActionWorkspacePanel
              actions={actions}
              createForm={createForm}
              currentDevice={currentDevice}
              developerVisibility={appSettings.developerVisibility}
              profilePresets={appSettings.browserProfilePresets}
              selectedActionId={selectedActionId}
              secrets={secrets}
              onChange={setCreateForm}
              onDeleteAction={handleDeleteAction}
              onSelectAction={setSelectedActionId}
              onSubmit={handleCreateTask}
              onUpdateAction={handleUpdateAction}
            />
          ) : null}

          {workspaceMode === 'workflows' ? (
            <EditWorkspace
              actions={actions}
              confirmDeleteTaskId={confirmDeleteTaskId}
              currentDevice={currentDevice}
              editForm={editForm}
              profilePresets={appSettings.browserProfilePresets}
              developerVisibility={appSettings.developerVisibility}
              isLoading={isLoading}
              secrets={secrets}
              selectedWorkflowId={selectedWorkflowId}
              onChange={setEditForm}
              onConfirmDelete={handleDeleteTask}
              onConfirmDeleteWorkflow={handleDeleteWorkflow}
              onDeleteRequest={setConfirmDeleteTaskId}
              onSubmit={handleUpdateTask}
              onCreateWorkflow={handleCreateWorkflow}
              onUpdateWorkflow={handleUpdateWorkflow}
              selectedTask={selectedTask}
              taskRunEvents={taskRunEvents}
              workflows={workflows}
            />
          ) : null}

          {workspaceMode === 'tools' ? (
            <ToolsPanel
              selectedToolId={selectedToolId}
              toolInputValues={toolInputValues}
              toolMessage={toolMessage}
              toolModules={toolModules}
              toolRunResult={toolRunResult}
              showToolMetadata={appSettings.developerVisibility.showToolMetadata}
              onCreateToolAction={handleCreateToolAction}
              onRegisterToolModule={handleRegisterToolModule}
              onRunToolModule={handleRunToolModule}
              onToolInputChange={(key, value) =>
                setToolInputValues((currentValues) => ({
                  ...currentValues,
                  [key]: value,
                }))
              }
            />
          ) : null}

          {workspaceMode === 'settings' ? (
            <section className="mode-panel" aria-label="앱 설정">
              <AppSettingsPanel
                form={settingsForm}
                pruneMessage={pruneMessage}
                onChange={setSettingsForm}
                onClose={closeSettingsMode}
                onSubmit={handleSaveSettings}
                saveState={settingsSaveState}
                settingsErrorMessage={settingsErrorMessage}
                secretForm={secretForm}
                secretStorageStatus={secretStorageStatus}
                secrets={secrets}
                currentDevice={currentDevice}
                userDataPath={userDataPath}
                onCreateSecret={handleCreateSecret}
                onDeleteSecret={handleDeleteSecret}
                onSecretFormChange={setSecretForm}
                selectedCategory={selectedSettingsCategory}
                syncMessage={syncMessage}
                syncResult={syncResult}
                syncStatus={syncStatus}
                onExportSyncSnapshot={handleExportSyncSnapshot}
                onExportSyncSnapshotFile={handleExportSyncSnapshotFile}
                onImportSyncSnapshot={handleImportSyncSnapshot}
                onImportSyncSnapshotFile={handleImportSyncSnapshotFile}
                onPruneTaskRunEvents={handlePruneTaskRunEvents}
                onRegisterToolModule={handleRegisterToolModule}
              />
            </section>
          ) : null}
        </div>
      </div>
    </main>
  )
}

export default App
