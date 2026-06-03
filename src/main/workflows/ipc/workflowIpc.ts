import type { IpcMain } from 'electron'
import {
  canExecuteWorkflowOnDevice,
  canViewWorkflowOnDevice,
  createLocalOnlyDevicePolicy,
} from '../../../shared/devices/'
import { ipcRequestChannels } from '../../../shared/ipcChannels'
import type { DeviceStore } from '../../devices/store/deviceStore'
import type { AppSettingsStore } from '../../settings/store/appSettingsStore'
import type { WorkflowRunEventStore } from '../store/workflowRunEventStore'
import type { WorkflowStore } from '../store/workflowStore'
import type { WorkflowRunner } from '../workflowRunner'

export function registerWorkflowIpc(
  ipcMain: IpcMain,
  WorkflowStore: WorkflowStore,
  workflowRunner: WorkflowRunner,
  WorkflowRunEventStore: WorkflowRunEventStore,
  appSettingsStore: AppSettingsStore,
  deviceStore: DeviceStore,
): void {
  async function listVisibleWorkflows() {
    const [workflows, currentDevice, appSettingsSnapshot] = await Promise.all([
      WorkflowStore.listWorkflows(),
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
  }

  async function assertCanExecuteWorkflow(id: string) {
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
      throw new Error('이 기기에서는 해당 Workflow를 변경할 수 없습니다.')
    }

    return workflow
  }

  async function listWorkflowEvents(workflowId?: string) {
    const workflows = await listVisibleWorkflows()
    const visibleWorkflowIds = new Set(
      workflows.map((workflow) => workflow.id),
    )

    if (workflowId && !visibleWorkflowIds.has(workflowId)) {
      return []
    }

    const events = await WorkflowRunEventStore.listEvents(workflowId)
    return events.filter(
      (event) => event.workflowId && visibleWorkflowIds.has(event.workflowId),
    )
  }

  ipcMain.handle(ipcRequestChannels.actions.list, async () => {
    return WorkflowStore.listActions()
  })
  ipcMain.handle(ipcRequestChannels.actions.create, async (_event, input) => {
    return WorkflowStore.createAction(input)
  })
  ipcMain.handle(ipcRequestChannels.actions.update, async (_event, id, input) => {
    return WorkflowStore.updateAction(id, input)
  })
  ipcMain.handle(ipcRequestChannels.actions.delete, async (_event, id) => {
    return WorkflowStore.deleteAction(id)
  })
  ipcMain.handle(ipcRequestChannels.workflows.legacyList, async () => {
    return listVisibleWorkflows()
  })
  ipcMain.handle(ipcRequestChannels.workflows.legacyCreate, async (_event, input) => {
    const currentDevice = await deviceStore.getCurrentDevice()
    const workflowInput = (isRecord(input) ? input : {}) as Parameters<
      WorkflowStore['createWorkflow']
    >[0]

    return WorkflowStore.createWorkflow({
      ...workflowInput,
      permissions:
        workflowInput.permissions ?? createLocalOnlyDevicePolicy(currentDevice),
    })
  })
  ipcMain.handle(ipcRequestChannels.workflows.legacyUpdate, async (_event, id, input) => {
    await assertCanExecuteWorkflow(id)
    return WorkflowStore.updateWorkflow(id, input)
  })
  ipcMain.handle(ipcRequestChannels.workflows.legacyDelete, async (_event, id) => {
    await assertCanExecuteWorkflow(id)
    return WorkflowStore.deleteWorkflow(id)
  })
  ipcMain.handle(ipcRequestChannels.workflows.list, async () => {
    return listVisibleWorkflows()
  })
  ipcMain.handle(ipcRequestChannels.workflows.create, async (_event, input) => {
    const currentDevice = await deviceStore.getCurrentDevice()
    return WorkflowStore.createWorkflow({
      ...input,
      permissions: input.permissions ?? createLocalOnlyDevicePolicy(currentDevice),
    })
  })
  ipcMain.handle(ipcRequestChannels.workflows.update, async (_event, id, input) => {
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

    return WorkflowStore.updateWorkflow(id, input)
  })
  ipcMain.handle(ipcRequestChannels.workflows.delete, async (_event, id) => {
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

    return WorkflowStore.deleteWorkflow(id)
  })
  ipcMain.handle(ipcRequestChannels.workflows.run, async (_event, id) => {
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
  ipcMain.handle(ipcRequestChannels.workflows.stop, async (_event, id) => {
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
  ipcMain.handle(ipcRequestChannels.workflows.listEvents, (_event, workflowId?: string) =>
    listWorkflowEvents(workflowId),
  )
  ipcMain.handle(ipcRequestChannels.tasks.listEvents, (_event, workflowId?: string) =>
    listWorkflowEvents(workflowId),
  )
  ipcMain.handle(ipcRequestChannels.tasks.pruneEvents, () =>
    WorkflowRunEventStore.pruneEvents(),
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
