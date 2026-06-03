import { Input } from '@heroui/react'
import type { FormEvent } from 'react'
import type { CurrentDevice } from '../../../../shared/devices'
import type { BrowserProfilePreset } from '../../../../shared/settings'
import type { LocalSecretMetadata } from '../../../../shared/secrets'
import { taskTypeOptions, type BrowserTaskFormState } from '../../../shared/state/taskFormState'
import { getTaskTypeLabel } from '../../../shared/utils/viewLabels'
import { Button } from '../../../shared/components/button'
import { SimpleSelect } from '../../../shared/components/SimpleSelect'
import { TaskTypeConfigFields, ScheduleFields, PolicyFields } from '../../../shared/components/TaskFormFields'

export type CreateTaskPanelProps = {
  createForm: BrowserTaskFormState
  currentDevice: CurrentDevice
  isEmbedded?: boolean
  profilePresets?: BrowserProfilePreset[]
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
            intent="ghost"
            type="button"
            onClick={onCancel}
          >
            닫기
          </Button>
        </div>
      ) : null}
      <form className="task-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            작업 타입
            <SimpleSelect
              aria-label="작업 타입"
              options={taskTypeOptions.map((taskType) => ({
                label: getTaskTypeLabel(taskType),
                value: taskType,
              }))}
              value={createForm.taskType}
              onChange={(taskType) =>
                onChange({
                  ...createForm,
                  taskType,
                })
              }
            />
          </label>
          <label>
            이름
            <Input
              value={createForm.name}
              onChange={(event) =>
                onChange({
                  ...createForm,
                  name: event.target.value,
                })
              }
              placeholder="예: 리서치 세션"
            />
          </label>
        </div>
        <TaskTypeConfigFields
          form={createForm}
          profilePresets={profilePresets}
          onChange={onChange}
        />
        <label className="inline-check">
          <input
            checked={createForm.createSingleActionWorkflow}
            type="checkbox"
            onChange={(event) =>
              onChange({
                ...createForm,
                createSingleActionWorkflow: event.target.checked,
              })
            }
          />
          단일 Action Workflow로 함께 생성
        </label>
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
          <Button intent="primary" type="submit">Action 생성</Button>
        </div>
      </form>
    </section>
  )
}
