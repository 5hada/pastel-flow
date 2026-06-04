import { getNavigationCategoryLabel } from '../../utils/viewLabels'
import type { WorkspaceMode } from '../../state/taskFormState'
import { ActionsWorkspace } from '../../../features/actions/ActionsWorkspace'
import { RunWorkspace } from '../../../features/run/RunWorkspace'
import { SettingsWorkspace } from '../../../features/settings/SettingsWorkspace'
import { ToolsWorkspace } from '../../../features/tools/ToolsWorkspace'
import { WorkflowsWorkspace } from '../../../features/workflows/WorkflowsWorkspace'
import type { WorkspaceContext, WorkspaceTemplate } from './types'

export const workspaceTemplates: WorkspaceTemplate[] = [
  {
    type: 'run',
    render(context: WorkspaceContext) {
      const props = {
        workflows: context.workflows,
        categoryLabel: getNavigationCategoryLabel(context.selectedCategory),
        displayMode: context.appSettings.workflowListDisplayMode,
        isLoading: context.isLoading,
        runningWorkflowId: context.runningWorkflowId,
        selectedWorkflowId: context.selectedWorkflowId,
        stoppingWorkflowId: context.stoppingWorkflowId,
        gridColumnCount: context.appSettings.workflowGridColumnCount,
        workflowHierarchy: context.appSettings.workflowHierarchy,
        onCreate: context.openWorkflowMode,
        onDisplayModeChange: context.handleTaskListDisplayModeChange,
        onGridColumnCountChange: context.handleWorkflowGridColumnCountChange,
        onRun: context.handleRunWorkflow,
        onStop: context.handleStopWorkflow,
        onSelect: context.selectWorkflow,
      }

      return <RunWorkspace {...props} />
    },
  },
  {
    type: 'actions',
    render(context: WorkspaceContext) {
      const props = {
        actions: context.actions,
        createForm: context.createForm,
        currentDevice: context.currentDevice,
        developerVisibility: context.appSettings.developerVisibility,
        profilePresets: context.appSettings.browserProfilePresets,
        selectedActionId: context.selectedActionId,
        secrets: context.secrets,
        onChange: context.setCreateForm,
        onDeleteAction: context.handleDeleteAction,
        onSelectAction: context.setSelectedActionId,
        onSubmit: context.handleCreateAction,
        onUpdateAction: context.handleUpdateAction,
      }

      return <ActionsWorkspace {...props} />
    },
  },
  {
    type: 'workflows',
    render(context: WorkspaceContext) {
      const props = {
        actions: context.actions,
        profilePresets: context.appSettings.browserProfilePresets,
        developerVisibility: context.appSettings.developerVisibility,
        defaultWorkflowName: context.appSettings.defaultWorkflowName,
        isLoading: context.isLoading,
        selectedWorkflowId: context.selectedWorkflowId,
        onConfirmDeleteWorkflow: context.handleDeleteWorkflow,
        onCreateWorkflow: context.handleCreateWorkflow,
        onStartCreateWorkflow: () => context.setSelectedWorkflowId(null),
        onUpdateWorkflow: context.handleUpdateWorkflow,
        workflowRunEvents: context.workflowRunEvents,
        workflows: context.workflows,
      }

      return <WorkflowsWorkspace {...props} />
    },
  },
  {
    type: 'tools',
    render(context: WorkspaceContext) {
      const props = {
        selectedToolId: context.selectedToolId,
        toolInputValues: context.toolInputValues,
        toolMessage: context.toolMessage,
        toolModules: context.toolModules,
        toolRunResult: context.toolRunResult,
        showToolMetadata: context.appSettings.developerVisibility.showToolMetadata,
        onCreateToolAction: context.handleCreateToolAction,
        onRegisterToolModule: context.handleRegisterToolModule,
        onRunToolModule: context.handleRunToolModule,
        onToolInputChange(key: string, value: unknown) {
          context.setToolInputValues((currentValues) => ({
            ...currentValues,
            [key]: value,
          }))
        },
      }

      return <ToolsWorkspace {...props} />
    },
  },
  {
    type: 'settings',
    render(context: WorkspaceContext) {
      const props = {
        form: context.settingsForm,
        pruneMessage: context.pruneMessage,
        onChange: context.setSettingsForm,
        onClose: context.closeSettingsMode,
        onSubmit: context.handleSaveSettings,
        saveState: context.settingsSaveState,
        settingsErrorMessage: context.settingsErrorMessage,
        secretForm: context.secretForm,
        secretStorageStatus: context.secretStorageStatus,
        secrets: context.secrets,
        currentDevice: context.currentDevice,
        userDataPath: context.userDataPath,
        onCreateSecret: context.handleCreateSecret,
        onDeleteSecret: context.handleDeleteSecret,
        onSecretFormChange: context.setSecretForm,
        selectedCategory: context.selectedSettingsCategory,
        syncMessage: context.syncMessage,
        syncResult: context.syncResult,
        syncStatus: context.syncStatus,
        onExportSyncSnapshot: context.handleExportSyncSnapshot,
        onExportSyncSnapshotFile: context.handleExportSyncSnapshotFile,
        onImportSyncSnapshot: context.handleImportSyncSnapshot,
        onImportSyncSnapshotFile: context.handleImportSyncSnapshotFile,
        onPruneWorkflowRunEvents: context.handlePruneWorkflowRunEvents,
        onRegisterToolModule: context.handleRegisterToolModule,
      }

      return <SettingsWorkspace {...props} />
    },
  },
]

export type WorkspaceRegistry = {
  getWorkspace(type: WorkspaceMode): WorkspaceTemplate
}

export function createWorkspaceRegistry(
  workspaces: WorkspaceTemplate[],
): WorkspaceRegistry {
  const workspacesByType = new Map<WorkspaceMode, WorkspaceTemplate>()

  for (const workspace of workspaces) {
    workspacesByType.set(workspace.type, workspace)
  }

  return {
    getWorkspace(type) {
      const workspace = workspacesByType.get(type)

      if (!workspace) {
        throw new Error(`Failed to register workspace. Type: ${type}`)
      }

      return workspace
    },
  }
}

export const workspaceRegistry = createWorkspaceRegistry(workspaceTemplates)
