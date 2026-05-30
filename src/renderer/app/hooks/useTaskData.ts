import { type FormEvent, useEffect, useMemo, useState } from 'react'
import type { CurrentDevice } from '../../../shared/devices'
import type { AppSettings } from '../../../shared/settings'
import type { TaskRunEvent } from '../../../shared/taskRunEvents'
import type { TaskTemplate } from '../../../shared/tasks'
import type { CreateTaskInput } from '../../api/tasksApi'
import {
  createBrowserTaskForm,
  defaultCreateForm,
  defaultEditForm,
  type BrowserTaskFormState,
  type NavigationCategory,
  type WorkspaceMode,
} from '../taskFormState'
import {
  createDevicePolicyFromForm,
  createTaskConfigFromForm,
  createTaskEditForm,
  createTaskScheduleFromForm,
} from '../utils/taskFormTransforms'
import { filterTasks, getErrorMessage } from '../utils/viewLabels'

type UseTaskDataOptions = {
  appSettings: AppSettings
  currentDevice: CurrentDevice
  loadActionWorkflowData(): Promise<void>
  selectedCategory: NavigationCategory
  setErrorMessage(message: string | null): void
  setWorkspaceMode(mode: WorkspaceMode): void
  workspaceMode: WorkspaceMode
}

export function useTaskData({
  appSettings,
  currentDevice,
  loadActionWorkflowData,
  selectedCategory,
  setErrorMessage,
  setWorkspaceMode,
  workspaceMode,
}: UseTaskDataOptions) {
  const [tasks, setTasks] = useState<TaskTemplate[]>([])
  const [taskRunEvents, setTaskRunEvents] = useState<TaskRunEvent[]>([])
  const [createForm, setCreateForm] =
    useState<BrowserTaskFormState>(defaultCreateForm)
  const [editForm, setEditForm] =
    useState<BrowserTaskFormState>(defaultEditForm)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [confirmDeleteTaskId, setConfirmDeleteTaskId] = useState<string | null>(
    null,
  )
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null)
  const [stoppingTaskId, setStoppingTaskId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  )

  const visibleTasks = useMemo(
    () => filterTasks(tasks, selectedCategory),
    [tasks, selectedCategory],
  )

  useEffect(() => {
    if (!window.pastelFlow) {
      return undefined
    }

    return window.pastelFlow.tasks.onChanged((updatedTask) => {
      if (updatedTask.id === selectedTaskId) {
        void loadTaskRunEvents(updatedTask.id)
      }

      setTasks((currentTasks) => {
        if (!currentTasks.some((task) => task.id === updatedTask.id)) {
          return [...currentTasks, updatedTask]
        }

        return currentTasks.map((task) =>
          task.id === updatedTask.id ? updatedTask : task,
        )
      })
    })
    // The subscription should only be rebound when the selected task changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTaskId])

  useEffect(() => {
    if (selectedTaskId) {
      void loadTaskRunEvents(selectedTaskId)
    } else {
      setTaskRunEvents([])
    }
    // Loading events is intentionally keyed by selection, not by function identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTaskId])

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (tasks.length === 0) {
      setSelectedTaskId(null)
      setConfirmDeleteTaskId(null)
      if (workspaceMode === 'workflows') {
        setWorkspaceMode('run')
      }
      return
    }

    if (!selectedTaskId || !tasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(tasks[0].id)
    }
  }, [tasks, isLoading, selectedTaskId, setWorkspaceMode, workspaceMode])

  async function loadTasks() {
    if (!window.pastelFlow) {
      setErrorMessage('Pastel Flow API를 불러오지 못했습니다.')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setErrorMessage(null)
      setTasks(await window.pastelFlow.tasks.list())
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  async function loadTaskRunEvents(taskId: string) {
    if (!window.pastelFlow) {
      return
    }

    try {
      setTaskRunEvents(await window.pastelFlow.tasks.listEvents(taskId))
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  function startEditing(task: TaskTemplate) {
    setConfirmDeleteTaskId(null)
    setEditForm(createTaskEditForm(task))
  }

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedName = createForm.name.trim()
    if (!trimmedName || !window.pastelFlow) {
      return
    }

    const input: CreateTaskInput = {
      name: trimmedName,
      type: createForm.taskType,
      config: createTaskConfigFromForm(createForm),
      permissions: createDevicePolicyFromForm(createForm, currentDevice),
      schedule: createTaskScheduleFromForm(createForm),
    }

    try {
      setErrorMessage(null)
      const createdTask = await window.pastelFlow.tasks.create(input)
      setTasks((currentTasks) => [...currentTasks, createdTask])
      setSelectedTaskId(createdTask.id)
      setCreateForm(createBrowserTaskForm(appSettings))
      await loadActionWorkflowData()
      setWorkspaceMode('run')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleUpdateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedTask || !window.pastelFlow) {
      return
    }

    const trimmedName = editForm.name.trim()
    if (!trimmedName) {
      return
    }

    try {
      setErrorMessage(null)
      const updatedTask = await window.pastelFlow.tasks.update(selectedTask.id, {
        name: trimmedName,
        config: createTaskConfigFromForm(
          {
            ...editForm,
            taskType: selectedTask.type,
          },
          selectedTask,
        ),
        permissions: createDevicePolicyFromForm(editForm, currentDevice),
        schedule: createTaskScheduleFromForm(editForm),
      })
      await loadActionWorkflowData()
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === updatedTask.id ? updatedTask : task,
        ),
      )
      setSelectedTaskId(updatedTask.id)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!window.pastelFlow) {
      return
    }

    const nextTask = tasks.find((task) => task.id !== taskId) ?? null

    try {
      setErrorMessage(null)
      await window.pastelFlow.tasks.delete(taskId)
      setTasks((currentTasks) =>
        currentTasks.filter((task) => task.id !== taskId),
      )
      setSelectedTaskId(nextTask?.id ?? null)
      setConfirmDeleteTaskId(null)
      if (!nextTask) {
        setWorkspaceMode('run')
      } else {
        startEditing(nextTask)
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleRunTask(taskId: string) {
    if (!window.pastelFlow) {
      return
    }

    try {
      setRunningTaskId(taskId)
      setSelectedTaskId(taskId)
      setErrorMessage(null)
      const updatedTask = await window.pastelFlow.tasks.run(taskId)
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === updatedTask.id ? updatedTask : task,
        ),
      )

      if (updatedTask.state.status === 'failed') {
        setErrorMessage(updatedTask.state.lastError ?? '작업 실행에 실패했습니다.')
      }
      await loadTaskRunEvents(taskId)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setRunningTaskId(null)
    }
  }

  async function handleStopTask(taskId: string) {
    if (!window.pastelFlow) {
      return
    }

    try {
      setStoppingTaskId(taskId)
      setSelectedTaskId(taskId)
      setErrorMessage(null)
      const updatedTask = await window.pastelFlow.tasks.stop(taskId)
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === updatedTask.id ? updatedTask : task,
        ),
      )
      await loadTaskRunEvents(taskId)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setStoppingTaskId(null)
    }
  }

  return {
    confirmDeleteTaskId,
    createForm,
    editForm,
    isLoading,
    runningTaskId,
    selectedTask,
    selectedTaskId,
    stoppingTaskId,
    taskRunEvents,
    tasks,
    visibleTasks,
    handleCreateTask,
    handleDeleteTask,
    handleRunTask,
    handleStopTask,
    handleUpdateTask,
    loadTaskRunEvents,
    loadTasks,
    setConfirmDeleteTaskId,
    setCreateForm,
    setEditForm,
    setSelectedTaskId,
    startEditing,
  }
}
