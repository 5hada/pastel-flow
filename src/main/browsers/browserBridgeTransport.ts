import {
  browserBridgeCommandSchema,
  browserBridgePingResultSchema,
  type BrowserBridgeCommand,
} from './browserBridgeSchemas'
import type { BrowserNativeBridgeBroker } from './browserNativeBridgeBroker'

export type BrowserBridgeTransport = {
  dispatch(command: BrowserBridgeCommand): Promise<unknown>
  dispose(): void
}

export function createBrowserBridgeTransport(
  broker: BrowserNativeBridgeBroker,
): BrowserBridgeTransport {
  return {
    async dispatch(command) {
      const parsedCommand = browserBridgeCommandSchema.parse(command)
      const value = await broker.dispatch(parsedCommand)

      if (parsedCommand.type === 'ping') {
        browserBridgePingResultSchema.parse(value)
      }

      return value
    },
    dispose() {
      return undefined
    },
  }
}
