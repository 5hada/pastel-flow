import type { ActionsApi } from "../features/actions/actionsApi"
import type { ExternalBridgeApi } from "../features/externalBridge/externalBridgeApi"
import type { SecretsApi } from "../features/secrets/secretsApi"
import type { SettingsApi } from "../features/settings/settingsApi"
import type { ScrapsApi } from "../features/scraps/scrapsApi"
import type { SyncApi } from "../features/sync/syncApi"
import type { TodosApi } from "../features/todos/todosApi"
import type { ToolsApi } from "../features/tools/toolsApi"
import type { UrlGroupsApi } from "../features/urlGroups/urlGroupsApi"
import type { WorkflowsApi } from "../features/workflows/workflowsApi"

export type PastelFlowApi = {
  actions: ActionsApi
  externalBridge: ExternalBridgeApi
  secrets: SecretsApi
  settings: SettingsApi
  scraps: ScrapsApi
  sync: SyncApi
  todos: TodosApi
  tools: ToolsApi
  urlGroups: UrlGroupsApi
  workflows: WorkflowsApi
}
