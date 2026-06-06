import { Button } from '@heroui/react'
import type { SyncImportResult, SyncStatus } from '../../../../../shared/sync'
import {
  formatDate,
  getSyncModeLabel,
} from '../../../../shared/utils/viewLabels'
import { SettingsDetailItem } from '../core/SettingsDetailItem'

export type SyncSettingsProps = {
  syncMessage: string | null
  syncResult: SyncImportResult | null
  syncStatus: SyncStatus
  onExportSyncSnapshot(): Promise<void>
  onExportSyncSnapshotFile(): Promise<void>
  onImportSyncSnapshot(): Promise<void>
  onImportSyncSnapshotFile(): Promise<void>
}

export function SyncSettings({
  syncMessage,
  syncResult,
  syncStatus,
  onExportSyncSnapshot,
  onExportSyncSnapshotFile,
  onImportSyncSnapshot,
  onImportSyncSnapshotFile,
}: SyncSettingsProps) {
  return (
    <section className="settings-subsection" aria-label="동기화">
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">Mock sync</p>
          <h3>로컬 동기화 스냅샷</h3>
        </div>
      </div>
      <dl className="detail-list">
        <SettingsDetailItem
          label="Sync mode"
          value={getSyncModeLabel(syncStatus.mode)}
        />
        <SettingsDetailItem
          label="Server DB"
          value={syncStatus.serverDbSyncEnabled ? '사용' : '미사용'}
        />
        <SettingsDetailItem
          label="내보내기 파일"
          value={syncStatus.exportPath || '아직 없음'}
        />
        <SettingsDetailItem
          label="마지막 내보내기"
          value={formatDate(syncStatus.lastExportedAt)}
        />
      </dl>
      {syncStatus.message ? (
        <p className="muted-text">{syncStatus.message}</p>
      ) : null}
      <div className="form-actions">
        <Button
          variant="secondary"
          type="button"
          onPress={() => void onExportSyncSnapshot()}
        >
          내보내기
        </Button>
        <Button
          className="ghost-button"
          variant="ghost"
          type="button"
          onPress={() => void onExportSyncSnapshotFile()}
        >
          파일로 내보내기
        </Button>
        <Button
          className="ghost-button"
          variant="ghost"
          type="button"
          onPress={() => void onImportSyncSnapshot()}
        >
          가져오기
        </Button>
        <Button
          className="ghost-button"
          variant="ghost"
          type="button"
          onPress={() => void onImportSyncSnapshotFile()}
        >
          파일에서 가져오기
        </Button>
      </div>
      {syncMessage ? <p className="panel-success">{syncMessage}</p> : null}
      {syncResult ? (
        <p className="panel-success">
          가져오기 완료: 이벤트 {syncResult.workflowRunEventsAdded}개, 기기{' '}
          {syncResult.linkedDevicesMerged}개, Todo {syncResult.todosMerged}개 병합
        </p>
      ) : null}
    </section>
  )
}
