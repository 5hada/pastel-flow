import { ipcRenderer, contextBridge } from 'electron'
import {
  ipcEventChannels,
  ipcRequestChannels,
  type IpcEventChannel,
  type IpcRequestChannel,
} from '../shared/ipcChannels'

type IpcListener<TPayload> = (payload: TPayload) => void

function invoke<TResult>(
  channel: IpcRequestChannel,
  ...args: unknown[]
): Promise<TResult> {
  return ipcRenderer.invoke(channel, ...args) as Promise<TResult>
}

function subscribe<TPayload>(
        channel: IpcEventChannel,
        listener: IpcListener<TPayload>,
      ): () => void {
  const wrappedListener = (
    _event: Electron.IpcRendererEvent,
    payload: TPayload,
  ) => listener(payload)

  ipcRenderer.on(channel, wrappedListener)

  return () => {
    ipcRenderer.off(channel, wrappedListener)
  }
}

const pastelFlowApi = {
  settings: {
    get() {
      return invoke(ipcRequestChannels.settings.get)
    },
    update(settings: unknown) {
      return invoke(ipcRequestChannels.settings.update, settings)
    },
  },
  secrets: {
    status() {
      return invoke(ipcRequestChannels.secrets.status)
    },
    list() {
      return invoke(ipcRequestChannels.secrets.list)
    },
    create(input: unknown) {
      return invoke(ipcRequestChannels.secrets.create, input)
    },
    delete(id: string) {
      return invoke(ipcRequestChannels.secrets.delete, id)
    },
  },
  sync: {
    status() {
      return invoke(ipcRequestChannels.sync.status)
    },
    export() {
      return invoke(ipcRequestChannels.sync.export)
    },
    exportFile() {
      return invoke(ipcRequestChannels.sync.exportFile)
    },
    import(snapshot?: unknown) {
      return invoke(ipcRequestChannels.sync.import, snapshot)
    },
    importFile() {
      return invoke(ipcRequestChannels.sync.importFile)
    },
  },
  tools: {
    list() {
      return invoke(ipcRequestChannels.tools.list)
    },
    registerFolder() {
      return invoke(ipcRequestChannels.tools.registerFolder)
    },
    run(toolId: string, input: unknown) {
      return invoke(ipcRequestChannels.tools.run, toolId, input)
    },
    createAction(toolId: string, inputDefaults?: Record<string, unknown>) {
      return invoke(ipcRequestChannels.tools.createAction, toolId, inputDefaults)
    },
  },
  todos: {
    list(input?: unknown) {
      return invoke(ipcRequestChannels.todos.list, input)
    },
    create(input: unknown) {
      return invoke(ipcRequestChannels.todos.create, input)
    },
    update(id: string, input: unknown) {
      return invoke(ipcRequestChannels.todos.update, id, input)
    },
    delete(id: string) {
      return invoke(ipcRequestChannels.todos.delete, id)
    },
  },
  externalBridge: {
    getSchema() {
      return invoke(ipcRequestChannels.externalBridge.getSchema)
    },
  },
  tasks: {
    list() {
      return invoke(ipcRequestChannels.tasks.list)
    },
    create(input: unknown) {
      return invoke(ipcRequestChannels.tasks.create, input)
    },
    update(id: string, input: unknown) {
      return invoke(ipcRequestChannels.tasks.update, id, input)
    },
    delete(id: string) {
      return invoke(ipcRequestChannels.tasks.delete, id)
    },
    run(id: string) {
      return invoke(ipcRequestChannels.tasks.run, id)
    },
    stop(id: string) {
      return invoke(ipcRequestChannels.tasks.stop, id)
    },
    listEvents(taskId?: string) {
      return invoke(ipcRequestChannels.tasks.listEvents, taskId)
    },
    pruneEvents() {
      return invoke(ipcRequestChannels.tasks.pruneEvents)
    },
    onChanged(listener: (task: unknown) => void) {
      return subscribe(ipcEventChannels.tasks.changed, listener)
    },
  },
  actions: {
    list() {
      return invoke(ipcRequestChannels.actions.list)
    },
    create(input: unknown) {
      return invoke(ipcRequestChannels.actions.create, input)
    },
    update(id: string, input: unknown) {
      return invoke(ipcRequestChannels.actions.update, id, input)
    },
    delete(id: string) {
      return invoke(ipcRequestChannels.actions.delete, id)
    },
    onChanged(listener: (action: unknown) => void) {
      return subscribe(ipcEventChannels.actions.changed, listener)
    },
    onDeleted(listener: (actionId: string) => void) {
      return subscribe(ipcEventChannels.actions.deleted, listener)
    },
  },
  urlGroups: {
    list() {
      return invoke(ipcRequestChannels.urlGroups.list)
    },
    create(input: unknown) {
      return invoke(ipcRequestChannels.urlGroups.create, input)
    },
    update(id: string, input: unknown) {
      return invoke(ipcRequestChannels.urlGroups.update, id, input)
    },
    delete(id: string) {
      return invoke(ipcRequestChannels.urlGroups.delete, id)
    },
  },
  workflows: {
    list() {
      return invoke(ipcRequestChannels.workflows.list)
    },
    create(input: unknown) {
      return invoke(ipcRequestChannels.workflows.create, input)
    },
    update(id: string, input: unknown) {
      return invoke(ipcRequestChannels.workflows.update, id, input)
    },
    delete(id: string) {
      return invoke(ipcRequestChannels.workflows.delete, id)
    },
    run(id: string) {
      return invoke(ipcRequestChannels.workflows.run, id)
    },
    stop(id: string) {
      return invoke(ipcRequestChannels.workflows.stop, id)
    },
    listRuns(workflowId?: string) {
      return invoke(ipcRequestChannels.workflows.listRuns, workflowId)
    },
    listActionRuns(runId: string) {
      return invoke(ipcRequestChannels.workflows.listActionRuns, runId)
    },
    listUrlItemRuns(input: unknown) {
      return invoke(ipcRequestChannels.workflows.listUrlItemRuns, input)
    },
    listArtifacts(input: unknown) {
      return invoke(ipcRequestChannels.workflows.listArtifacts, input)
    },
    listEvents(workflowId?: string) {
      return invoke(ipcRequestChannels.workflows.listEvents, workflowId)
    },
    pruneEvents() {
      return invoke(ipcRequestChannels.workflows.pruneEvents)
    },
    onChanged(listener: (workflow: unknown) => void) {
      return subscribe(ipcEventChannels.workflows.changed, listener)
    },
    onDeleted(listener: (workflowId: string) => void) {
      return subscribe(ipcEventChannels.workflows.deleted, listener)
    },
  },
}

contextBridge.exposeInMainWorld('pastelFlow', pastelFlowApi)
