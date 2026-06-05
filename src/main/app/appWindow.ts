import { BrowserWindow } from 'electron'
import path from 'node:path'
import type { AppEnvironment } from './appEnvironment'

export function createAppWindow(environment: AppEnvironment): BrowserWindow {
  const browserWindow = new BrowserWindow({
    autoHideMenuBar: true,
    icon: environment.appIconPath,
    title: 'Pastel Flow',
    webPreferences: {
      preload: environment.preloadPath,
      contextIsolation: true,
      // nodeIntegration: false,
      // devTools: true,
    },
  })

  browserWindow.setIcon(environment.appIconPath)
  browserWindow.setMenu(null)

  if (environment.viteDevServerUrl) {
    browserWindow.loadURL(environment.viteDevServerUrl)
  } else {
    browserWindow.loadFile(path.join(environment.rendererDist, 'index.html'))
  }
    browserWindow.webContents.on('did-finish-load', () => {
    // browserWindow.webContents.openDevTools({
    //   mode: 'detach',
    // })
  })

  return browserWindow
}
