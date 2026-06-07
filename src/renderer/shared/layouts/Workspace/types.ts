import type { ReactNode } from 'react'
import type { ActionWorkspacePanelProps } from '../../../features/actions/components/ActionWorkspacePanel'
import type { EditWorkspaceProps } from '../../../features/workflows/components/EditWorkspace'
import type { usePastelFlowApp } from '../../hooks/usePastelFlowApp'
import type { RunWorkspaceProps } from '../../../features/run/components/RunWorkspaceLayout'
import type { AppSettingsPanelProps } from '../../../features/settings/AppSettingsPanel'
import type { ToolsPanelProps } from '../../../features/tools/ToolsPanel'
import type { WorkspaceMode } from '../../state/taskFormState'

export type WorkspaceContext = ReturnType<typeof usePastelFlowApp>

export type RunProps = RunWorkspaceProps
export type ActionsProps = ActionWorkspacePanelProps
export type WorkflowsProps = EditWorkspaceProps
export type ToolsProps = ToolsPanelProps
export type SettingsProps = AppSettingsPanelProps

export type WorkspaceTemplate = {
  type: WorkspaceMode
  render(context: WorkspaceContext): ReactNode
}
