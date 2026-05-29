import type {
  AppSettings,
  AppSettingsSnapshot,
} from '../../shared/settings'
import type {
  CreateLocalSecretInput,
  LocalSecretMetadata,
  SecretStorageStatus,
} from '../../shared/secrets'
import type { TaskRunEvent } from '../../shared/taskRunEvents'
import type {
  SyncExportSnapshot,
  SyncImportResult,
  SyncStatus,
} from '../../shared/sync'
import type {
  BrowserTabGroupConfig,
  DevicePolicy,
  TaskState,
  TaskTemplate,
  TaskType,
} from '../../shared/tasks'

export type CreateTaskInput<TConfig = unknown> = {
  name: string
  type: TaskType
  config: TConfig
  permissions?: DevicePolicy
  state?: TaskState
}

export type UpdateTaskInput<TConfig = unknown> = Partial<{
  name: string
  config: TConfig
  permissions: DevicePolicy
  state: TaskState
}>

export type CreateBrowserTabGroupTaskInput =
  CreateTaskInput<BrowserTabGroupConfig>

export type TasksApi = {
  list(): Promise<TaskTemplate[]>
  create<TConfig = unknown>(
    input: CreateTaskInput<TConfig>,
  ): Promise<TaskTemplate<TConfig>>
  update<TConfig = unknown>(
    id: string,
    input: UpdateTaskInput<TConfig>,
  ): Promise<TaskTemplate<TConfig>>
  delete(id: string): Promise<void>
  run(id: string): Promise<TaskTemplate>
  listEvents(taskId?: string): Promise<TaskRunEvent[]>
  onChanged(listener: (task: TaskTemplate) => void): () => void
}

export type SettingsApi = {
  get(): Promise<AppSettingsSnapshot>
  update(settings: AppSettings): Promise<AppSettingsSnapshot>
}

export type SecretsApi = {
  status(): Promise<SecretStorageStatus>
  list(): Promise<LocalSecretMetadata[]>
  create(input: CreateLocalSecretInput): Promise<LocalSecretMetadata>
  delete(id: string): Promise<void>
}

export type SyncApi = {
  status(): Promise<SyncStatus>
  export(): Promise<SyncExportSnapshot>
  import(snapshot?: SyncExportSnapshot): Promise<SyncImportResult>
}

export type PastelFlowApi = {
  secrets: SecretsApi
  settings: SettingsApi
  sync: SyncApi
  tasks: TasksApi
}
