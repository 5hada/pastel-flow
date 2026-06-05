import { postNativeEvent, startNativeBridge } from './nativeBridge.js'
import { startManagedGroupTracking } from './tabGroups.js'

chrome.runtime.onInstalled.addListener(() => undefined)
chrome.runtime.onStartup.addListener(() => undefined)

startManagedGroupTracking(postNativeEvent)
startNativeBridge()
