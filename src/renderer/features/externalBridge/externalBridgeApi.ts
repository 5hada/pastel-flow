import type { ExternalBridgeSchema } from '../../../shared/externalBridge'

export type ExternalBridgeApi = {
  getSchema(): Promise<ExternalBridgeSchema>
}
