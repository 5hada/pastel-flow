import type {
    SyncExportSnapshot,
    SyncImportResult,
    SyncStatus
} from '../../../shared/sync'


export type SyncApi = {
  status(): Promise<SyncStatus>
  export(): Promise<SyncExportSnapshot>
  exportFile(): Promise<SyncExportSnapshot | undefined>
  import(snapshot?: SyncExportSnapshot): Promise<SyncImportResult>
  importFile(): Promise<SyncImportResult | undefined>
}
