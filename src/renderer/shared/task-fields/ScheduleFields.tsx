import { Checkbox, Input, Label, ListBox, Select, TextArea } from '@heroui/react'
import { scheduleModeOptions } from './options'
import type { TaskFieldsProps } from './types'

export function ScheduleFields({ form, onChange }: TaskFieldsProps) {
  return (
    <fieldset className="settings-fieldset">
      <legend>예약 실행</legend>
      <Checkbox
        className="inline-check"
        isSelected={form.scheduleEnabled}
        onChange={(scheduleEnabled) => onChange({ ...form, scheduleEnabled })}
      >
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <Checkbox.Content>
          <Label>주기적으로 실행</Label>
        </Checkbox.Content>
      </Checkbox>
      <Select selectedKey={form.scheduleMode} onSelectionChange={(key) => onChange({ ...form, scheduleMode: String(key) as typeof form.scheduleMode })}>
        <Label>예약 방식</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {scheduleModeOptions.map((option) => (
              <ListBox.Item id={option.value} key={option.value} textValue={option.label}>
                {option.label}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
      {form.scheduleMode === 'interval' ? (
        <label>
          실행 간격(분)
          <Input
            max={10080}
            min={1}
            type="number"
            value={form.scheduleIntervalMinutes}
            onChange={(event) =>
              onChange({
                ...form,
                scheduleIntervalMinutes: Number(event.target.value),
              })
            }
          />
        </label>
      ) : null}
      {form.scheduleMode === 'daily' || form.scheduleMode === 'weekly' ? (
        <label>
          실행 시각
          <Input
            type="time"
            value={form.scheduleTimeOfDay}
            onChange={(event) =>
              onChange({ ...form, scheduleTimeOfDay: event.target.value })
            }
          />
        </label>
      ) : null}
      {form.scheduleMode === 'weekly' ? (
        <label>
          실행 요일
          <TextArea
            value={form.scheduleDaysOfWeek}
            onChange={(event) =>
              onChange({ ...form, scheduleDaysOfWeek: event.target.value })
            }
            placeholder="0=일, 1=월 ... 6=토"
            rows={3}
          />
        </label>
      ) : null}
    </fieldset>
  )
}
