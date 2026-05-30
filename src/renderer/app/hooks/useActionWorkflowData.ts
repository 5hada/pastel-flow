import { useState } from 'react'
import type { ActionDefinition, WorkflowDefinition } from '../../../shared/tasks'
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
        (currentActionId) => currentActionId ?? loadedActions[0]?.id ?? null,
      )
      setSelectedWorkflowId(
        (currentWorkflowId) =>
          currentWorkflowId ?? loadedWorkflows[0]?.id ?? null,
      )
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  return {
    actions,
    workflows,
    selectedActionId,
    selectedWorkflowId,
    loadActionWorkflowData,
    setSelectedActionId,
    setSelectedWorkflowId,
  }
}
