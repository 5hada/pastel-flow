import type { WorkflowDefinition } from "../../../shared/workflows"
import type { WorkflowArtifact } from "../../../shared/artifacts"
import type { UrlGroupItemRun } from "../../../shared/urlGroups"
import type {
  ActionRun,
  WorkflowRun,
  WorkflowRunEvent,
} from "../../../shared/runStatus"


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
  listRuns(workflowId?: string): Promise<WorkflowRun[]>
  listActionRuns(runId: string): Promise<ActionRun[]>
  listUrlItemRuns(input: ListUrlGroupItemRunsInput): Promise<UrlGroupItemRun[]>
  listArtifacts(input: ListWorkflowArtifactsInput): Promise<WorkflowArtifact[]>
  listEvents(workflowId?: string): Promise<WorkflowRunEvent[]>
  pruneEvents(): Promise<number>
  onChanged(listener: (workflow: WorkflowDefinition) => void): () => void
  onDeleted(listener: (workflowId: string) => void): () => void
}

export type ListWorkflowArtifactsInput = {
  runId?: string
  actionRunId?: string
  workflowId?: string
  limit?: number
}

export type ListUrlGroupItemRunsInput = {
  runId?: string
  actionRunId?: string
  workflowId?: string
  limit?: number
}
