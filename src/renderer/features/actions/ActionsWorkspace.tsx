import { ActionWorkspacePanel } from './components/ActionWorkspacePanel'
import type { ActionsProps } from '../../shared/layouts/Workspace'

export function ActionsWorkspace(workspaceProps: ActionsProps) {
  return <ActionWorkspacePanel {...workspaceProps} />
}
