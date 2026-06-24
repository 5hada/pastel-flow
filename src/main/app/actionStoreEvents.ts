import { BrowserWindow } from 'electron'
import { ipcEventChannels, type IpcEventChannel } from '../../shared/ipcChannels'
import type { ActionStore } from '../actions/actionStore'

export function createObservedActionStore(actionStore: ActionStore): ActionStore {
  function broadcast(channel: IpcEventChannel, payload: unknown) {
    BrowserWindow.getAllWindows().forEach((browserWindow) => {
      browserWindow.webContents.send(channel, payload)
    })
  }

  return {
    ...actionStore,
    async createAction(input) {
      const action = await actionStore.createAction(input)
      broadcast(ipcEventChannels.actions.changed, action)
      return action
    },
    async updateAction(id, input) {
      const action = await actionStore.updateAction(id, input)
      broadcast(ipcEventChannels.actions.changed, action)
      return action
    },
    async deleteAction(id) {
      await actionStore.deleteAction(id)
      broadcast(ipcEventChannels.actions.deleted, id)
    },
    async replaceActions(actions) {
      await actionStore.replaceActions(actions)
      broadcast(ipcEventChannels.actions.changed, actions)
    },
  }
}
