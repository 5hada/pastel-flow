import {
  Button,
  Input,
  Label,
  Radio,
  RadioGroup,
  TextField,
} from '@heroui/react'
import type { ToolModuleField } from '../../../../shared/tools'
import {
  CheckboxField,
  FormFieldset,
  SelectField,
  TextAreaField,
  TextInputField,
} from '../../../shared/components/HeroForm'

type ToolInputFieldProps = {
  field: ToolModuleField
  value: unknown
  onChange(value: unknown): void
}

export function ToolInputField({ field, onChange, value }: ToolInputFieldProps) {
  const control = field.ui?.control
  const label = field.ui?.label ?? field.key

  if (control === 'toggle' || control === 'checkbox' || field.type === 'boolean') {
    return (
      <CheckboxField
        className="tool-field toggle-field"
        isSelected={value === true || value === 'true'}
        label={
          <>
            {label}
            {field.required ? ' *' : ''}
          </>
        }
        onChange={onChange}
      />
    )
  }

  if (control === 'select' && field.ui?.options?.length) {
    return (
      <SelectField
        label={
          <>
            {label}
            {field.required ? ' *' : ''}
          </>
        }
        options={field.ui.options.map((option) => ({
          value: String(option.value),
          label: option.label,
        }))}
        selectedKey={String(value ?? '')}
        onChange={onChange}
      />
    )
  }

  if (control === 'radio' && field.ui?.options?.length) {
    return (
      <FormFieldset
        legend={
          <>
            {label}
            {field.required ? ' *' : ''}
          </>
        }
      >
        <RadioGroup
          className="option-swatch-list"
          name={`tool-${field.key}`}
          value={String(value ?? '')}
          onChange={onChange}
        >
          {field.ui.options.map((option) => (
            <Radio
              className="option-swatch"
              key={String(option.value)}
              value={String(option.value)}
            >
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              <Radio.Content>
                <Label>
                  <span style={{ backgroundColor: option.color }}>
                    {option.label}
                  </span>
                </Label>
              </Radio.Content>
            </Radio>
          ))}
        </RadioGroup>
      </FormFieldset>
    )
  }

  if (control === 'color') {
    return (
      <TextField
        aria-label={label}
        value={String(value ?? '')}
        onChange={onChange}
      >
        <Label>
          {label}
          {field.required ? ' *' : ''}
        </Label>
        <span className="color-input-row">
          <Input
            className="color-input"
            type="color"
            value={String(value || '#1f6f68')}
            onChange={(event) => onChange(event.target.value)}
          />
          <Input
            value={String(value ?? '')}
            onChange={(event) => onChange(event.target.value)}
          />
        </span>
      </TextField>
    )
  }

  if (control === 'list' || field.type === 'string[]' || field.type === 'number[]') {
    return <ToolListInputField field={field} value={value} onChange={onChange} />
  }

  if (
    control === 'json' ||
    control === 'textarea' ||
    field.type === 'json' ||
    field.ui?.rows
  ) {
    return (
      <TextAreaField
        description={field.ui?.helpText}
        label={
          <>
            {label}
            {field.required ? ' *' : ''}
          </>
        }
        name={field.key}
        placeholder={field.ui?.placeholder}
        rows={field.ui?.rows}
        value={String(value ?? '')}
        onChange={onChange}
      />
    )
  }

  return (
    <TextInputField
      description={field.ui?.helpText}
      label={
        <>
          {label}
          {field.required ? ' *' : ''}
        </>
      }
      max={field.ui?.max}
      min={field.ui?.min}
      name={field.key}
      placeholder={field.ui?.placeholder}
      step={field.ui?.step}
      type={field.type === 'number' || control === 'number' ? 'number' : 'text'}
      value={String(value ?? '')}
      onChange={onChange}
    />
  )
}

function ToolListInputField({ field, onChange, value }: ToolInputFieldProps) {
  const values = Array.isArray(value)
    ? value.map(String)
    : String(value ?? '').split('\n')
  const label = field.ui?.label ?? field.key

  function updateValue(nextValues: string[]) {
    onChange(nextValues)
  }

  return (
    <FormFieldset
      legend={
        <>
          {label}
          {field.required ? ' *' : ''}
        </>
      }
    >
      <div className="tool-list-editor">
        {values.length === 0 ? (
          <p className="empty-state">항목이 없습니다.</p>
        ) : (
          values.map((item, index) => (
            <div className="tool-list-row" key={`${field.key}-${index}`}>
              <Input
                value={item}
                onChange={(event) =>
                  updateValue(
                    values.map((currentItem, currentIndex) =>
                      currentIndex === index ? event.target.value : currentItem,
                    ),
                  )
                }
              />
              <Button
                className="icon-button"
                isIconOnly
                variant="ghost"
                type="button"
                onClick={() =>
                  updateValue(
                    values.filter(
                      (_item, currentIndex) => currentIndex !== index,
                    ),
                  )
                }
              >
                ×
              </Button>
            </div>
          ))
        )}
      </div>
      <Button
        className="ghost-button"
        variant="ghost"
        type="button"
        onClick={() => updateValue([...values, ''])}
      >
        항목 추가
      </Button>
    </FormFieldset>
  )
}
