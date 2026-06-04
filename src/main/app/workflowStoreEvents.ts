import { BrowserWindow } from 'electron'
import { ipcEventChannels, type IpcEventChannel } from '../../shared/ipcChannels'
import type { WorkflowStore } from '../workflows/store/workflowStore'

export function createObservedWorkflowStore(workflowStore: WorkflowStore): WorkflowStore {
  function broadcast(channel: IpcEventChannel, payload: unknown) {
    BrowserWindow.getAllWindows().forEach((browserWindow) => {
      browserWindow.webContents.send(channel, payload)
    })
  }

  return {
    ...workflowStore,
    async createAction(input) {
      const action = await workflowStore.createAction(input)
      broadcast(ipcEventChannels.actions.changed, action)
      return action
    },
    async updateAction(id, input) {
      const action = await workflowStore.updateAction(id, input)
      broadcast(ipcEventChannels.actions.changed, action)
      return action
    },
    async deleteAction(id) {
      await workflowStore.deleteAction(id)
      broadcast(ipcEventChannels.actions.deleted, id)
    },
    async createWorkflow(input) {
      const workflow = await workflowStore.createWorkflow(input)
      broadcast(ipcEventChannels.workflows.changed, workflow)
      return workflow
    },
    async updateWorkflow(id, input) {
      const workflow = await workflowStore.updateWorkflow(id, input)
      broadcast(ipcEventChannels.workflows.changed, workflow)
      return workflow
    },
    async deleteWorkflow(id) {
      await workflowStore.deleteWorkflow(id)
      broadcast(ipcEventChannels.workflows.deleted, id)
    },
  }
}
