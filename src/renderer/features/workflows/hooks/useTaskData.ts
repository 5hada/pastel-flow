import { type FormEvent, useEffect, useMemo, useState } from 'react'
import type { CurrentDevice } from '../../../../shared/devices'
import type { AppSettings } from '../../../../shared/settings'
import type { TaskRunEvent } from '../../../../shared/taskRunEvents'
import type { ActionDefinition } from '../../../../shared/actions'
import type { WorkflowDefinition } from '../../../../shared/workflows'
import type { TaskTemplate } from '../../../shared/state/taskTypes'
import {
  createBrowserTaskForm,
  defaultCreateForm,
  defaultEditForm,
  type BrowserTaskFormState,
  type NavigationCategory,
  type WorkspaceMode,
} from '../../../shared/state/taskFormState'
import {
  createDevicePolicyFromForm,
  createTaskConfigFromForm,
  createTaskEditForm,
  createTaskScheduleFromForm,
} from '../../../shared/utils/taskFormTransforms'
import { filterTasks, getErrorMessage } from '../../../shared/utils/viewLabels'

type UseTaskDataOptions = {
  appSettings: AppSettings
  currentDevice: CurrentDevice
  loadActionWorkflowData(): Promise<void>
  selectedCategory: NavigationCategory
  selectAction(actionId: string | null): void
  setErrorMessage(message: string | null): void
  setWorkspaceMode(mode: WorkspaceMode): void
}

export function useTaskData({
  appSettings,
  currentDevice,
  loadActionWorkflowData,
  selectedCategory,
  selectAction,
  setErrorMessage,
  setWorkspaceMode,
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

    const unsubscribeActionChanged = window.pastelFlow.actions.onChanged(() => {
      void loadTasks()
    })
    const unsubscribeWorkflowChanged = window.pastelFlow.workflows.onChanged(
      () => {
        void loadTasks()
      },
    )

    return () => {
      unsubscribeActionChanged()
      unsubscribeWorkflowChanged()
    }
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
      return
    }

    if (!selectedTaskId || !tasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(tasks[0].id)
    }
  }, [tasks, isLoading, selectedTaskId])

  async function loadTasks() {
    if (!window.pastelFlow) {
      setErrorMessage('Pastel Flow API를 불러오지 못했습니다.')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setErrorMessage(null)
      const [actions, workflows] = await Promise.all([
        window.pastelFlow.actions.list(),
        window.pastelFlow.workflows.list(),
      ])
      setTasks(createWorkflowTemplates(actions, workflows))
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  async function loadTaskRunEvents(workflowId: string) {
    if (!window.pastelFlow) {
      return
    }

    try {
      setTaskRunEvents(await window.pastelFlow.workflows.listEvents(workflowId))
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

    const action = {
      name: trimmedName,
      type: getActionType(createForm.taskType),
      config: createTaskConfigFromForm(createForm),
    }

    try {
      setErrorMessage(null)
      const createdAction = await window.pastelFlow.actions.create(action)

      if (createForm.createSingleActionWorkflow) {
        const createdWorkflow = await window.pastelFlow.workflows.create({
          name: trimmedName,
          permissions: createDevicePolicyFromForm(createForm, currentDevice),
          schedule: createTaskScheduleFromForm(createForm),
          state: { status: 'idle' },
          actionRefs: [
            {
              id: crypto.randomUUID(),
              actionId: createdAction.id,
              order: 0,
              enabled: true,
            },
          ],
        })
        setTasks((currentTasks) => [
          ...currentTasks,
          createWorkflowTemplate(createdAction, createdWorkflow),
        ])
        setSelectedTaskId(createdAction.id)
        setWorkspaceMode('run')
      } else {
        setWorkspaceMode('actions')
      }

      setCreateForm(createBrowserTaskForm(appSettings))
      await loadActionWorkflowData()
      if (!createForm.createSingleActionWorkflow) {
        selectAction(createdAction.id)
      }
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
      const updatedAction = await window.pastelFlow.actions.update(selectedTask.id, {
        name: trimmedName,
        config: createTaskConfigFromForm(
          {
            ...editForm,
            taskType: selectedTask.type,
          },
          selectedTask,
        ),
      })
      const workflows = await window.pastelFlow.workflows.list()
      const linkedWorkflow = workflows.find((workflow) =>
        workflow.actionRefs.some((actionRef) => actionRef.actionId === selectedTask.id),
      )
      const updatedWorkflow = linkedWorkflow
        ? await window.pastelFlow.workflows.update(linkedWorkflow.id, {
            name: trimmedName,
            permissions: createDevicePolicyFromForm(editForm, currentDevice),
            schedule: createTaskScheduleFromForm(editForm),
          })
        : undefined
      const updatedTask = createWorkflowTemplate(
        updatedAction,
        updatedWorkflow ?? {
          id: selectedTask.id,
          name: trimmedName,
          actionRefs: [],
          permissions: selectedTask.permissions,
          schedule: selectedTask.schedule,
          state: selectedTask.state,
          createdAt: selectedTask.createdAt,
          updatedAt: updatedAction.updatedAt,
        },
      )
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
      await window.pastelFlow.actions.delete(taskId)
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
      const workflows = await window.pastelFlow.workflows.list()
      const workflow = workflows.find((currentWorkflow) =>
        currentWorkflow.actionRefs.some((actionRef) => actionRef.actionId === taskId),
      )
      if (!workflow) {
        throw new Error('Action이 연결된 Workflow를 찾지 못했습니다.')
      }
      const updatedWorkflow = await window.pastelFlow.workflows.run(workflow.id)
      const action = await window.pastelFlow.actions
        .list()
        .then((actions) => actions.find((currentAction) => currentAction.id === taskId))
      if (!action) {
        throw new Error('Action을 찾지 못했습니다.')
      }
      const updatedTask = createWorkflowTemplate(action, updatedWorkflow)
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === updatedTask.id ? updatedTask : task,
        ),
      )

      if (updatedTask.state.status === 'failed') {
        setErrorMessage(updatedTask.state.lastError ?? '작업 실행에 실패했습니다.')
      }
      await loadTaskRunEvents(workflow.id)
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
      const workflows = await window.pastelFlow.workflows.list()
      const workflow = workflows.find((currentWorkflow) =>
        currentWorkflow.actionRefs.some((actionRef) => actionRef.actionId === taskId),
      )
      if (!workflow) {
        throw new Error('Action이 연결된 Workflow를 찾지 못했습니다.')
      }
      const updatedWorkflow = await window.pastelFlow.workflows.stop(workflow.id)
      const action = await window.pastelFlow.actions
        .list()
        .then((actions) => actions.find((currentAction) => currentAction.id === taskId))
      if (!action) {
        throw new Error('Action을 찾지 못했습니다.')
      }
      const updatedTask = createWorkflowTemplate(action, updatedWorkflow)
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === updatedTask.id ? updatedTask : task,
        ),
      )
      await loadTaskRunEvents(workflow.id)
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

function createWorkflowTemplates(
  actions: ActionDefinition[],
  workflows: WorkflowDefinition[],
): TaskTemplate[] {
  const actionMap = new Map(actions.map((action) => [action.id, action]))

  return workflows.flatMap((workflow) => {
    const firstActionRef = [...workflow.actionRefs].sort(
      (left, right) => left.order - right.order,
    )[0]
    const action = firstActionRef ? actionMap.get(firstActionRef.actionId) : null

    return action && getTaskType(action.type)
      ? [createWorkflowTemplate(action, workflow)]
      : []
  })
}

function createWorkflowTemplate(
  action: ActionDefinition,
  workflow: WorkflowDefinition,
): TaskTemplate {
  return {
    id: action.id,
    name: action.name,
    type: getTaskType(action.type) ?? 'crawler',
    config: action.config,
    permissions: workflow.permissions,
    schedule: workflow.schedule,
    state: workflow.state,
    createdAt: action.createdAt,
    updatedAt: action.updatedAt,
  }
}

function getActionType(taskType: TaskTemplate['type']): ActionDefinition['type'] {
  switch (taskType) {
    case 'browser_tab_group':
      return 'browser_action'
    case 'crawler':
      return 'crawler_action'
    case 'discord_bot':
      return 'discord_dry_run_action'
    case 'notion_sync':
      return 'notion_dry_run_action'
    case 'trading_bot':
      return 'trading_dry_run_action'
  }
}

function getTaskType(
  actionType: ActionDefinition['type'],
): TaskTemplate['type'] | null {
  switch (actionType) {
    case 'browser_action':
      return 'browser_tab_group'
    case 'crawler_action':
      return 'crawler'
    case 'discord_dry_run_action':
      return 'discord_bot'
    case 'notion_dry_run_action':
      return 'notion_sync'
    case 'trading_dry_run_action':
      return 'trading_bot'
    case 'tool_action':
      return null
  }
}
