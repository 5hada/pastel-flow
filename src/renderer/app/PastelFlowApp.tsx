import { ActionWorkspacePanel } from './components/actions/ActionWorkspacePanel'
import { TaskLaunchPanel } from './components/run/TaskLaunchPanel'
import { AppSettingsPanel } from './components/settings/AppSettingsPanel'
import { TopModeBar } from './components/shell/TopModeBar'
import { WorkspaceSidebar } from './components/shell/WorkspaceSidebar'
import { EditWorkspace } from './components/tasks/EditWorkspace'
import { ToolsPanel } from './components/tools/ToolsPanel'
import { usePastelFlowApp } from './usePastelFlowApp'
import {
  createToolInputDefaults,
  getNavigationCategoryLabel,
  getWorkspaceModeLabel,
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
    runningTaskId,
    secretForm,
    secretStorageStatus,
    secrets,
    selectedActionId,
    selectedCategory,
    selectedSettingsCategory,
    selectedTask,
    selectedTaskId,
    selectedToolId,
    selectedWorkflowId,
    settingsErrorMessage,
    settingsForm,
    settingsSaveState,
    stoppingTaskId,
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
    visibleTasks,
    workflows,
    workspaceMode,
    closeSettingsMode,
    handleCreateSecret,
    handleCreateTask,
    handleCreateToolAction,
    handleDeleteSecret,
    handleDeleteTask,
    handleExportSyncSnapshot,
    handleExportSyncSnapshotFile,
    handleImportSyncSnapshot,
    handleImportSyncSnapshotFile,
    handlePruneTaskRunEvents,
    handleRegisterToolModule,
    handleRunTask,
    handleRunToolModule,
    handleSaveSettings,
    handleStopTask,
    handleTaskListDisplayModeChange,
    handleUpdateTask,
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
    startEditing,
  } = usePastelFlowApp()

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>Pastel Flow</h1>
          <p>{getWorkspaceModeLabel(workspaceMode)}</p>
        </div>
        <TopModeBar
          currentMode={workspaceMode}
          onActions={openActionMode}
          onRun={openRunMode}
          onSettings={openSettingsMode}
          onTools={openToolsMode}
          onWorkflows={openWorkflowMode}
        />
        <button
          aria-label="작업 목록 새로고침"
          className="topbar-button"
          type="button"
          disabled={isLoading}
          title="새로고침"
          onClick={() => void refreshWorkspaceData()}
        >
          {isLoading ? '...' : '↻'}
        </button>
      </header>

      {errorMessage ? <p className="error-message">{errorMessage}</p> : null}

      <div className={`app-workspace${isSidebarOpen ? '' : ' is-sidebar-collapsed'}`}>
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
            onClose={() => setIsSidebarOpen(false)}
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
          {!isSidebarOpen ? (
            <button
              aria-label="좌측 패널 열기"
              className="sidebar-toggle floating-toggle"
              type="button"
              title="패널 열기"
              onClick={() => setIsSidebarOpen(true)}
            >
              ☰
            </button>
          ) : null}

          {workspaceMode === 'run' ? (
            <TaskLaunchPanel
              tasks={visibleTasks}
              categoryLabel={getNavigationCategoryLabel(selectedCategory)}
              displayMode={appSettings.taskListDisplayMode}
              isLoading={isLoading}
              runningTaskId={runningTaskId}
              selectedTaskId={selectedTaskId}
              stoppingTaskId={stoppingTaskId}
              gridColumnCount={appSettings.workflowGridColumnCount}
              onCreate={openWorkflowMode}
              onDisplayModeChange={handleTaskListDisplayModeChange}
              onGridColumnCountChange={handleWorkflowGridColumnCountChange}
              onRun={handleRunTask}
              onStop={handleStopTask}
              onSelect={(task) => {
                setSelectedTaskId(task.id)
                setConfirmDeleteTaskId(null)
                startEditing(task)
              }}
            />
          ) : null}

          {workspaceMode === 'actions' ? (
            <ActionWorkspacePanel
              actions={actions}
              createForm={createForm}
              currentDevice={currentDevice}
              selectedActionId={selectedActionId}
              secrets={secrets}
              onChange={setCreateForm}
              onSelectAction={setSelectedActionId}
              onSubmit={handleCreateTask}
            />
          ) : null}

          {workspaceMode === 'workflows' ? (
            <EditWorkspace
              actions={actions}
              confirmDeleteTaskId={confirmDeleteTaskId}
              currentDevice={currentDevice}
              editForm={editForm}
              isLoading={isLoading}
              secrets={secrets}
              selectedWorkflowId={selectedWorkflowId}
              onChange={setEditForm}
              onConfirmDelete={handleDeleteTask}
              onDeleteRequest={setConfirmDeleteTaskId}
              onSelectWorkflow={setSelectedWorkflowId}
              onSubmit={handleUpdateTask}
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
              />
            </section>
          ) : null}
        </div>
      </div>
    </main>
  )
}

export default App
