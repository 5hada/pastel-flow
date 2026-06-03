import { Card } from '@heroui/react'
import { AppSettingsPanel } from './AppSettingsPanel'
import type { SettingsProps } from '../../shared/layouts/Workspace'

export function SettingsWorkspace(workspaceProps: SettingsProps) {
  return (
    <Card className="mode-panel" aria-label="앱 설정">
      <AppSettingsPanel {...workspaceProps} />
    </Card>
  )
}
