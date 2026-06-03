import type { WorkspaceMode } from '../../state/taskFormState'
import type { WorkspaceContext } from './types'
import { workspaceRegistry } from './workspaceRegistry'

export type WorkspaceProps = {
  currentMode: WorkspaceMode
  context: WorkspaceContext
}

export function Workspace({ currentMode, context }: WorkspaceProps) {
  const template = workspaceRegistry.getWorkspace(currentMode)

  return <>{template.render(context)}</>
}
