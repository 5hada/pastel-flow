import type { IpcMain } from 'electron'
import {
  canExecuteTaskOnDevice,
  canViewTaskOnDevice,
  createLocalOnlyDevicePolicy,
} from '../../../src/shared/tasks'
import type { DeviceStore } from '../../devices/store/deviceStore'
import type { AppSettingsStore } from '../../settings/store/appSettingsStore'
import type { TaskRunner } from '../runner/taskRunner'
import type { TaskRunEventStore } from '../store/taskRunEventStore'
import type { TaskStore } from '../store/taskStore'

export function registerTaskIpc(
  ipcMain: IpcMain,
  taskStore: TaskStore,
  taskRunner: TaskRunner,
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
}
