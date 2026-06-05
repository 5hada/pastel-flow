import {
  CONNECTION_STATUS_STORAGE_KEY,
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
let lastNativeRequestAt
let reconnectTimer
let reconnectDelayMs = RECONNECT_DELAY_MS

export function postNativeEvent(event) {
  if (!nativePort) {
    return
  }

  nativePort.postMessage({
    event,
    type: 'pastelFlow:event',
  })
}

export function startNativeBridge() {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.type !== 'pastelFlow:getConnectionStatus') {
      return false
    }

    void getConnectionStatus().then(sendResponse)
    return true
  })
  void writeConnectionStatus({
    brokerConnected: false,
    state: 'connecting',
    message: 'Native host 연결을 준비하고 있습니다.',
  })
  connectNativeHost()
}

function connectNativeHost() {
  if (nativePort) {
    return
  }

  try {
    nativePort = chrome.runtime.connectNative(NATIVE_HOST_NAME)
  } catch {
    void writeConnectionStatus({
      brokerConnected: false,
      state: 'waiting',
      message: 'Native host를 찾지 못했습니다. Pastel Flow 앱을 실행하세요.',
    })
    scheduleReconnect()
    return
  }

  void writeConnectionStatus({
    connectedAt: new Date().toISOString(),
    brokerConnected: false,
    lastError: undefined,
    state: 'connecting',
    message: 'Native host port가 연결되었습니다. Pastel Flow 앱 broker를 기다립니다.',
  })

  nativePort.onMessage.addListener((message) => {
    void handleNativeMessage(message)
  })
  nativePort.onDisconnect.addListener(() => {
    const errorMessage = chrome.runtime.lastError?.message
    nativePort = undefined
    void writeConnectionStatus({
      brokerConnected: false,
      disconnectedAt: new Date().toISOString(),
      lastError: errorMessage,
      state: 'waiting',
      message: errorMessage
        ? `연결이 끊겼습니다: ${errorMessage}`
        : 'Pastel Flow 앱 연결을 기다리고 있습니다.',
    })
    scheduleReconnect()
  })
}

async function handleNativeMessage(message) {
  const port = nativePort
  if (!port) {
    return
  }

  if (isBrokerStatusMessage(message)) {
    const compatibility = checkExtensionCompatibility(message.minimumExtensionVersion)
    if (compatibility.compatible && message.state === 'connected') {
      resetReconnectDelay()
    }
    void writeConnectionStatus({
      brokerConnected: compatibility.compatible && message.state === 'connected',
      connectedAt: message.connectedAt,
      disconnectedAt: message.disconnectedAt,
      expectedExtensionVersion: message.expectedExtensionVersion,
      lastError: compatibility.compatible ? message.lastError : compatibility.reason,
      message: compatibility.compatible ? message.message : compatibility.reason,
      minimumExtensionVersion: message.minimumExtensionVersion,
      state: compatibility.compatible ? message.state : 'degraded',
    })
    return
  }

  if (isNativeHostErrorMessage(message)) {
    void writeConnectionStatus({
      brokerConnected: false,
      lastError: message.error,
      message: message.error,
      state: 'degraded',
    })
    return
  }

  let id = 'unknown'
  try {
    const request = parseNativeRequest(message)
    id = request.id
    lastNativeRequestAt = new Date().toISOString()
    const result = await handleCommand(request.command)
    void writeConnectionStatus({
      brokerConnected: true,
      lastCommandAt: new Date().toISOString(),
      lastError: undefined,
      lastResponseAt: new Date().toISOString(),
      state: 'connected',
      message: `마지막 명령 처리 완료: ${request.command.type}`,
    })
    port.postMessage(createSuccessResponse(id, result))
  } catch (error) {
    void writeConnectionStatus({
      lastCommandAt: new Date().toISOString(),
      lastError: error instanceof Error ? error.message : 'Unknown extension error.',
      state: 'degraded',
      message: '명령 처리 중 오류가 발생했습니다.',
    })
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
    increaseReconnectDelay()
    connectNativeHost()
  }, reconnectDelayMs)
}

async function writeConnectionStatus(status) {
  const stored = await chrome.storage.local.get(CONNECTION_STATUS_STORAGE_KEY)
  const previousStatus = stored[CONNECTION_STATUS_STORAGE_KEY] ?? {}
  await chrome.storage.local.set({
    [CONNECTION_STATUS_STORAGE_KEY]: omitUndefined({
      ...previousStatus,
      extensionVersion: chrome.runtime.getManifest().version,
      hostName: NATIVE_HOST_NAME,
      updatedAt: new Date().toISOString(),
      ...status,
    }),
  })
}

async function getConnectionStatus() {
  const stored = await chrome.storage.local.get(CONNECTION_STATUS_STORAGE_KEY)
  const status = stored[CONNECTION_STATUS_STORAGE_KEY] ?? {}
  const nativePortConnected = Boolean(nativePort)
  const brokerConnected = nativePortConnected && status.brokerConnected === true
  const state = brokerConnected
    ? status.state ?? 'connected'
    : nativePortConnected
      ? status.state === 'degraded'
        ? 'degraded'
        : 'connecting'
      : 'waiting'

  return {
    ...status,
    extensionVersion: chrome.runtime.getManifest().version,
    hostName: NATIVE_HOST_NAME,
    nativePortConnected,
    brokerConnected,
    lastNativeRequestAt,
    state,
    message: nativePortConnected
      ? status.message ?? 'Pastel Flow 앱 broker를 기다리고 있습니다.'
      : 'Native host port가 연결되어 있지 않습니다.',
    updatedAt: new Date().toISOString(),
  }
}

function isBrokerStatusMessage(message) {
  return (
    message &&
    message.type === 'pastelFlow:brokerStatus' &&
    typeof message.state === 'string'
  )
}

function isNativeHostErrorMessage(message) {
  return (
    message &&
    message.type === 'pastelFlow:nativeHostError' &&
    typeof message.error === 'string'
  )
}

function resetReconnectDelay() {
  reconnectDelayMs = RECONNECT_DELAY_MS
}

function increaseReconnectDelay() {
  reconnectDelayMs = Math.min(reconnectDelayMs * 2, 10000)
}

function checkExtensionCompatibility(minimumExtensionVersion) {
  if (typeof minimumExtensionVersion !== 'string') {
    return {
      compatible: true,
    }
  }

  const extensionVersion = parseVersion(chrome.runtime.getManifest().version)
  const minimumVersion = parseVersion(minimumExtensionVersion)
  if (!extensionVersion || !minimumVersion) {
    return {
      compatible: false,
      reason: '확장 버전 정보를 확인하지 못했습니다.',
    }
  }

  if (compareVersionParts(extensionVersion, minimumVersion) < 0) {
    return {
      compatible: false,
      reason: `확장 버전이 낮습니다. 현재 ${chrome.runtime.getManifest().version}, 필요 ${minimumExtensionVersion} 이상.`,
    }
  }

  return {
    compatible: true,
  }
}

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
  if (!match) {
    return undefined
  }

  return [
    Number.parseInt(match[1] || '0', 10),
    Number.parseInt(match[2] || '0', 10),
    Number.parseInt(match[3] || '0', 10),
  ]
}

function compareVersionParts(left, right) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return left[index] - right[index]
    }
  }

  return 0
}

function omitUndefined(value) {
  return Object.fromEntries(
    Object.entries(value).filter((entry) => entry[1] !== undefined),
  )
}
