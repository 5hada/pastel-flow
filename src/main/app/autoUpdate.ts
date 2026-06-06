import { app } from 'electron'

const initialUpdateCheckDelayMs = 30_000
const updateCheckIntervalMs = 4 * 60 * 60 * 1000

type AutoUpdater = {
  autoDownload: boolean
  autoInstallOnAppQuit: boolean
  checkForUpdatesAndNotify(): Promise<unknown>
  off(eventName: 'error', listener: (error: Error) => void): void
  on(eventName: 'error', listener: (error: Error) => void): void
}

type ElectronUpdaterModule = {
  autoUpdater: AutoUpdater
}

type AutoUpdateService = {
  checkNow(): void
  dispose(): void
}

export function createAutoUpdateService(): AutoUpdateService {
  let disposed = false
  let initialCheckTimer: ReturnType<typeof setTimeout> | undefined
  let updateCheckTimer: ReturnType<typeof setInterval> | undefined
  let updater: AutoUpdater | undefined

  function handleUpdateError() {
    return undefined
  }

  async function loadUpdater(): Promise<AutoUpdater | undefined> {
    if (updater) {
      return updater
    }

    if (!app.isPackaged) {
      return undefined
    }

    try {
      const module = await import('electron-updater') as ElectronUpdaterModule
      updater = module.autoUpdater
      updater.autoDownload = true
      updater.autoInstallOnAppQuit = true
      updater.on('error', handleUpdateError)
      return updater
    } catch {
      return undefined
    }
  }

  function checkNow() {
    if (disposed || !app.isPackaged) {
      return
    }

    void loadUpdater().then((loadedUpdater) =>
      loadedUpdater?.checkForUpdatesAndNotify(),
    )
  }

  if (app.isPackaged) {
    initialCheckTimer = setTimeout(checkNow, initialUpdateCheckDelayMs)
    initialCheckTimer.unref?.()

    updateCheckTimer = setInterval(checkNow, updateCheckIntervalMs)
    updateCheckTimer.unref?.()
  }

  return {
    checkNow,
    dispose() {
      disposed = true
      updater?.off('error', handleUpdateError)
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
