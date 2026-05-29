import { ipcRenderer, contextBridge } from 'electron'

const pastelFlowApi = {
  tasks: {
    list() {
      return ipcRenderer.invoke('tasks:list')
    },
    create(input: unknown) {
      return ipcRenderer.invoke('tasks:create', input)
    },
    update(id: string, input: unknown) {
      return ipcRenderer.invoke('tasks:update', id, input)
    },
    delete(id: string) {
      return ipcRenderer.invoke('tasks:delete', id)
    },
  },
}

contextBridge.exposeInMainWorld('pastelFlow', pastelFlowApi)

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})
