import { useEffect, useState } from 'react'
import type {
  ActionDefinition,
  DevicePolicy,
  WorkflowDefinition,
} from '../../../shared/tasks'
import { getErrorMessage } from '../utils/viewLabels'

export function useActionWorkflowData(
  setErrorMessage: (message: string | null) => void,
) {
  const [actions, setActions] = useState<ActionDefinition[]>([])
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([])
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null)
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(
    null,
  )
  const [runningWorkflowId, setRunningWorkflowId] = useState<string | null>(null)
  const [stoppingWorkflowId, setStoppingWorkflowId] = useState<string | null>(
    null,
  )

  async function loadActionWorkflowData() {
    if (!window.pastelFlow) {
      return
    }

    try {
      const [loadedActions, loadedWorkflows] = await Promise.all([
        window.pastelFlow.actions.list(),
        window.pastelFlow.workflows.list(),
      ])
      setActions(loadedActions)
      setWorkflows(loadedWorkflows)
      setSelectedActionId(
        (currentActionId) =>
          loadedActions.some((action) => action.id === currentActionId)
            ? currentActionId
            : loadedActions[0]?.id ?? null,
      )
      setSelectedWorkflowId(
        (currentWorkflowId) =>
          loadedWorkflows.some((workflow) => workflow.id === currentWorkflowId)
            ? currentWorkflowId
            : loadedWorkflows[0]?.id ?? null,
      )
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function createWorkflow(input: {
    name: string
    permissions: DevicePolicy
  }) {
    if (!window.pastelFlow) {
      return
    }

    try {
      const workflow = await window.pastelFlow.workflows.create({
        name: input.name,
        permissions: input.permissions,
        actionRefs: [],
      })
      setWorkflows((currentWorkflows) => [...currentWorkflows, workflow])
      setSelectedWorkflowId(workflow.id)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function updateWorkflow(
    workflowId: string,
    input: Partial<WorkflowDefinition>,
  ) {
    if (!window.pastelFlow) {
      return
    }

    try {
      const workflow = await window.pastelFlow.workflows.update(
        workflowId,
        input,
      )
      setWorkflows((currentWorkflows) =>
        currentWorkflows.map((currentWorkflow) =>
          currentWorkflow.id === workflow.id ? workflow : currentWorkflow,
        ),
      )
      setSelectedWorkflowId(workflow.id)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function deleteWorkflow(workflowId: string) {
    if (!window.pastelFlow) {
      return
    }

    try {
      setErrorMessage(null)
      await window.pastelFlow.workflows.delete(workflowId)
      setWorkflows((currentWorkflows) => {
        const nextWorkflows = currentWorkflows.filter(
          (workflow) => workflow.id !== workflowId,
        )
        setSelectedWorkflowId((currentWorkflowId) =>
          currentWorkflowId === workflowId
            ? nextWorkflows[0]?.id ?? null
            : currentWorkflowId,
        )
        return nextWorkflows
      })
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  useEffect(() => {
    if (!window.pastelFlow) {
      return undefined
    }

    const unsubscribeActionChanged = window.pastelFlow.actions.onChanged(
      (updatedAction) => {
        setActions((currentActions) => {
          if (
            !currentActions.some((action) => action.id === updatedAction.id)
          ) {
            return [...currentActions, updatedAction]
          }

          return currentActions.map((action) =>
            action.id === updatedAction.id ? updatedAction : action,
          )
        })
      },
    )
    const unsubscribeActionDeleted = window.pastelFlow.actions.onDeleted(
      (actionId) => {
        setActions((currentActions) =>
          currentActions.filter((action) => action.id !== actionId),
        )
      },
    )
    const unsubscribeWorkflowChanged = window.pastelFlow.workflows.onChanged(
      (updatedWorkflow) => {
        setWorkflows((currentWorkflows) => {
          if (
            !currentWorkflows.some(
              (workflow) => workflow.id === updatedWorkflow.id,
            )
          ) {
            return [...currentWorkflows, updatedWorkflow]
          }

          return currentWorkflows.map((workflow) =>
            workflow.id === updatedWorkflow.id ? updatedWorkflow : workflow,
          )
        })
      },
    )
    const unsubscribeWorkflowDeleted = window.pastelFlow.workflows.onDeleted(
      (workflowId) => {
        setWorkflows((currentWorkflows) =>
          currentWorkflows.filter((workflow) => workflow.id !== workflowId),
        )
      },
    )

    return () => {
      unsubscribeActionChanged()
      unsubscribeActionDeleted()
      unsubscribeWorkflowChanged()
      unsubscribeWorkflowDeleted()
    }
  }, [])

  async function updateAction(
    actionId: string,
    input: Partial<ActionDefinition>,
  ) {
    if (!window.pastelFlow) {
      return
    }

    try {
      const action = await window.pastelFlow.actions.update(actionId, input)
      setActions((currentActions) =>
        currentActions.map((currentAction) =>
          currentAction.id === action.id ? action : currentAction,
        ),
      )
      setSelectedActionId(action.id)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function deleteAction(actionId: string) {
    if (!window.pastelFlow) {
      return
    }

    try {
      await window.pastelFlow.actions.delete(actionId)
      setActions((currentActions) => {
        const nextActions = currentActions.filter(
          (action) => action.id !== actionId,
        )
        setSelectedActionId((currentActionId) =>
          currentActionId === actionId
            ? nextActions[0]?.id ?? null
            : currentActionId,
        )
        return nextActions
      })
      await loadActionWorkflowData()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function runWorkflow(workflowId: string) {
    if (!window.pastelFlow) {
      return
    }

    try {
      setRunningWorkflowId(workflowId)
      setSelectedWorkflowId(workflowId)
      setErrorMessage(null)
      const result = await window.pastelFlow.workflows.run(workflowId)
      setWorkflows((currentWorkflows) =>
        currentWorkflows.map((workflow) =>
          workflow.id === result.id ? result : workflow,
        ),
      )
      if (result.state.status === 'failed') {
        setErrorMessage(
          result.state.lastError ?? 'Workflow 실행에 실패했습니다.',
        )
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setRunningWorkflowId(null)
    }
  }

  async function stopWorkflow(workflowId: string) {
    if (!window.pastelFlow) {
      return
    }

    try {
      setStoppingWorkflowId(workflowId)
      setSelectedWorkflowId(workflowId)
      setErrorMessage(null)
      const result = await window.pastelFlow.workflows.stop(workflowId)
      setWorkflows((currentWorkflows) =>
        currentWorkflows.map((workflow) =>
          workflow.id === result.id ? result : workflow,
        ),
      )
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setStoppingWorkflowId(null)
    }
  }

  return {
    actions,
    runningWorkflowId,
    workflows,
    selectedActionId,
    selectedWorkflowId,
    stoppingWorkflowId,
    createWorkflow,
    deleteWorkflow,
    deleteAction,
    loadActionWorkflowData,
    runWorkflow,
    setSelectedActionId,
    setSelectedWorkflowId,
    stopWorkflow,
    updateWorkflow,
    updateAction,
  }
}
