import { AppearanceSettings } from './AppearanceSettings'
import { BrowserSettings } from './BrowserSettings'
import { DataSettings } from './DataSettings'
import { DeveloperSettings } from './DeveloperSettings'
import { DevicesSettings } from './DevicesSettings'
import { EventsSettings } from './EventsSettings'
import { GeneralSettings } from './GeneralSettings'
import { SecretsSettings } from './SecretsSettings'
import { ShortcutsSettings } from './ShortcutsSettings'
import { SyncSettings } from './SyncSettings'
import type { SettingsCategoryContentProps } from './settingsCategoryTypes'

export type { SettingsCategoryContentProps } from './settingsCategoryTypes'

export function SettingsCategoryContent({
  currentDevice,
  form,
  pruneMessage,
  secretForm,
  secretStorageStatus,
  secrets,
  selectedCategory,
  syncMessage,
  syncResult,
  syncStatus,
  userDataPath,
  onChange,
  onCreateSecret,
  onDeleteSecret,
  onExportSyncSnapshot,
  onExportSyncSnapshotFile,
  onImportSyncSnapshot,
  onImportSyncSnapshotFile,
  onPruneWorkflowRunEvents,
  onRegisterToolModule,
  onSecretFormChange,
}: SettingsCategoryContentProps) {
  switch (selectedCategory) {
    case 'general':
      return (
        <GeneralSettings
          form={form}
          onChange={onChange}
          onRegisterToolModule={onRegisterToolModule}
        />
      )

    case 'appearance':
      return <AppearanceSettings form={form} onChange={onChange} />

    case 'shortcuts':
      return <ShortcutsSettings form={form} onChange={onChange} />

    case 'browser':
      return <BrowserSettings form={form} onChange={onChange} />

    case 'devices':
      return (
        <DevicesSettings
          currentDevice={currentDevice}
          form={form}
          onChange={onChange}
        />
      )

    case 'secrets':
      return (
        <SecretsSettings
          secretForm={secretForm}
          secretStorageStatus={secretStorageStatus}
          secrets={secrets}
          onCreateSecret={onCreateSecret}
          onDeleteSecret={onDeleteSecret}
          onSecretFormChange={onSecretFormChange}
        />
      )

    case 'sync':
      return (
        <SyncSettings
          syncMessage={syncMessage}
          syncResult={syncResult}
          syncStatus={syncStatus}
          onExportSyncSnapshot={onExportSyncSnapshot}
          onExportSyncSnapshotFile={onExportSyncSnapshotFile}
          onImportSyncSnapshot={onImportSyncSnapshot}
          onImportSyncSnapshotFile={onImportSyncSnapshotFile}
        />
      )

    case 'events':
      return (
        <EventsSettings
          form={form}
          pruneMessage={pruneMessage}
          onChange={onChange}
          onPruneWorkflowRunEvents={onPruneWorkflowRunEvents}
        />
      )

    case 'data':
      return <DataSettings userDataPath={userDataPath} />

    case 'developer':
      return <DeveloperSettings form={form} onChange={onChange} />

    default:
      return null
  }
}
