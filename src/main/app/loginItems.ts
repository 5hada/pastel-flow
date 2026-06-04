import { app } from 'electron'

export function applyLoginItemSettings(openAtLogin: boolean): void {
  app.setLoginItemSettings({
    openAtLogin,
  })
}
