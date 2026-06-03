import { EditWorkspace } from './components/EditWorkspace'
import type { WorkflowsProps } from '../../shared/layouts/Workspace'

export function WorkflowsWorkspace(workspaceProps: WorkflowsProps) {
  return <EditWorkspace {...workspaceProps} />
}
