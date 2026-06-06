import { Checkbox, Input, Label, TextArea, TextField } from '@heroui/react'
import type {
  WorkflowRunActorType,
} from '../../../../shared/runStatus'
import type { WorkflowDefinition } from '../../../../shared/workflows'

type WorkflowRunPolicyEditorProps = {
  isLocked: boolean
  onUpdateRunPolicy(runPolicy: WorkflowDefinition['runPolicy']): void
  workflow: WorkflowDefinition
}

const workflowRunActorOptions: WorkflowRunActorType[] = [
  'user',
  'schedule',
  'browser_extension',
  'external_bridge',
]

const workflowRunActorLabels: Record<WorkflowRunActorType, string> = {
  user: 'User',
  schedule: 'Schedule',
  browser_extension: 'Browser extension',
  external_bridge: 'External bridge',
}

export function WorkflowRunPolicyEditor({
  isLocked,
  onUpdateRunPolicy,
  workflow,
}: WorkflowRunPolicyEditorProps) {
  const runPolicy = workflow.runPolicy
  const selectedActors = runPolicy?.allowedActors ?? workflowRunActorOptions
  const externalClientIdsText =
    runPolicy?.allowedExternalClientIds?.join('\n') ?? ''

  function updateRunPolicy(
    input: Partial<NonNullable<WorkflowDefinition['runPolicy']>>,
  ) {
    onUpdateRunPolicy(
      compactWorkflowRunPolicy({
        ...runPolicy,
        ...input,
      }),
    )
  }

  function toggleActor(actorType: WorkflowRunActorType) {
    const actorSet = new Set(selectedActors)
    if (actorSet.has(actorType)) {
      if (actorSet.size === 1) {
        return
      }
      actorSet.delete(actorType)
    } else {
      actorSet.add(actorType)
    }

    updateRunPolicy({
      allowedActors: [...actorSet],
    })
  }

  return (
    <div className="workflow-run-policy task-form">
      <div>
        <strong>Run policy</strong>
        <p className="muted-text">Workflow 실행 요청을 허용할 주체와 빈도를 제한합니다.</p>
      </div>
      <div className="workflow-run-policy-actors">
        {workflowRunActorOptions.map((actorType) => (
          <Checkbox
            className="inline-check"
            isDisabled={isLocked}
            isSelected={selectedActors.includes(actorType)}
            key={actorType}
            onChange={() => toggleActor(actorType)}
          >
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Content>
              <Label>{workflowRunActorLabels[actorType]}</Label>
            </Checkbox.Content>
          </Checkbox>
        ))}
      </div>
      <div className="form-grid">
        <Checkbox
          className="inline-check"
          isDisabled={isLocked}
          isSelected={runPolicy?.allowSchedule !== false}
          onChange={(isSelected) =>
            updateRunPolicy({
              allowSchedule: isSelected ? undefined : false,
            })
          }
        >
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Content>
            <Label>Schedule 실행 허용</Label>
          </Checkbox.Content>
        </Checkbox>
        <Checkbox
          className="inline-check"
          isDisabled={isLocked}
          isSelected={runPolicy?.requiresConfirmation === true}
          onChange={(isSelected) =>
            updateRunPolicy({
              requiresConfirmation: isSelected ? true : undefined,
            })
          }
        >
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Content>
            <Label>외부 실행 전 확인 필요</Label>
          </Checkbox.Content>
        </Checkbox>
        <TextField
          isDisabled={isLocked}
          name="workflow-max-runs-per-hour"
          type="number"
          value={String(runPolicy?.maxRunsPerHour ?? '')}
          onChange={(value) =>
            updateRunPolicy({
              maxRunsPerHour: value ? Number(value) : undefined,
            })
          }
        >
          <Label>시간당 최대 실행</Label>
          <Input min={0} />
        </TextField>
        <TextField
          isDisabled={isLocked}
          name="workflow-external-client-ids"
          value={externalClientIdsText}
          onChange={(value) =>
            updateRunPolicy({
              allowedExternalClientIds: splitExternalClientIds(value),
            })
          }
        >
          <Label>외부 client IDs</Label>
          <TextArea placeholder="client id per line" />
        </TextField>
      </div>
    </div>
  )
}

function compactWorkflowRunPolicy(
  runPolicy: WorkflowDefinition['runPolicy'],
): WorkflowDefinition['runPolicy'] {
  if (!runPolicy) {
    return undefined
  }

  const allowedActors =
    runPolicy.allowedActors &&
    runPolicy.allowedActors.length > 0 &&
    runPolicy.allowedActors.length < workflowRunActorOptions.length
      ? runPolicy.allowedActors
      : undefined
  const allowedExternalClientIds = runPolicy.allowedExternalClientIds?.filter(
    Boolean,
  )
  const maxRunsPerHour =
    typeof runPolicy.maxRunsPerHour === 'number' &&
    Number.isFinite(runPolicy.maxRunsPerHour) &&
    runPolicy.maxRunsPerHour > 0
      ? Math.floor(runPolicy.maxRunsPerHour)
      : undefined
  const compacted = {
    allowedActors,
    allowedExternalClientIds:
      allowedExternalClientIds && allowedExternalClientIds.length > 0
        ? allowedExternalClientIds
        : undefined,
    requiresConfirmation:
      runPolicy.requiresConfirmation === true ? true : undefined,
    maxRunsPerHour,
    allowSchedule: runPolicy.allowSchedule === false ? false : undefined,
  }

  return Object.values(compacted).some((value) => value !== undefined)
    ? compacted
    : undefined
}

function splitExternalClientIds(value: string): string[] | undefined {
  const clientIds = value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)

  return clientIds.length > 0 ? [...new Set(clientIds)] : undefined
}
