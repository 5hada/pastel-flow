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
