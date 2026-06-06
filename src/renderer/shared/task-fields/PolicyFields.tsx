import { Label, ListBox, Select } from '@heroui/react'
import { executionOptions, visibilityOptions } from './options'
import type { PolicyFieldsProps } from './types'
import { parseLines } from '../utils/taskFormTransforms'
import {
  FieldGrid,
  FormFieldset,
  SelectField,
  TextAreaField,
  TextInputField,
} from '../components/HeroForm'

export function PolicyFields({
  currentDevice,
  form,
  onChange,
  secrets,
}: PolicyFieldsProps) {
  const secretRefIds = parseLines(form.secretRefIds)

  return (
    <FormFieldset legend="작업 정책">
      <FieldGrid>
        <SelectField
          label="표시 정책"
          selectedKey={form.visibility}
          options={visibilityOptions.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          onChange={(visibility) => onChange({ ...form, visibility })}
        />
        <SelectField
          label="실행 정책"
          selectedKey={form.execution}
          options={executionOptions.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          onChange={(execution) => onChange({ ...form, execution })}
        />
        <TextInputField
          label="현재 기기 ID"
          name="current-device-id"
          readOnly
          value={currentDevice.id || '아직 없음'}
        />
      </FieldGrid>
      <TextAreaField
        label="허용 기기 ID"
        name="allowed-device-ids"
        placeholder="한 줄에 하나씩 입력"
        rows={3}
        value={form.allowedDeviceIds}
        onChange={(allowedDeviceIds) =>
          onChange({ ...form, allowedDeviceIds })
        }
      />
      <Select
        selectionMode="multiple"
        value={secretRefIds}
        onChange={(keys) =>
          onChange({
            ...form,
            secretRefIds: Array.from(keys).map(String).join('\n'),
          })
        }
      >
        <Label>Secret 참조</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox selectionMode="multiple">
            {secrets.map((secret) => (
              <ListBox.Item id={secret.id} key={secret.id} textValue={secret.name}>
                {secret.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </FormFieldset>
  )
}
