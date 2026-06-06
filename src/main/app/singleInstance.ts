import { app, type BrowserWindow } from 'electron'

type SingleInstanceOptions = {
  createWindow(): void
  getWindow(): BrowserWindow | null
}

export function registerSingleInstanceGuard({
  createWindow,
  getWindow,
}: SingleInstanceOptions): boolean {
  const hasLock = app.requestSingleInstanceLock()
  if (!hasLock) {
    app.quit()
    return false
  }

  app.on('second-instance', () => {
    const window = getWindow()
    if (!window || window.isDestroyed()) {
      createWindow()
      return
    }

    if (window.isMinimized()) {
      window.restore()
    }
    window.focus()
  })

  return true
}
