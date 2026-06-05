import { app, BrowserWindow, Menu } from 'electron'
import { configureAppEnvironment } from './app/appEnvironment'
import { createAppWindow } from './app/appWindow'
import { initializeMainProcessServices } from './app/mainProcessServices'
// import { installExtension, REDUX_DEVTOOLS } from 'electron-devtools-installer';

let win: BrowserWindow | null = null
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

app.whenReady().then(async () => {
  // try {
  //   const ext = await installExtension(REDUX_DEVTOOLS)
  //   console.log(`Added Extension: ${ext.name}`)
  // } catch (err) {
  //   console.log('An error occurred:', err)
  // }
  Menu.setApplicationMenu(null)

  await initializeMainProcessServices(app.getPath('userData'))
  createWindow()
})
