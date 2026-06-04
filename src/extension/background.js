import { startNativeBridge } from './nativeBridge.js'

chrome.runtime.onInstalled.addListener(() => undefined)
chrome.runtime.onStartup.addListener(() => undefined)

startNativeBridge()
