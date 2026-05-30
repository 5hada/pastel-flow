"use strict";
const electron = require("electron");
const pastelFlowApi = {
  settings: {
    get() {
      return electron.ipcRenderer.invoke("settings:get");
    },
    update(settings) {
      return electron.ipcRenderer.invoke("settings:update", settings);
    }
  },
  secrets: {
    status() {
      return electron.ipcRenderer.invoke("secrets:status");
    },
    list() {
      return electron.ipcRenderer.invoke("secrets:list");
    },
    create(input) {
      return electron.ipcRenderer.invoke("secrets:create", input);
    },
    delete(id) {
      return electron.ipcRenderer.invoke("secrets:delete", id);
    }
  },
  sync: {
    status() {
      return electron.ipcRenderer.invoke("sync:status");
    },
    export() {
      return electron.ipcRenderer.invoke("sync:export");
    },
    exportFile() {
      return electron.ipcRenderer.invoke("sync:export-file");
    },
    import(snapshot) {
      return electron.ipcRenderer.invoke("sync:import", snapshot);
    },
    importFile() {
      return electron.ipcRenderer.invoke("sync:import-file");
    }
  },
  tools: {
    list() {
      return electron.ipcRenderer.invoke("tools:list");
    },
    registerFolder() {
      return electron.ipcRenderer.invoke("tools:register-folder");
    },
    run(toolId, input) {
      return electron.ipcRenderer.invoke("tools:run", toolId, input);
    },
    createAction(toolId) {
      return electron.ipcRenderer.invoke("tools:create-action", toolId);
    }
  },
  tasks: {
    list() {
      return electron.ipcRenderer.invoke("tasks:list");
    },
    create(input) {
      return electron.ipcRenderer.invoke("tasks:create", input);
    },
    update(id, input) {
      return electron.ipcRenderer.invoke("tasks:update", id, input);
    },
    delete(id) {
      return electron.ipcRenderer.invoke("tasks:delete", id);
    },
    run(id) {
      return electron.ipcRenderer.invoke("tasks:run", id);
    },
    stop(id) {
      return electron.ipcRenderer.invoke("tasks:stop", id);
    },
    listEvents(taskId) {
      return electron.ipcRenderer.invoke("tasks:list-events", taskId);
    },
    pruneEvents() {
      return electron.ipcRenderer.invoke("tasks:prune-events");
    },
    onChanged(listener) {
      const wrappedListener = (_event, task) => listener(task);
      electron.ipcRenderer.on("tasks:changed", wrappedListener);
      return () => {
        electron.ipcRenderer.off("tasks:changed", wrappedListener);
      };
    }
  },
  actions: {
    list() {
      return electron.ipcRenderer.invoke("actions:list");
    }
  },
  workflows: {
    list() {
      return electron.ipcRenderer.invoke("workflows:list");
    },
    create(input) {
      return electron.ipcRenderer.invoke("workflows:create", input);
    },
    update(id, input) {
      return electron.ipcRenderer.invoke("workflows:update", id, input);
    },
    delete(id) {
      return electron.ipcRenderer.invoke("workflows:delete", id);
    },
    run(id) {
      return electron.ipcRenderer.invoke("workflows:run", id);
    },
    stop(id) {
      return electron.ipcRenderer.invoke("workflows:stop", id);
    }
  }
};
electron.contextBridge.exposeInMainWorld("pastelFlow", pastelFlowApi);
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
  // You can expose other APTs you need here.
  // ...
});
