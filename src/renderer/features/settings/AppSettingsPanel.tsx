import { Button } from '@heroui/react'
import type { FormEvent } from 'react'
import type { CurrentDevice } from '../../../shared/devices'
import type { AppSettings } from '../../../shared/settings'
import type {
  LocalSecretMetadata,
  SecretStorageStatus,
} from '../../../shared/secrets'
import type { SyncImportResult, SyncStatus } from '../../../shared/sync'
import type {
  SecretFormState,
  SettingsCategory,
  SettingsSaveState,
} from '../../shared/state/taskFormState'
import { FormPanel } from '../../shared/components/FormPanel'
import { SettingsCategoryContent } from './components/core/SettingsCategoryContent'
import { XButton } from '../../shared/components/HeroForm'

export type AppSettingsPanelProps = {
  currentDevice: CurrentDevice
  form: AppSettings
  pruneMessage: string | null
  saveState: SettingsSaveState
  secretForm: SecretFormState
  secretStorageStatus: SecretStorageStatus
  secrets: LocalSecretMetadata[]
  selectedCategory: SettingsCategory
  settingsErrorMessage: string | null
  syncMessage: string | null
  syncResult: SyncImportResult | null
  syncStatus: SyncStatus
  userDataPath: string
  onChange(value: AppSettings): void
  onClose(): void
  onCreateSecret(): Promise<void>
  onDeleteSecret(secretId: string): Promise<void>
  onExportSyncSnapshot(): Promise<void>
  onExportSyncSnapshotFile(): Promise<void>
  onImportSyncSnapshot(): Promise<void>
  onImportSyncSnapshotFile(): Promise<void>
  onPruneWorkflowRunEvents(): Promise<void>
  onRegisterToolModule(): Promise<void>
  onSecretFormChange(value: SecretFormState): void
  onSubmit(event: FormEvent<HTMLFormElement>): Promise<void>
}

export function AppSettingsPanel(props: AppSettingsPanelProps) {
  const {
    onClose,
    onSubmit,
    saveState,
    settingsErrorMessage,
  } = props

  return (
    <>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">App settings</p>
          <h2>앱 설정</h2>
        </div>
        <XButton onPress={onClose} />
      </div>

      <form onSubmit={onSubmit}>
        <FormPanel>
          <SettingsCategoryContent {...props} />

          {settingsErrorMessage ? (
            <p className="panel-error">{settingsErrorMessage}</p>
          ) : null}
          {saveState === 'saved' ? (
            <p className="panel-success">설정을 저장했습니다.</p>
          ) : null}

          <div className="form-actions">
            <Button variant="primary" type="submit">
              저장
            </Button>
          </div>
        </FormPanel>
      </form>
    </>
  )
}
