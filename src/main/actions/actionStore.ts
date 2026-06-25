import { randomUUID } from 'node:crypto'
import type {
  ActionDefinition,
  CreateActionInput,
  UpdateActionInput,
} from '../../shared/actions'
import type { TaskDefinitionFileStore } from '../tasks/taskDefinitionFile'

export type ActionStoreOptions = {
  taskFileStore: TaskDefinitionFileStore
}

export type ActionStore = {
  getAction(id: string): Promise<ActionDefinition>
  listActions(): Promise<ActionDefinition[]>
  createAction(input: CreateActionInput): Promise<ActionDefinition>
  updateAction(id: string, input: UpdateActionInput): Promise<ActionDefinition>
  deleteAction(id: string): Promise<void>
  replaceActions(actions: ActionDefinition[]): Promise<void>
}

export function createActionStore({
  taskFileStore,
}: ActionStoreOptions): ActionStore {
  return {
    async getAction(id) {
      const taskFile = await taskFileStore.read()
      const action = taskFile.actions.find((currentAction) => currentAction.id === id)

      if (!action) {
        throw new Error(`Action not found: ${id}`)
      }

      return action
    },

    async listActions() {
      const taskFile = await taskFileStore.read()
      return taskFile.actions
    },

    async createAction(input) {
      const now = new Date().toISOString()
      const action: ActionDefinition = {
        id: randomUUID(),
        name: normalizeActionName(input.name),
        type: input.type,
        capability: input.capability,
        version: input.version,
        config: input.config,
        secretRefs: input.secretRefs,
        inputSchema: input.inputSchema,
        outputSchema: input.outputSchema,
        createdAt: now,
        updatedAt: now,
      }
      await taskFileStore.update((taskFile) => ({
        nextValue: {
          ...taskFile,
          actions: [...taskFile.actions, action],
        },
        result: undefined,
      }))

      return action
    },

    async updateAction(id, input) {
      return taskFileStore.update((taskFile) => {
        const actionIndex = taskFile.actions.findIndex(
          (action) => action.id === id,
        )

        if (actionIndex === -1) {
          throw new Error(`Action not found: ${id}`)
        }

        const currentAction = taskFile.actions[actionIndex]
        const updatedAction: ActionDefinition = {
          ...currentAction,
          ...input,
          name:
            input.name === undefined
              ? currentAction.name
              : normalizeActionName(input.name),
          updatedAt: new Date().toISOString(),
        }
        const actions = [...taskFile.actions]
        actions[actionIndex] = updatedAction

        return {
          nextValue: {
            ...taskFile,
            actions,
          },
          result: updatedAction,
        }
      })
    },

    async deleteAction(id) {
      await taskFileStore.update((taskFile) => {
        const action = taskFile.actions.find((currentAction) => currentAction.id === id)

        if (!action) {
          throw new Error(`Action not found: ${id}`)
        }

        const now = new Date().toISOString()

        return {
          nextValue: {
            actions: taskFile.actions.filter(
              (currentAction) => currentAction.id !== id,
            ),
            workflows: taskFile.workflows.map((workflow) => {
              const actionRefs = workflow.actionRefs.filter(
                (actionRef) => actionRef.actionId !== id,
              )

              if (actionRefs.length === workflow.actionRefs.length) {
                return workflow
              }

              return {
                ...workflow,
                actionRefs,
                updatedAt: now,
              }
            }),
          },
          result: undefined,
        }
      })
    },

    async replaceActions(actions) {
      await taskFileStore.update((taskFile) => ({
        nextValue: {
          ...taskFile,
          actions,
        },
        result: undefined,
      }))
    },
  }
}

function normalizeActionName(name: unknown): string {
  const trimmedName = typeof name === 'string' ? name.trim() : ''

  if (!trimmedName) {
    throw new Error('Action 이름이 필요합니다.')
  }

  return trimmedName
}
