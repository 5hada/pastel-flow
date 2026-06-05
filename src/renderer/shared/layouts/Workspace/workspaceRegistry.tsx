import { getNavigationCategoryLabel } from '../../utils/viewLabels'
import type { WorkspaceMode } from '../../state/taskFormState'
import { ActionsWorkspace } from '../../../features/actions/ActionsWorkspace'
import { RunWorkspace } from '../../../features/run/RunWorkspace'
import { SettingsWorkspace } from '../../../features/settings/SettingsWorkspace'
import { TodosWorkspace } from '../../../features/todos/TodosWorkspace'
import { ToolsWorkspace } from '../../../features/tools/ToolsWorkspace'
import { UrlGroupsWorkspace } from '../../../features/urlGroups/UrlGroupsWorkspace'
import { WorkflowsWorkspace } from '../../../features/workflows/WorkflowsWorkspace'
import type { WorkspaceContext, WorkspaceTemplate } from './types'
import type { WorkflowDefinition } from '../../../../shared/workflows'
import type { RegisteredToolModule } from '../../../../shared/tools'
import { createToolInputDefaults } from '../../utils/viewLabels'

export const workspaceTemplates: WorkspaceTemplate[] = [
  {
    type: 'run',
    render(context: WorkspaceContext) {
      const visibleWorkflows = filterByFolder(
        context.workflows,
        context.selectedCollectionFolderId,
        context.appSettings.workspaceFolderAssignments,
      )
      const selectedFolder = context.appSettings.workspaceFolders.find(
        (folder) => folder.id === context.selectedCollectionFolderId,
      )
      const props = {
        workflows: visibleWorkflows,
        categoryLabel:
          selectedFolder?.name ?? getNavigationCategoryLabel(context.selectedCategory),
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
        onSelect(workflow: WorkflowDefinition) {
          context.openWorkflowMode()
          context.selectWorkflow(workflow)
        },
      }

      return <RunWorkspace {...props} />
    },
  },
  {
    type: 'actions',
    render(context: WorkspaceContext) {
      const props = {
        actions: context.actions.filter(
          (action) => action.type !== 'transform_action',
        ),
        createForm: context.createForm,
        currentDevice: context.currentDevice,
        developerVisibility: context.appSettings.developerVisibility,
        profilePresets: context.appSettings.browserProfilePresets,
        urlGroups: context.urlGroups,
        selectedCollectionFolderId: context.selectedCollectionFolderId,
        selectedActionId: context.selectedActionId,
        secrets: context.secrets,
        workspaceFolderAssignments: context.appSettings.workspaceFolderAssignments,
        workspaceFolders: context.appSettings.workspaceFolders,
        workflows: context.workflows,
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
        runningWorkflowId: context.runningWorkflowId,
        actionRuns: context.actionRuns,
        selectedCollectionFolderId: context.selectedCollectionFolderId,
        selectedWorkflowRunId: context.selectedWorkflowRunId,
        selectedWorkflowId: context.selectedWorkflowId,
        onConfirmDeleteWorkflow: context.handleDeleteWorkflow,
        onCreateTransformAction: context.handleCreateTransformAction,
        onCreateWorkflow: context.handleCreateWorkflow,
        onSelectWorkflow: context.selectWorkflowById,
        onSelectWorkflowRun: context.selectWorkflowRun,
        onStartCreateWorkflow: () => context.setSelectedWorkflowId(null),
        onUpdateAction: context.handleUpdateAction,
        onUpdateWorkflow: context.handleUpdateWorkflow,
        workflowRunEvents: context.workflowRunEvents,
        workflowRuns: context.workflowRuns,
        workflowArtifacts: context.workflowArtifacts,
        urlGroupItemRuns: context.urlGroupItemRuns,
        workspaceFolderAssignments: context.appSettings.workspaceFolderAssignments,
        workspaceFolders: context.appSettings.workspaceFolders,
        workflows: context.workflows,
      }

      return <WorkflowsWorkspace {...props} />
    },
  },
  {
    type: 'urlGroups',
    render(context: WorkspaceContext) {
      const props = {
        isLoading: context.isLoading,
        selectedUrlGroupId: context.selectedUrlGroupId,
        urlGroups: context.urlGroups,
        onCreateUrlGroup: context.handleCreateUrlGroup,
        onDeleteUrlGroup: context.handleDeleteUrlGroup,
        onSelectUrlGroup: context.setSelectedUrlGroupId,
        onUpdateUrlGroup: context.handleUpdateUrlGroup,
      }

      return <UrlGroupsWorkspace {...props} />
    },
  },
  {
    type: 'todos',
    render(context: WorkspaceContext) {
      const props = {
        includeCompletedTodos: context.includeCompletedTodos,
        isLoading: context.isLoading,
        selectedTodoId: context.selectedTodoId,
        todos: context.todos,
        onCreateTodo: context.handleCreateTodo,
        onDeleteTodo: context.handleDeleteTodo,
        onIncludeCompletedChange: context.handleIncludeCompletedTodosChange,
        onSelectTodo: context.setSelectedTodoId,
        onUpdateTodo: context.handleUpdateTodo,
      }

      return <TodosWorkspace {...props} />
    },
  },
  {
    type: 'tools',
    render(context: WorkspaceContext) {
      const props = {
        selectedToolId: context.selectedToolId,
        selectedCollectionFolderId: context.selectedCollectionFolderId,
        toolInputValues: context.toolInputValues,
        toolMessage: context.toolMessage,
        toolModules: context.toolModules,
        toolRunResult: context.toolRunResult,
        showToolMetadata: context.appSettings.developerVisibility.showToolMetadata,
        workspaceFolderAssignments: context.appSettings.workspaceFolderAssignments,
        workspaceFolders: context.appSettings.workspaceFolders,
        onCreateToolAction: context.handleCreateToolAction,
        onClearSelectedTool() {
          context.setSelectedToolId(null)
          context.setToolRunResult(null)
          context.setToolMessage(null)
        },
        onRegisterToolModule: context.handleRegisterToolModule,
        onRunToolModule: context.handleRunToolModule,
        onSelectTool(tool: RegisteredToolModule) {
          context.setSelectedToolId(tool.id)
          context.setToolRunResult(null)
          context.setToolMessage(null)
          context.setToolInputValues(createToolInputDefaults(tool))
        },
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

function filterByFolder<TItem extends { id: string }>(
  items: TItem[],
  folderId: string,
  assignments: Record<string, string>,
): TItem[] {
  if (folderId === 'all') {
    return items
  }

  if (folderId === 'favorites') {
    return []
  }

  return items.filter((item) => assignments[item.id] === folderId)
}

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
