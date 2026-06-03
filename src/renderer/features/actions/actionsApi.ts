import type { ActionDefinition } from "../../../shared/actions"



export type ActionsApi = {
  list(): Promise<ActionDefinition[]>
  create<TConfig = unknown>(
    input: Omit<ActionDefinition<TConfig>, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ActionDefinition<TConfig>>
  update<TConfig = unknown>(
    id: string,
    input: Partial<ActionDefinition<TConfig>>,
  ): Promise<ActionDefinition<TConfig>>
  delete(id: string): Promise<void>
  onChanged(listener: (action: ActionDefinition) => void): () => void
  onDeleted(listener: (actionId: string) => void): () => void
}