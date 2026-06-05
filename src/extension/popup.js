import { CONNECTION_STATUS_STORAGE_KEY } from './constants.js'

const statusBadge = document.getElementById('statusBadge')
const statusText = document.getElementById('statusText')
const hostName = document.getElementById('hostName')
const brokerStatus = document.getElementById('brokerStatus')
const extensionVersion = document.getElementById('extensionVersion')
const updatedAt = document.getElementById('updatedAt')
const lastRequestAt = document.getElementById('lastRequestAt')
const lastError = document.getElementById('lastError')
const refreshButton = document.getElementById('refreshButton')

refreshButton.addEventListener('click', () => {
  void renderStatus()
})

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes[CONNECTION_STATUS_STORAGE_KEY]) {
    return
  }

  void renderStatus()
})

void renderStatus()

async function renderStatus() {
  const status = await requestLiveStatus()

  statusBadge.textContent = getStatusLabel(status.state)
  statusBadge.className = status.state ?? ''
  statusText.textContent = status.message ?? '상태 메시지가 없습니다.'
  hostName.textContent = status.hostName ?? '-'
  brokerStatus.textContent = status.brokerConnected
    ? '연결됨'
    : status.nativePortConnected
      ? '대기'
      : '연결 안 됨'
  extensionVersion.textContent = formatExtensionVersion(status)
  updatedAt.textContent = status.updatedAt
    ? new Date(status.updatedAt).toLocaleString()
    : '-'
  lastRequestAt.textContent = status.lastNativeRequestAt
    ? new Date(status.lastNativeRequestAt).toLocaleString()
    : '-'

  if (status.lastError) {
    lastError.hidden = false
    lastError.textContent = status.lastError
  } else {
    lastError.hidden = true
    lastError.textContent = ''
  }
}

function formatExtensionVersion(status) {
  const currentVersion = status.extensionVersion ?? '-'
  const expectedVersion = status.expectedExtensionVersion
  const minimumVersion = status.minimumExtensionVersion

  if (expectedVersion) {
    return `${currentVersion} / 앱 ${expectedVersion}`
  }

  if (minimumVersion) {
    return `${currentVersion} / 최소 ${minimumVersion}`
  }

  return currentVersion
}

function getStatusLabel(state) {
  switch (state) {
    case 'connected':
      return '연결됨'
    case 'connecting':
      return '연결 중'
    case 'degraded':
      return '오류'
    case 'waiting':
      return '대기'
    default:
      return '확인 중'
  }
}

async function requestLiveStatus() {
  try {
    const status = await chrome.runtime.sendMessage({
      type: 'pastelFlow:getConnectionStatus',
    })
    if (status && typeof status === 'object') {
      return status
    }
  } catch {
    // Fall back to stored status when the service worker is restarting.
  }

  const stored = await chrome.storage.local.get(CONNECTION_STATUS_STORAGE_KEY)
  return stored[CONNECTION_STATUS_STORAGE_KEY] ?? {
    state: 'unknown',
    message: '연결 상태 정보가 없습니다.',
  }
}
