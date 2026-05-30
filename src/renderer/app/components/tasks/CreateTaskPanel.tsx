import type { FormEvent } from 'react'
import type { CurrentDevice } from '../../../../shared/devices'
import type { LocalSecretMetadata } from '../../../../shared/secrets'
import type { TaskType } from '../../../../shared/tasks'
import { taskTypeOptions, type BrowserTaskFormState } from '../../taskFormState'
import { getTaskTypeLabel } from '../../utils/viewLabels'
import { TaskTypeConfigFields, ScheduleFields, PolicyFields } from './TaskFormFields'

export type CreateTaskPanelProps = {
  createForm: BrowserTaskFormState
  currentDevice: CurrentDevice
  secrets: LocalSecretMetadata[]
  onCancel(): void
  onChange(value: BrowserTaskFormState): void
  onSubmit(event: FormEvent<HTMLFormElement>): void
}

export function CreateTaskPanel({
  createForm,
  currentDevice,
  onCancel,
  onChange,
  onSubmit,
  secrets,
}: CreateTaskPanelProps) {
  return (
    <section className="mode-panel" aria-label="새 브라우저 작업 생성">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">New template</p>
          <h2>새 단일 Action Workflow</h2>
        </div>
        <button className="ghost-button" type="button" onClick={onCancel}>
          닫기
        </button>
      </div>
      <form className="task-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            작업 타입
            <select
              value={createForm.taskType}
              onChange={(event) =>
                onChange({
                  ...createForm,
                  taskType: event.target.value as TaskType,
                })
              }
            >
              {taskTypeOptions.map((taskType) => (
                <option key={taskType} value={taskType}>
                  {getTaskTypeLabel(taskType)}
                </option>
              ))}
            </select>
          </label>
          <label>
            이름
            <input
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
        <TaskTypeConfigFields form={createForm} onChange={onChange} />
        <ScheduleFields form={createForm} onChange={onChange} />
        <PolicyFields
          currentDevice={currentDevice}
          form={createForm}
          onChange={onChange}
          secrets={secrets}
        />
        <div className="form-actions">
          <button type="submit">생성</button>
        </div>
      </form>
    </section>
  )
}
