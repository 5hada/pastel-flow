import type { WorkflowDefinition } from "../../../shared/workflows"
import type { TaskRunEvent } from "../../../shared/taskRunEvents"


export type WorkflowsApi = {
  list(): Promise<WorkflowDefinition[]>
  create(input: Partial<WorkflowDefinition>): Promise<WorkflowDefinition>
  update(
    id: string,
    input: Partial<WorkflowDefinition>,
  ): Promise<WorkflowDefinition>
  delete(id: string): Promise<void>
  run(id: string): Promise<WorkflowDefinition>
  stop(id: string): Promise<WorkflowDefinition>
  listEvents(workflowId?: string): Promise<TaskRunEvent[]>
  pruneEvents(): Promise<number>
  onChanged(listener: (workflow: WorkflowDefinition) => void): () => void
  onDeleted(listener: (workflowId: string) => void): () => void
}
