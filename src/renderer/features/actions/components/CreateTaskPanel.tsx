import { Button, Checkbox, Input, Label, ListBox, Select } from '@heroui/react'
import type { FormEvent } from 'react'
import type { CurrentDevice } from '../../../../shared/devices'
import type { BrowserProfilePreset } from '../../../../shared/settings'
import type { LocalSecretMetadata } from '../../../../shared/secrets'
import { taskTypeOptions, type BrowserTaskFormState } from '../../../shared/state/taskFormState'
import { getTaskTypeLabel } from '../../../shared/utils/viewLabels'
import { TaskTypeConfigFields, ScheduleFields, PolicyFields } from '../../../shared/task-fields'

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
            variant="ghost"
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
            <Select
              selectedKey={createForm.taskType}
              onSelectionChange={(key) =>
                onChange({
                  ...createForm,
                  taskType: String(key) as typeof createForm.taskType,
                })
              }
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {taskTypeOptions.map((taskType) => (
                    <ListBox.Item
                      id={taskType}
                      key={taskType}
                      textValue={getTaskTypeLabel(taskType)}
                    >
                      {getTaskTypeLabel(taskType)}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
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
        <Checkbox
          className="inline-check"
          isSelected={createForm.createSingleActionWorkflow}
          onChange={(createSingleActionWorkflow) =>
            onChange({
              ...createForm,
              createSingleActionWorkflow,
            })
          }
        >
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Content>
            <Label>단일 Action Workflow로 함께 생성</Label>
          </Checkbox.Content>
        </Checkbox>
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
