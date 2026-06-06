import { scheduleModeOptions } from './options'
import type { TaskFieldsProps } from './types'
import {
  CheckboxField,
  FormFieldset,
  SelectField,
  TextAreaField,
  TextInputField,
} from '../components/HeroForm'

export function ScheduleFields({ form, onChange }: TaskFieldsProps) {
  return (
    <FormFieldset legend="예약 실행">
      <CheckboxField
        label="주기적으로 실행"
        isSelected={form.scheduleEnabled}
        onChange={(scheduleEnabled) => onChange({ ...form, scheduleEnabled })}
      />
      <SelectField
        label="예약 방식"
        selectedKey={form.scheduleMode}
        options={scheduleModeOptions.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
        onChange={(scheduleMode) => onChange({ ...form, scheduleMode })}
      />
      {form.scheduleMode === 'interval' ? (
        <TextInputField
          label="실행 간격(분)"
          max={10080}
          min={1}
          name="schedule-interval-minutes"
          type="number"
          value={String(form.scheduleIntervalMinutes)}
          onChange={(value) =>
            onChange({
              ...form,
              scheduleIntervalMinutes: Number(value),
            })
          }
        />
      ) : null}
      {form.scheduleMode === 'daily' || form.scheduleMode === 'weekly' ? (
        <TextInputField
          label="실행 시각"
          name="schedule-time-of-day"
          type="time"
          value={form.scheduleTimeOfDay}
          onChange={(scheduleTimeOfDay) =>
            onChange({ ...form, scheduleTimeOfDay })
          }
        />
      ) : null}
      {form.scheduleMode === 'weekly' ? (
        <TextAreaField
          label="실행 요일"
          name="schedule-days-of-week"
          placeholder="0=일, 1=월 ... 6=토"
          rows={3}
          value={form.scheduleDaysOfWeek}
          onChange={(scheduleDaysOfWeek) =>
            onChange({ ...form, scheduleDaysOfWeek })
          }
        />
      ) : null}
    </FormFieldset>
  )
}
