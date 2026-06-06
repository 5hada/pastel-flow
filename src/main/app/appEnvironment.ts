import { app } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

export type AppEnvironment = {
  appRoot: string
  appIconPath: string
  mainDist: string
  rendererDist: string
  preloadPath: string
  viteDevServerUrl: string | undefined
}

export function configureAppEnvironment(importMetaUrl: string): AppEnvironment {
  const dirname = path.dirname(fileURLToPath(importMetaUrl))
  const appRoot = path.join(dirname, '..')
  const viteDevServerUrl = process.env['VITE_DEV_SERVER_URL']
  const mainDist = path.join(appRoot, 'dist-electron')
  const rendererDist = path.join(appRoot, 'dist')
  const publicPath = viteDevServerUrl ? path.join(appRoot, 'public') : rendererDist
  const userDataPath = path.join(app.getPath('appData'), 'pastel-flow')

  process.env.APP_ROOT = appRoot
  process.env.VITE_PUBLIC = publicPath

  app.setPath('userData', userDataPath)
  app.setPath('sessionData', path.join(userDataPath, 'chromium-session'))
  app.setName('Pastel Flow')
  app.setAppUserModelId('com.pastelflow.app')

  return {
    appRoot,
    appIconPath: path.join(publicPath, 'pastel-flow.png'),
    mainDist,
    rendererDist,
    preloadPath: path.join(dirname, 'preload.mjs'),
    viteDevServerUrl,
  }
}
