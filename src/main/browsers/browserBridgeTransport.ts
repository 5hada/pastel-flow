import {
  createDevToolsTarget,
  evaluateDevToolsExpression,
  readDevToolsTargets,
} from './devToolsClient'
import { browserExtensionId } from './browserNativeMessagingHost'
import {
  browserBridgeCommandSchema,
  browserBridgePingResultSchema,
  type BrowserBridgeCommand,
} from './browserBridgeSchemas'

export type BrowserBridgeTransport = {
  dispatch(command: BrowserBridgeCommand): Promise<unknown>
  dispose(): void
}

export function createBrowserBridgeTransport(port: number): BrowserBridgeTransport {
  return createDevToolsBrowserBridgeTransport(port)
}

export function createDevToolsBrowserBridgeTransport(
  port: number,
): BrowserBridgeTransport {
  return {
    async dispatch(command) {
      const parsedCommand = browserBridgeCommandSchema.parse(command)
      const extensionTarget = await waitForExtensionTarget(port)
      const value = await evaluateDevToolsExpression(
        extensionTarget.webSocketDebuggerUrl,
        `globalThis.pastelFlowBridge.handle(${JSON.stringify(parsedCommand)})`,
      )

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

async function waitForExtensionTarget(port: number) {
  const startedAt = Date.now()
  let lastBridgePageOpenAttemptAt = 0
  let latestTargets: Awaited<ReturnType<typeof readDevToolsTargets>> = []

  while (Date.now() - startedAt < 15000) {
    const targets = await readDevToolsTargets(port)
    latestTargets = targets
    const extensionTarget = findBridgeTarget(targets)

    if (extensionTarget?.webSocketDebuggerUrl) {
      return extensionTarget as typeof extensionTarget & {
        webSocketDebuggerUrl: string
      }
    }

    const extensionId = findLoadedExtensionId(targets) ?? browserExtensionId
    if (Date.now() - lastBridgePageOpenAttemptAt > 750) {
      lastBridgePageOpenAttemptAt = Date.now()
      await createDevToolsTarget(
        port,
        `chrome-extension://${extensionId}/bridge.html`,
      ).catch(() => undefined)
    }

    await delay(150)
  }

  throw new Error(
    [
      '브라우저 Action 그룹을 제어할 확장 브리지를 찾지 못했습니다.',
      `remoteDebuggingPort=${port}`,
      `expectedExtensionId=${browserExtensionId}`,
      `targets=${formatDevToolsTargets(latestTargets)}`,
    ].join('\n'),
  )
}

function findBridgeTarget<TTarget extends { type?: string; url?: string }>(
  targets: TTarget[],
): TTarget | undefined {
  return targets.find((target) => isBridgeTarget(target))
}

function findLoadedExtensionId(
  targets: Array<{ type?: string; url?: string }>,
): string | undefined {
  const extensionTarget = targets.find((target) =>
    target.url?.startsWith(`chrome-extension://${browserExtensionId}/`),
  )
  const match = extensionTarget?.url?.match(/^chrome-extension:\/\/([^/]+)\//)
  return match?.[1]
}

function isBridgeTarget(target: { type?: string; url?: string }): boolean {
  const url = target.url ?? ''
  const isExpectedExtensionUrl = url.startsWith(
    `chrome-extension://${browserExtensionId}/`,
  )

  return (
    isExpectedExtensionUrl &&
    ((target.type === 'page' && url.endsWith('/bridge.html')) ||
      (target.type === 'service_worker' && url.endsWith('/background.js')))
  )
}

function formatDevToolsTargets(
  targets: Array<{ type?: string; url?: string }>,
): string {
  if (targets.length === 0) {
    return 'none'
  }

  return targets
    .map((target) => `${target.type ?? 'unknown'}:${target.url ?? 'no-url'}`)
    .join(', ')
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}
