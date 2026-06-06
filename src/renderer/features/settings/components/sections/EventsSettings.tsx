import { Button } from '@heroui/react'
import type { AppSettings } from '../../../../../shared/settings'
import {
  FormSection,
  TextInputField,
} from '../../../../shared/components/HeroForm'

export type EventsSettingsProps = {
  form: AppSettings
  pruneMessage: string | null
  onChange(value: AppSettings): void
  onPruneWorkflowRunEvents(): Promise<void>
}

export function EventsSettings({
  form,
  pruneMessage,
  onChange,
  onPruneWorkflowRunEvents,
}: EventsSettingsProps) {
  return (
    <FormSection
      ariaLabel="실행 이벤트"
      eyebrow="Run events"
      title="실행 이벤트 보존"
    >
      <TextInputField
        label="실행 이벤트 보존 개수"
        name="workflow-run-event-retention-limit"
        type="number"
        max={2000}
        min={50}
        value={String(form.workflowRunEventRetentionLimit)}
        onChange={(value) =>
          onChange({
            ...form,
            workflowRunEventRetentionLimit: Number(value),
          })
        }
      />
      <TextInputField
        label="Sync export 이벤트 개수"
        name="workflow-run-event-export-limit"
        type="number"
        max={2000}
        min={0}
        value={String(form.workflowRunEventExportLimit)}
        onChange={(value) =>
          onChange({
            ...form,
            workflowRunEventExportLimit: Number(value),
          })
        }
      />
      <div className="form-actions">
        <Button
          className="ghost-button"
          variant="ghost"
          type="button"
          onPress={() => void onPruneWorkflowRunEvents()}
        >
          보존 개수 적용
        </Button>
      </div>
      {pruneMessage ? <p className="panel-success">{pruneMessage}</p> : null}
    </FormSection>
  )
}
