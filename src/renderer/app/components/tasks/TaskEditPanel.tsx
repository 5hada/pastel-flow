import type { FormEvent } from 'react'
import type { CurrentDevice } from '../../../../shared/devices'
import type { BrowserProfilePreset } from '../../../../shared/settings'
import type { LocalSecretMetadata } from '../../../../shared/secrets'
import type { BrowserTaskFormState } from '../../taskFormState'
import { PolicyFields, ScheduleFields, TaskTypeConfigFields } from './TaskFormFields'

export type TaskEditPanelProps = {
  currentDevice: CurrentDevice
  editForm: BrowserTaskFormState
  profilePresets?: BrowserProfilePreset[]
  secrets: LocalSecretMetadata[]
  onChange(value: BrowserTaskFormState): void
  onSubmit(event: FormEvent<HTMLFormElement>): void
}

export function TaskEditPanel({
  currentDevice,
  editForm,
  onChange,
  onSubmit,
  profilePresets,
  secrets,
}: TaskEditPanelProps) {
  return (
    <>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Edit template</p>
          <h2>작업 수정</h2>
        </div>
      </div>
      <form className="task-form" onSubmit={onSubmit}>
        <label>
          이름
          <input
            value={editForm.name}
            onChange={(event) =>
              onChange({
                ...editForm,
                name: event.target.value,
              })
            }
          />
        </label>
        <TaskTypeConfigFields
          form={editForm}
          profilePresets={profilePresets}
          onChange={onChange}
        />
        <ScheduleFields form={editForm} onChange={onChange} />
        <PolicyFields
          currentDevice={currentDevice}
          form={editForm}
          onChange={onChange}
          secrets={secrets}
        />
        <div className="form-actions">
          <button type="submit">저장</button>
        </div>
      </form>
    </>
  )
}
