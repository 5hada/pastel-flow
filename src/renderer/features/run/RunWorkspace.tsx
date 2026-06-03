import { TaskLaunchPanel } from './TaskLaunchPanel'
import type { RunProps } from '../../shared/layouts/Workspace'

export function RunWorkspace(workspaceProps: RunProps) {
  return <TaskLaunchPanel {...workspaceProps} />
}
