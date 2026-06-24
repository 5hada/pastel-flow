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
