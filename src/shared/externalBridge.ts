import type { ActionDefinition, ActionIOField } from './actions'
import type { TodoItem } from './todos'
import type { WorkflowDefinition, WorkflowRunPolicy } from './workflows'

export type ExternalBridgeSchema = {
  schemaVersion: 1
  generatedAt: string
  operations: ExternalBridgeOperations
  workflows: ExternalBridgeWorkflow[]
  todoItem: ExternalBridgeTodoSchema
}

export type ExternalBridgeOperations = {
  workflows: {
    run: {
      actorType: 'external_bridge'
      request: {
        workflowId: 'string'
        actorId: 'string'
      }
    }
  }
  todos: {
    list: {
      request: {
        includeCompleted: 'boolean?'
        includeDeleted: 'boolean?'
      }
    }
    create: {
      request: Pick<
        Record<keyof TodoItem, string>,
        'title' | 'dueAt' | 'category' | 'details'
      >
    }
    update: {
      request: Partial<Record<keyof TodoItem, string>>
    }
  }
}

export type ExternalBridgeWorkflow = {
  id: string
  name: string
  runPolicy?: WorkflowRunPolicy
  actions: ExternalBridgeWorkflowAction[]
}

export type ExternalBridgeWorkflowAction = {
  actionRefId: string
  actionId: string
  order: number
  name: string
  inputSchema?: ActionIOField[]
  outputSchema?: ActionIOField[]
}

export type ExternalBridgeTodoSchema = {
  fields: Array<{
    id: keyof TodoItem
    type: string
    required: boolean
  }>
}

export function createExternalBridgeSchema(input: {
  actions: ActionDefinition[]
  generatedAt?: string
  workflows: WorkflowDefinition[]
}): ExternalBridgeSchema {
  const actionMap = new Map(
    input.actions.map((action) => [action.id, action]),
  )

  return {
    schemaVersion: 1,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    operations: externalBridgeOperations,
    workflows: input.workflows.map((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      runPolicy: workflow.runPolicy,
      actions: workflow.actionRefs
        .filter((actionRef) => actionRef.enabled)
        .sort((left, right) => left.order - right.order)
        .flatMap((actionRef) => {
          const action = actionMap.get(actionRef.actionId)
          if (!action) {
            return []
          }

          return [
            {
              actionRefId: actionRef.id,
              actionId: action.id,
              order: actionRef.order,
              name: action.name,
              inputSchema: action.inputSchema,
              outputSchema: action.outputSchema,
            },
          ]
        }),
    })),
    todoItem: externalBridgeTodoSchema,
  }
}

const externalBridgeOperations: ExternalBridgeOperations = {
  workflows: {
    run: {
      actorType: 'external_bridge',
      request: {
        workflowId: 'string',
        actorId: 'string',
      },
    },
  },
  todos: {
    list: {
      request: {
        includeCompleted: 'boolean?',
        includeDeleted: 'boolean?',
      },
    },
    create: {
      request: {
        title: 'string',
        dueAt: 'string?',
        category: 'string?',
        details: 'string?',
      },
    },
    update: {
      request: {
        title: 'string?',
        dueAt: 'string?',
        category: 'string?',
        details: 'string?',
        completed: 'boolean?',
      },
    },
  },
}

const externalBridgeTodoSchema: ExternalBridgeTodoSchema = {
  fields: [
    { id: 'id', type: 'string', required: true },
    { id: 'title', type: 'string', required: true },
    { id: 'dueAt', type: 'string?', required: false },
    { id: 'category', type: 'string?', required: false },
    { id: 'details', type: 'string?', required: false },
    { id: 'completed', type: 'boolean', required: true },
    { id: 'completedAt', type: 'string?', required: false },
    { id: 'deletedAt', type: 'string?', required: false },
    { id: 'createdAt', type: 'string', required: true },
    { id: 'updatedAt', type: 'string', required: true },
  ],
}
