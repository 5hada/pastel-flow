import {
  NATIVE_HOST_NAME,
  RECONNECT_DELAY_MS,
} from './constants.js'
import {
  createErrorResponse,
  createSuccessResponse,
  parseNativeRequest,
} from './messages.js'
import { handleCommand } from './tabGroups.js'

let nativePort
let reconnectTimer

export function startNativeBridge() {
  connectNativeHost()
}

function connectNativeHost() {
  if (nativePort) {
    return
  }

  try {
    nativePort = chrome.runtime.connectNative(NATIVE_HOST_NAME)
  } catch {
    scheduleReconnect()
    return
  }

  nativePort.onMessage.addListener((message) => {
    void handleNativeMessage(message)
  })
  nativePort.onDisconnect.addListener(() => {
    nativePort = undefined
    scheduleReconnect()
  })
}

async function handleNativeMessage(message) {
  const port = nativePort
  if (!port) {
    return
  }

  let id = 'unknown'
  try {
    const request = parseNativeRequest(message)
    id = request.id
    const result = await handleCommand(request.command)
    port.postMessage(createSuccessResponse(id, result))
  } catch (error) {
    port.postMessage(createErrorResponse(id, error))
  }
}

function scheduleReconnect() {
  if (reconnectTimer) {
    return
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined
    nativePort = undefined
    connectNativeHost()
  }, RECONNECT_DELAY_MS)
}
