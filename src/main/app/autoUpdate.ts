import { app, autoUpdater } from 'electron'

const updateFeedUrlEnvName = 'PASTEL_FLOW_UPDATE_FEED_URL'
const initialUpdateCheckDelayMs = 30_000
const updateCheckIntervalMs = 4 * 60 * 60 * 1000

type AutoUpdateService = {
  checkNow(): void
  dispose(): void
}

export function createAutoUpdateService(): AutoUpdateService {
  const feedUrl = process.env[updateFeedUrlEnvName]?.trim()
  let initialCheckTimer: ReturnType<typeof setTimeout> | undefined
  let updateCheckTimer: ReturnType<typeof setInterval> | undefined

  function handleUpdateError() {
    return undefined
  }

  function checkNow() {
    if (!app.isPackaged || !feedUrl) {
      return
    }

    autoUpdater.checkForUpdates()
  }

  if (app.isPackaged && feedUrl) {
    autoUpdater.on('error', handleUpdateError)
    autoUpdater.setFeedURL({ url: feedUrl })
    initialCheckTimer = setTimeout(checkNow, initialUpdateCheckDelayMs)
    initialCheckTimer.unref?.()

    updateCheckTimer = setInterval(checkNow, updateCheckIntervalMs)
    updateCheckTimer.unref?.()
  }

  return {
    checkNow,
    dispose() {
      autoUpdater.off('error', handleUpdateError)
      if (initialCheckTimer) {
        clearTimeout(initialCheckTimer)
        initialCheckTimer = undefined
      }
      if (updateCheckTimer) {
        clearInterval(updateCheckTimer)
        updateCheckTimer = undefined
      }
    },
  }
}
