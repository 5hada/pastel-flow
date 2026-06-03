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
    return WorkflowStore.createAction(assertCreateActionInput(input))
  })
  ipcMain.handle(ipcRequestChannels.actions.update, async (_event, id, input) => {
    return WorkflowStore.updateAction(
      assertString(id, 'Action ID'),
      assertRecord(input, 'Action 수정 입력') as Parameters<
        WorkflowStore['updateAction']
      >[1],
    )
  })
  ipcMain.handle(ipcRequestChannels.actions.delete, async (_event, id) => {
    return WorkflowStore.deleteAction(assertString(id, 'Action ID'))
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
    const workflowId = assertString(id, 'Workflow ID')
    await assertCanExecuteWorkflow(workflowId)
    return WorkflowStore.updateWorkflow(
      workflowId,
      assertRecord(input, 'Workflow 수정 입력'),
    )
  })
  ipcMain.handle(ipcRequestChannels.workflows.legacyDelete, async (_event, id) => {
    const workflowId = assertString(id, 'Workflow ID')
    await assertCanExecuteWorkflow(workflowId)
    return WorkflowStore.deleteWorkflow(workflowId)
  })
  ipcMain.handle(ipcRequestChannels.workflows.list, async () => {
    return listVisibleWorkflows()
  })
  ipcMain.handle(ipcRequestChannels.workflows.create, async (_event, input) => {
    const currentDevice = await deviceStore.getCurrentDevice()
    const workflowInput = assertRecord(input, 'Workflow 생성 입력') as Parameters<
      WorkflowStore['createWorkflow']
    >[0]

    return WorkflowStore.createWorkflow({
      ...workflowInput,
      permissions:
        workflowInput.permissions ?? createLocalOnlyDevicePolicy(currentDevice),
    })
  })
  ipcMain.handle(ipcRequestChannels.workflows.update, async (_event, id, input) => {
    const workflowId = assertString(id, 'Workflow ID')
    const [workflow, currentDevice, appSettingsSnapshot] = await Promise.all([
      workflowRunner.getWorkflow(workflowId),
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

    return WorkflowStore.updateWorkflow(
      workflowId,
      assertRecord(input, 'Workflow 수정 입력') as Parameters<
        WorkflowStore['updateWorkflow']
      >[1],
    )
  })
  ipcMain.handle(ipcRequestChannels.workflows.delete, async (_event, id) => {
    const workflowId = assertString(id, 'Workflow ID')
    const [workflow, currentDevice, appSettingsSnapshot] = await Promise.all([
      workflowRunner.getWorkflow(workflowId),
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

    return WorkflowStore.deleteWorkflow(workflowId)
  })
  ipcMain.handle(ipcRequestChannels.workflows.run, async (_event, id) => {
    const workflowId = assertString(id, 'Workflow ID')
    const [workflow, currentDevice, appSettingsSnapshot] = await Promise.all([
      workflowRunner.getWorkflow(workflowId),
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

    return workflowRunner.runWorkflow(workflowId)
  })
  ipcMain.handle(ipcRequestChannels.workflows.stop, async (_event, id) => {
    const workflowId = assertString(id, 'Workflow ID')
    const [workflow, currentDevice, appSettingsSnapshot] = await Promise.all([
      workflowRunner.getWorkflow(workflowId),
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

    return workflowRunner.stopWorkflow(workflowId)
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
  ipcMain.handle(ipcRequestChannels.workflows.pruneEvents, () =>
    WorkflowRunEventStore.pruneEvents(),
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function assertRecord(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${label}은 객체여야 합니다.`)
  }

  return value
}

function assertString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label}가 필요합니다.`)
  }

  return value
}

function assertCreateActionInput(
  value: unknown,
): Parameters<WorkflowStore['createAction']>[0] {
  const input = assertRecord(value, 'Action 생성 입력')
  if (typeof input.name !== 'string' || !input.name.trim()) {
    throw new Error('Action 이름이 필요합니다.')
  }

  if (typeof input.type !== 'string') {
    throw new Error('Action type이 필요합니다.')
  }

  if (!('config' in input)) {
    throw new Error('Action config가 필요합니다.')
  }

  return input as Parameters<WorkflowStore['createAction']>[0]
}
