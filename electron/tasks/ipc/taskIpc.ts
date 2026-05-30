import type { IpcMain } from 'electron'
import {
  canExecuteWorkflowOnDevice,
  canViewWorkflowOnDevice,
  createLocalOnlyDevicePolicy,
} from '../../../src/shared/tasks'
import type { DeviceStore } from '../../devices/store/deviceStore'
import type { AppSettingsStore } from '../../settings/store/appSettingsStore'
import type { TaskRunEventStore } from '../store/taskRunEventStore'
import type { TaskStore } from '../store/taskStore'
import type { WorkflowRunner } from '../../workflows/runner/workflowRunner'

export function registerTaskIpc(
  ipcMain: IpcMain,
  taskStore: TaskStore,
  workflowRunner: WorkflowRunner,
  taskRunEventStore: TaskRunEventStore,
  appSettingsStore: AppSettingsStore,
  deviceStore: DeviceStore,
): void {
  async function listWorkflowEvents(workflowId?: string) {
    const [workflows, currentDevice, appSettingsSnapshot] = await Promise.all([
      taskStore.listWorkflows(),
      deviceStore.getCurrentDevice(),
      appSettingsStore.getSnapshot(),
    ])
    const visibleWorkflowIds = new Set(
      workflows
        .filter((workflow) =>
          canViewWorkflowOnDevice(
            workflow,
            currentDevice,
            appSettingsSnapshot.settings.linkedDevices,
          ),
        )
        .map((workflow) => workflow.id),
    )

    if (workflowId && !visibleWorkflowIds.has(workflowId)) {
      return []
    }

    const events = await taskRunEventStore.listEvents(workflowId)
    return events.filter(
      (event) => event.workflowId && visibleWorkflowIds.has(event.workflowId),
    )
  }

  ipcMain.handle('tasks:list', async () => [])
  ipcMain.handle('actions:list', async () => {
    return taskStore.listActions()
  })
  ipcMain.handle('actions:create', async (_event, input) => {
    return taskStore.createAction(input)
  })
  ipcMain.handle('actions:update', async (_event, id, input) => {
    return taskStore.updateAction(id, input)
  })
  ipcMain.handle('actions:delete', async (_event, id) => {
    return taskStore.deleteAction(id)
  })
  ipcMain.handle('workflows:list', async () => {
    const [workflows, currentDevice, appSettingsSnapshot] = await Promise.all([
      taskStore.listWorkflows(),
      deviceStore.getCurrentDevice(),
      appSettingsStore.getSnapshot(),
    ])

    return workflows.filter((workflow) =>
      canViewWorkflowOnDevice(
        workflow,
        currentDevice,
        appSettingsSnapshot.settings.linkedDevices,
      ),
    )
  })
  ipcMain.handle('workflows:create', async (_event, input) => {
    const currentDevice = await deviceStore.getCurrentDevice()
    return taskStore.createWorkflow({
      ...input,
      permissions: input.permissions ?? createLocalOnlyDevicePolicy(currentDevice),
    })
  })
  ipcMain.handle('workflows:update', async (_event, id, input) => {
    const [workflow, currentDevice, appSettingsSnapshot] = await Promise.all([
      workflowRunner.getWorkflow(id),
      deviceStore.getCurrentDevice(),
      appSettingsStore.getSnapshot(),
    ])

    if (
      !canExecuteWorkflowOnDevice(
        workflow,
        currentDevice,
        appSettingsSnapshot.settings.linkedDevices,
      )
    ) {
      throw new Error('이 기기에서는 해당 Workflow를 수정할 수 없습니다.')
    }

    return taskStore.updateWorkflow(id, input)
  })
  ipcMain.handle('workflows:delete', async (_event, id) => {
    const [workflow, currentDevice, appSettingsSnapshot] = await Promise.all([
      workflowRunner.getWorkflow(id),
      deviceStore.getCurrentDevice(),
      appSettingsStore.getSnapshot(),
    ])

    if (
      !canExecuteWorkflowOnDevice(
        workflow,
        currentDevice,
        appSettingsSnapshot.settings.linkedDevices,
      )
    ) {
      throw new Error('이 기기에서는 해당 Workflow를 삭제할 수 없습니다.')
    }

    return taskStore.deleteWorkflow(id)
  })
  ipcMain.handle('workflows:run', async (_event, id) => {
    const [workflow, currentDevice, appSettingsSnapshot] = await Promise.all([
      workflowRunner.getWorkflow(id),
      deviceStore.getCurrentDevice(),
      appSettingsStore.getSnapshot(),
    ])

    if (
      !canExecuteWorkflowOnDevice(
        workflow,
        currentDevice,
        appSettingsSnapshot.settings.linkedDevices,
      )
    ) {
      throw new Error('이 기기에서는 해당 Workflow를 실행할 수 없습니다.')
    }

    return workflowRunner.runWorkflow(id)
  })
  ipcMain.handle('workflows:stop', async (_event, id) => {
    const [workflow, currentDevice, appSettingsSnapshot] = await Promise.all([
      workflowRunner.getWorkflow(id),
      deviceStore.getCurrentDevice(),
      appSettingsStore.getSnapshot(),
    ])

    if (
      !canExecuteWorkflowOnDevice(
        workflow,
        currentDevice,
        appSettingsSnapshot.settings.linkedDevices,
      )
    ) {
      throw new Error('이 기기에서는 해당 Workflow를 중지할 수 없습니다.')
    }

    return workflowRunner.stopWorkflow(id)
  })
  ipcMain.handle('workflows:list-events', (_event, workflowId?: string) =>
    listWorkflowEvents(workflowId),
  )
  ipcMain.handle('tasks:list-events', (_event, workflowId?: string) =>
    listWorkflowEvents(workflowId),
  )
  ipcMain.handle('tasks:prune-events', () => taskRunEventStore.pruneEvents())
}
