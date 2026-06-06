import { app, BrowserWindow, Menu } from 'electron'
import { createAutoUpdateService } from './app/autoUpdate'
import { configureAppEnvironment } from './app/appEnvironment'
import { createAppWindow } from './app/appWindow'
import {
  initializeMainProcessServices,
  type MainProcessServices,
} from './app/mainProcessServices'
import { registerSingleInstanceGuard } from './app/singleInstance'
// import { installExtension, REDUX_DEVTOOLS } from 'electron-devtools-installer';

let win: BrowserWindow | null = null
let disposeAutoUpdateService: (() => void) | undefined
let mainProcessServices: MainProcessServices | undefined
const appEnvironment = configureAppEnvironment(import.meta.url)

function createWindow() {
  if (win && !win.isDestroyed()) {
    return
  }

  win = createAppWindow(appEnvironment)
  win.on('closed', () => {
    win = null
  })
}

if (registerSingleInstanceGuard({
  createWindow,
  getWindow: () => win,
})) {
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
      win = null
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  app.on('before-quit', () => {
    disposeAutoUpdateService?.()
    disposeAutoUpdateService = undefined
    mainProcessServices?.dispose()
    mainProcessServices = undefined
  })

  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null)

    mainProcessServices = await initializeMainProcessServices(app.getPath('userData'))
    disposeAutoUpdateService = createAutoUpdateService().dispose
    createWindow()
  })
}
