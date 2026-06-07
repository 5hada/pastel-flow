import { RunWorkspaceLayout } from './components/RunWorkspaceLayout'
import type { RunProps } from '../../shared/layouts/Workspace'

export function RunWorkspace(workspaceProps: RunProps) {
  return <RunWorkspaceLayout {...workspaceProps} />
}
