import { app } from 'electron'
import { existsSync, mkdirSync } from 'node:fs'
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
  const sessionDataPath = path.join(userDataPath, 'chromium-session')

  process.env.APP_ROOT = appRoot
  process.env.VITE_PUBLIC = publicPath

  mkdirSync(userDataPath, { recursive: true })
  mkdirSync(sessionDataPath, { recursive: true })
  app.setPath('userData', userDataPath)
  app.setPath('sessionData', sessionDataPath)
  app.setName('Pastel Flow')
  app.setAppUserModelId('com.pastelflow.app')

  return {
    appRoot,
    appIconPath: path.join(publicPath, 'pastel-flow.png'),
    mainDist,
    rendererDist,
    preloadPath: resolvePreloadPath(dirname, mainDist),
    viteDevServerUrl,
  }
}

function resolvePreloadPath(dirname: string, mainDist: string): string {
  const candidates = [
    path.join(dirname, 'preload.mjs'),
    path.join(mainDist, 'preload.mjs'),
  ]

  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0]
}
