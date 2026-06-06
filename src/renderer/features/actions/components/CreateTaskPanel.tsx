import { Button } from '@heroui/react'
import type { FormEvent } from 'react'
import type { CurrentDevice } from '../../../../shared/devices'
import type { BrowserProfilePreset } from '../../../../shared/settings'
import type { LocalSecretMetadata } from '../../../../shared/secrets'
import type { UrlGroup } from '../../../../shared/urlGroups'
import { taskTypeOptions, type BrowserTaskFormState } from '../../../shared/state/taskFormState'
import { getTaskTypeLabel } from '../../../shared/utils/viewLabels'
import { TaskTypeConfigFields, ScheduleFields, PolicyFields } from '../../../shared/task-fields'
import {
  CheckboxField,
  FieldGrid,
  SelectField,
  TextInputField,
} from '../../../shared/components/HeroForm'

export type CreateTaskPanelProps = {
  createForm: BrowserTaskFormState
  currentDevice: CurrentDevice
  isEmbedded?: boolean
  profilePresets?: BrowserProfilePreset[]
  urlGroups?: UrlGroup[]
  secrets: LocalSecretMetadata[]
  onCancel(): void
  onChange(value: BrowserTaskFormState): void
  onSubmit(event: FormEvent<HTMLFormElement>): void
}

export function CreateTaskPanel({
  createForm,
  currentDevice,
  isEmbedded = false,
  onCancel,
  onChange,
  onSubmit,
  profilePresets,
  secrets,
  urlGroups,
}: CreateTaskPanelProps) {
  return (
    <section
      className={isEmbedded ? 'create-task-panel' : 'mode-panel create-task-panel'}
      aria-label="새 브라우저 작업 생성"
    >
      {!isEmbedded ? (
        <div className="panel-heading">
          <div>
            <p className="eyebrow">New action</p>
            <h2>새 Action</h2>
          </div>
          <Button
            className="ghost-button"
            variant="ghost"
            type="button"
            onClick={onCancel}
          >
            닫기
          </Button>
        </div>
      ) : null}
      <form className="task-form" onSubmit={onSubmit}>
        <FieldGrid>
          <SelectField
            label="작업 타입"
            selectedKey={createForm.taskType}
            options={taskTypeOptions.map((taskType) => ({
              value: taskType,
              label: getTaskTypeLabel(taskType),
            }))}
            onChange={(taskType) =>
              onChange({
                ...createForm,
                taskType,
              })
            }
          />
          <TextInputField
            label="이름"
            name="action-name"
            placeholder="예: 리서치 세션"
            value={createForm.name}
            onChange={(name) =>
              onChange({
                ...createForm,
                name,
              })
            }
          />
        </FieldGrid>
        <TaskTypeConfigFields
          form={createForm}
          profilePresets={profilePresets}
          urlGroups={urlGroups}
          onChange={onChange}
        />
        <CheckboxField
          label="단일 Action Workflow로 함께 생성"
          isSelected={createForm.createSingleActionWorkflow}
          onChange={(createSingleActionWorkflow) =>
            onChange({
              ...createForm,
              createSingleActionWorkflow,
            })
          }
        />
        {createForm.createSingleActionWorkflow ? (
          <>
            <ScheduleFields form={createForm} onChange={onChange} />
            <PolicyFields
              currentDevice={currentDevice}
              form={createForm}
              onChange={onChange}
              secrets={secrets}
            />
          </>
        ) : null}
        <div className="form-actions">
          <Button variant="primary" type="submit">Action 생성</Button>
        </div>
      </form>
    </section>
  )
}
