import { ipcRenderer, contextBridge } from 'electron'

const pastelFlowApi = {
  settings: {
    get() {
      return ipcRenderer.invoke('settings:get')
    },
    update(settings: unknown) {
      return ipcRenderer.invoke('settings:update', settings)
    },
  },
  secrets: {
    status() {
      return ipcRenderer.invoke('secrets:status')
    },
    list() {
      return ipcRenderer.invoke('secrets:list')
    },
    create(input: unknown) {
      return ipcRenderer.invoke('secrets:create', input)
    },
    delete(id: string) {
      return ipcRenderer.invoke('secrets:delete', id)
    },
  },
  sync: {
    status() {
      return ipcRenderer.invoke('sync:status')
    },
    export() {
      return ipcRenderer.invoke('sync:export')
    },
    exportFile() {
      return ipcRenderer.invoke('sync:export-file')
    },
    import(snapshot?: unknown) {
      return ipcRenderer.invoke('sync:import', snapshot)
    },
    importFile() {
      return ipcRenderer.invoke('sync:import-file')
    },
  },
  tools: {
    list() {
      return ipcRenderer.invoke('tools:list')
    },
    registerFolder() {
      return ipcRenderer.invoke('tools:register-folder')
    },
    run(toolId: string, input: unknown) {
      return ipcRenderer.invoke('tools:run', toolId, input)
    },
    createAction(toolId: string) {
      return ipcRenderer.invoke('tools:create-action', toolId)
    },
  },
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
    run(id: string) {
      return ipcRenderer.invoke('tasks:run', id)
    },
    stop(id: string) {
      return ipcRenderer.invoke('tasks:stop', id)
    },
    listEvents(taskId?: string) {
      return ipcRenderer.invoke('tasks:list-events', taskId)
    },
    pruneEvents() {
      return ipcRenderer.invoke('tasks:prune-events')
    },
    onChanged(listener: (task: unknown) => void) {
      const wrappedListener = (_event: Electron.IpcRendererEvent, task: unknown) =>
        listener(task)

      ipcRenderer.on('tasks:changed', wrappedListener)

      return () => {
        ipcRenderer.off('tasks:changed', wrappedListener)
      }
    },
  },
  actions: {
    list() {
      return ipcRenderer.invoke('actions:list')
    },
    create(input: unknown) {
      return ipcRenderer.invoke('actions:create', input)
    },
    update(id: string, input: unknown) {
      return ipcRenderer.invoke('actions:update', id, input)
    },
    delete(id: string) {
      return ipcRenderer.invoke('actions:delete', id)
    },
  },
  workflows: {
    list() {
      return ipcRenderer.invoke('workflows:list')
    },
    create(input: unknown) {
      return ipcRenderer.invoke('workflows:create', input)
    },
    update(id: string, input: unknown) {
      return ipcRenderer.invoke('workflows:update', id, input)
    },
    delete(id: string) {
      return ipcRenderer.invoke('workflows:delete', id)
    },
    run(id: string) {
      return ipcRenderer.invoke('workflows:run', id)
    },
    stop(id: string) {
      return ipcRenderer.invoke('workflows:stop', id)
    },
    listEvents(workflowId?: string) {
      return ipcRenderer.invoke('workflows:list-events', workflowId)
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
