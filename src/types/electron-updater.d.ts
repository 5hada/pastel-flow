declare module 'electron-updater' {
  type AutoUpdaterErrorListener = (error: Error) => void

  export const autoUpdater: {
    autoDownload: boolean
    autoInstallOnAppQuit: boolean
    checkForUpdatesAndNotify(): Promise<unknown>
    off(eventName: 'error', listener: AutoUpdaterErrorListener): void
    on(eventName: 'error', listener: AutoUpdaterErrorListener): void
  }
}
