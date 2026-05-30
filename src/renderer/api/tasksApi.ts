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
  RegisteredToolModule,
  ToolModuleRunResult,
} from '../../shared/tools'
import type {
  BrowserTabGroupConfig,
  ActionDefinition,
  DevicePolicy,
  TaskSchedule,
  TaskState,
  TaskTemplate,
  TaskType,
  WorkflowDefinition,
} from '../../shared/tasks'

export type CreateTaskInput<TConfig = unknown> = {
  name: string
  type: TaskType
  config: TConfig
  permissions?: DevicePolicy
  schedule?: TaskSchedule
  state?: TaskState
}

export type UpdateTaskInput<TConfig = unknown> = Partial<{
  name: string
  config: TConfig
  permissions: DevicePolicy
  schedule: TaskSchedule
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
  stop(id: string): Promise<TaskTemplate>
  listEvents(taskId?: string): Promise<TaskRunEvent[]>
  pruneEvents(): Promise<number>
  onChanged(listener: (task: TaskTemplate) => void): () => void
}

export type ActionsApi = {
  list(): Promise<ActionDefinition[]>
}

export type WorkflowsApi = {
  list(): Promise<WorkflowDefinition[]>
  create(input: Partial<WorkflowDefinition>): Promise<WorkflowDefinition>
  update(
    id: string,
    input: Partial<WorkflowDefinition>,
  ): Promise<WorkflowDefinition>
  delete(id: string): Promise<void>
  run(id: string): Promise<TaskTemplate | WorkflowDefinition>
  stop(id: string): Promise<TaskTemplate | WorkflowDefinition>
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
  exportFile(): Promise<SyncExportSnapshot | undefined>
  import(snapshot?: SyncExportSnapshot): Promise<SyncImportResult>
  importFile(): Promise<SyncImportResult | undefined>
}

export type ToolsApi = {
  list(): Promise<RegisteredToolModule[]>
  registerFolder(): Promise<RegisteredToolModule[] | undefined>
  run(
    toolId: string,
    input: Record<string, unknown>,
  ): Promise<ToolModuleRunResult>
  createAction(toolId: string): Promise<ActionDefinition>
}

export type PastelFlowApi = {
  actions: ActionsApi
  secrets: SecretsApi
  settings: SettingsApi
  sync: SyncApi
  tasks: TasksApi
  tools: ToolsApi
  workflows: WorkflowsApi
}
