import { Input, Label, ListBox, Select, TextArea } from '@heroui/react'
import { executionOptions, visibilityOptions } from './options'
import type { PolicyFieldsProps } from './types'
import { parseLines } from '../utils/taskFormTransforms'

export function PolicyFields({
  currentDevice,
  form,
  onChange,
  secrets,
}: PolicyFieldsProps) {
  const secretRefIds = parseLines(form.secretRefIds)

  return (
    <fieldset className="settings-fieldset">
      <legend>작업 정책</legend>
      <div className="form-grid">
        <Select selectedKey={form.visibility} onSelectionChange={(key) => onChange({ ...form, visibility: String(key) as typeof form.visibility })}>
          <Label>표시 정책</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {visibilityOptions.map((option) => (
                <ListBox.Item id={option.value} key={option.value} textValue={option.label}>
                  {option.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <Select selectedKey={form.execution} onSelectionChange={(key) => onChange({ ...form, execution: String(key) as typeof form.execution })}>
          <Label>실행 정책</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {executionOptions.map((option) => (
                <ListBox.Item id={option.value} key={option.value} textValue={option.label}>
                  {option.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <label>
          현재 기기 ID
          <Input value={currentDevice.id || '아직 없음'} readOnly />
        </label>
      </div>
      <label>
        허용 기기 ID
        <TextArea
          value={form.allowedDeviceIds}
          onChange={(event) =>
            onChange({ ...form, allowedDeviceIds: event.target.value })
          }
          placeholder="한 줄에 하나씩 입력"
          rows={3}
        />
      </label>
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
    </fieldset>
  )
}
