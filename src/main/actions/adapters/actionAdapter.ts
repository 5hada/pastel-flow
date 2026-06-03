import type { AppSettings } from '../../../shared/settings'
import type { ActionType, ActionDefinition } from '../../../shared/actions'

export type ActionRunContext<AConfig = unknown, AState = unknown> = {
  action: ActionDefinition<AConfig>
  deviceId: string
  dataDir: string
  appSettings: AppSettings
  updateConfig(config: AConfig): Promise<void>
  updateState(state: Partial<AState>): Promise<void>
}

export type ActionRunResult<AState = unknown> = {
  state: AState
  message?: string
}

export type ActionStopResult<AConfig = unknown, AState = unknown> = {
  config?: AConfig
  state?: Partial<AState>
  message?: string
}

export type ActionAdapter<AConfig = unknown, AState = unknown> = {
  type: ActionType
  validateConfig(config: AConfig): Promise<void> | void
  run(
    context: ActionRunContext<AConfig, AState>,
  ): Promise<ActionRunResult<AState>>
  stop?(actionId: string): Promise<ActionStopResult<AConfig, AState> | void>
  getState?(actionId: string): Promise<AState>
}
