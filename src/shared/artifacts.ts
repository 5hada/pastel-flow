export type WorkflowArtifactType =
  | 'json'
  | 'text'
  | 'file'
  | 'image'
  | 'binary'

export type WorkflowArtifact = {
  id: string
  runId: string
  workflowId: string
  actionRunId?: string
  type: WorkflowArtifactType
  path: string
  size?: number
  summary?: string
  createdAt: string
}

export type WorkflowArtifactRef = {
  artifactId: string
  type: WorkflowArtifactType
  summary?: string
  size?: number
}

export type CreateWorkflowArtifactInput = {
  runId: string
  workflowId: string
  actionRunId?: string
  type: WorkflowArtifactType
  path: string
  size?: number
  summary?: string
}
