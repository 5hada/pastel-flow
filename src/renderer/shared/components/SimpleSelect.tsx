import { ListBox, Select } from '@heroui/react'

export type SimpleSelectOption<TValue extends string> = {
  label: string
  value: TValue
}

export type SimpleSelectProps<TValue extends string> = {
  'aria-label'?: string
  options: SimpleSelectOption<TValue>[]
  value: TValue
  onChange(value: TValue): void
}

export function SimpleSelect<TValue extends string>({
  'aria-label': ariaLabel,
  onChange,
  options,
  value,
}: SimpleSelectProps<TValue>) {
  const selectedOption = options.find((option) => option.value === value)

  return (
    <Select
      aria-label={ariaLabel}
      selectedKey={value}
      onSelectionChange={(key) => onChange(String(key) as TValue)}
    >
      <Select.Trigger>
        <Select.Value>{selectedOption?.label ?? '선택'}</Select.Value>
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((option) => (
            <ListBox.Item id={option.value} key={option.value} textValue={option.label}>
              {option.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}
