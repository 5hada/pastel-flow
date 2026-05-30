import type { IpcMain } from 'electron'
import {
  canExecuteTaskOnDevice,
  canExecuteWorkflowOnDevice,
  canViewTaskOnDevice,
  canViewWorkflowOnDevice,
  createLocalOnlyDevicePolicy,
} from '../../../src/shared/tasks'
import type { DeviceStore } from '../../devices/store/deviceStore'
import type { AppSettingsStore } from '../../settings/store/appSettingsStore'
import type { TaskRunner } from '../runner/taskRunner'
import type { TaskRunEventStore } from '../store/taskRunEventStore'
import type { TaskStore } from '../store/taskStore'
import type { WorkflowRunner } from '../../workflows/runner/workflowRunner'

export function registerTaskIpc(
  ipcMain: IpcMain,
  taskStore: TaskStore,
  taskRunner: TaskRunner,
  workflowRunner: WorkflowRunner,
  taskRunEventStore: TaskRunEventStore,
  appSettingsStore: AppSettingsStore,
  deviceStore: DeviceStore,
): void {
  ipcMain.handle('tasks:list', async () => {
    const [tasks, currentDevice, appSettingsSnapshot] = await Promise.all([
      taskStore.listTasks(),
      deviceStore.getCurrentDevice(),
      appSettingsStore.getSnapshot(),
    ])

    return tasks.filter((task) =>
      canViewTaskOnDevice(
        task,
        currentDevice,
        appSettingsSnapshot.settings.linkedDevices,
      ),
    )
  })
  ipcMain.handle('actions:list', async () => {
    return taskStore.listActions()
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
  ipcMain.handle('tasks:list-events', async (_event, taskId?: string) => {
    const [tasks, currentDevice, appSettingsSnapshot] = await Promise.all([
      taskStore.listTasks(),
      deviceStore.getCurrentDevice(),
      appSettingsStore.getSnapshot(),
    ])
    const visibleTaskIds = new Set(
      tasks
        .filter((task) =>
          canViewTaskOnDevice(
            task,
            currentDevice,
            appSettingsSnapshot.settings.linkedDevices,
          ),
        )
        .map((task) => task.id),
    )

    if (taskId && !visibleTaskIds.has(taskId)) {
      return []
    }

    const events = await taskRunEventStore.listEvents(taskId)
    return events.filter((event) => visibleTaskIds.has(event.taskId))
  })
  ipcMain.handle('tasks:prune-events', () => taskRunEventStore.pruneEvents())
  ipcMain.handle('tasks:create', async (_event, input) => {
    const currentDevice = await deviceStore.getCurrentDevice()

    return taskStore.createTask({
      ...input,
      permissions: input.permissions ?? createLocalOnlyDevicePolicy(currentDevice),
    })
  })
  ipcMain.handle('tasks:update', async (_event, id, input) => {
    const [task, currentDevice, appSettingsSnapshot] = await Promise.all([
      taskStore.getTask(id),
      deviceStore.getCurrentDevice(),
      appSettingsStore.getSnapshot(),
    ])

    if (
      !canExecuteTaskOnDevice(
        task,
        currentDevice,
        appSettingsSnapshot.settings.linkedDevices,
      )
    ) {
      throw new Error('이 기기에서는 해당 작업을 수정할 수 없습니다.')
    }

    return taskStore.updateTask(id, input)
  })
  ipcMain.handle('tasks:delete', async (_event, id) => {
    const [task, currentDevice, appSettingsSnapshot] = await Promise.all([
      taskStore.getTask(id),
      deviceStore.getCurrentDevice(),
      appSettingsStore.getSnapshot(),
    ])

    if (
      !canExecuteTaskOnDevice(
        task,
        currentDevice,
        appSettingsSnapshot.settings.linkedDevices,
      )
    ) {
      throw new Error('이 기기에서는 해당 작업을 삭제할 수 없습니다.')
    }

    return taskStore.deleteTask(id)
  })
  ipcMain.handle('tasks:run', async (_event, id) => {
    const [task, currentDevice, appSettingsSnapshot] = await Promise.all([
      taskStore.getTask(id),
      deviceStore.getCurrentDevice(),
      appSettingsStore.getSnapshot(),
    ])

    if (
      !canExecuteTaskOnDevice(
        task,
        currentDevice,
        appSettingsSnapshot.settings.linkedDevices,
      )
    ) {
      throw new Error('이 기기에서는 해당 작업을 실행할 수 없습니다.')
    }

    return taskRunner.runTask(id)
  })
  ipcMain.handle('tasks:stop', async (_event, id) => {
    const [task, currentDevice, appSettingsSnapshot] = await Promise.all([
      taskStore.getTask(id),
      deviceStore.getCurrentDevice(),
      appSettingsStore.getSnapshot(),
    ])

    if (
      !canExecuteTaskOnDevice(
        task,
        currentDevice,
        appSettingsSnapshot.settings.linkedDevices,
      )
    ) {
      throw new Error('이 기기에서는 해당 작업을 중지할 수 없습니다.')
    }

    return taskRunner.stopTask(id)
  })
}
