import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type {
  WorkflowArtifactRef,
  WorkflowArtifactType,
} from '../../../shared/artifacts'
import type { WorkflowArtifactStore } from '../store/workflowArtifactStore'

const largeStringThresholdBytes = 16_384
const largeJsonThresholdBytes = 32_768

export type WorkflowArtifactWriter = {
  saveOutputArtifacts(input: SaveOutputArtifactsInput): Promise<WorkflowArtifactRef[]>
}

export type SaveOutputArtifactsInput = {
  runId: string
  workflowId: string
  actionRunId: string
  output: Record<string, unknown>
}

export type WorkflowArtifactWriterOptions = {
  artifactStore: WorkflowArtifactStore
  dataDir: string
}

export function createWorkflowArtifactWriter({
  artifactStore,
  dataDir,
}: WorkflowArtifactWriterOptions): WorkflowArtifactWriter {
  return {
    async saveOutputArtifacts(input) {
      const artifacts: WorkflowArtifactRef[] = []

      for (const [key, value] of Object.entries(input.output)) {
        const artifactPayload = createArtifactPayload(key, value)
        if (!artifactPayload) {
          continue
        }

        const artifactDirectory = path.join(
          dataDir,
          'runs',
          input.runId,
          'artifacts',
        )
        const artifactPath = path.join(
          artifactDirectory,
          `${input.actionRunId}-${safeFileName(key)}.${artifactPayload.extension}`,
        )
        await mkdir(artifactDirectory, { recursive: true })
        await writeFile(artifactPath, artifactPayload.content, 'utf8')

        const artifact = await artifactStore.createArtifact({
          runId: input.runId,
          workflowId: input.workflowId,
          actionRunId: input.actionRunId,
          type: artifactPayload.type,
          path: artifactPath,
          size: Buffer.byteLength(artifactPayload.content, 'utf8'),
          summary: artifactPayload.summary,
        })

        artifacts.push({
          artifactId: artifact.id,
          type: artifact.type,
          size: artifact.size,
          summary: artifact.summary,
        })
      }

      return artifacts
    },
  }
}

function createArtifactPayload(
  key: string,
  value: unknown,
):
  | {
      content: string
      extension: 'json' | 'txt'
      summary: string
      type: WorkflowArtifactType
    }
  | undefined {
  if (typeof value === 'string') {
    const size = Buffer.byteLength(value, 'utf8')
    if (size < largeStringThresholdBytes) {
      return undefined
    }

    return {
      content: value,
      extension: 'txt',
      summary: `${key}: ${size} byte text output`,
      type: 'text',
    }
  }

  if (!value || typeof value !== 'object') {
    return undefined
  }

  const content = `${JSON.stringify(value, null, 2)}\n`
  const size = Buffer.byteLength(content, 'utf8')
  if (size < largeJsonThresholdBytes) {
    return undefined
  }

  return {
    content,
    extension: 'json',
    summary: `${key}: ${size} byte JSON output`,
    type: 'json',
  }
}

function safeFileName(value: string): string {
  const normalizedValue = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalizedValue || 'output'
}
