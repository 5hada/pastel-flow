import type {
  BrowserKind,
  BrowserProfileSource,
  BrowserRunMode,
  BrowserTabGroupConfig,
} from '../../../shared/browsers'
import type {
  DeviceExecutionPolicy,
  DevicePolicy,
  DeviceVisibilityPolicy,
} from '../../../shared/devices'
import type {
  WorkflowSchedule,
  WorkflowScheduleMode,
  WorkflowState,
} from '../../../shared/workflows'

export type TaskType =
  | 'browser_tab_group'
  | 'discord_bot'
  | 'crawler'
  | 'notion_sync'
  | 'trading_bot'
  | 'transform'

export type TaskScheduleMode = WorkflowScheduleMode
export type TaskSchedule = WorkflowSchedule
export type TaskState = WorkflowState

export type TaskTemplate<TConfig = unknown, TState = TaskState> = {
  id: string
  name: string
  type: TaskType
  config: TConfig
  state: TState
  permissions: DevicePolicy
  schedule?: TaskSchedule
  createdAt: string
  updatedAt: string
}

export type {
  BrowserKind,
  BrowserProfileSource,
  BrowserRunMode,
  BrowserTabGroupConfig,
  DeviceExecutionPolicy,
  DeviceVisibilityPolicy,
}
