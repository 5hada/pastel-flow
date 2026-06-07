import {
  AlertDialog,
  Button,
  Checkbox,
  CloseButton,
  Description,
  Fieldset,
  Input,
  Label,
  ListBox,
  PressEvent,
  Select,
  TextArea,
  TextField,
} from '@heroui/react'
import type { ReactNode } from 'react'

export type SelectFieldOption<TValue extends string> = {
  value: TValue
  label: ReactNode
  textValue?: string
  isDisabled?: boolean
}

export function AlertDialogButton({
  cancelText,
  confirmText,
  buttonText,
  dialogDescription,
  dialogHead,
  isDisabled,
  status,
  variant,
  onPress,
}: {
  buttonText?: string
  cancelText?: string
  confirmText?: string
  dialogDescription?: string
  dialogHead?: string
  isDisabled?: boolean
  status?:  "accent" | "success" | "warning" | "danger" 
  variant?:'primary' | 'secondary' | 'tertiary' | 'outline' | 'ghost' | 'danger'
  onPress?(event: PressEvent): void
}) {
  return(
    <AlertDialog>
      <Button variant={(variant) ? variant : 'danger'} isDisabled={isDisabled}>{(buttonText) ? buttonText : '삭제'}</Button>
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[400px]">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status={status} />
              <AlertDialog.Heading>{(dialogHead) ? dialogHead : '정말로 삭제하시겠습니까?'}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>
                {(dialogDescription) ? dialogDescription : '이 작업은 되돌릴 수 없습니다.'}
              </p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary">
                {(cancelText) ? cancelText : '취소'}
              </Button>
              <Button
                slot="close"
                variant={(status === "danger" || status === undefined) ? "danger" : "primary"}
                onPress={onPress}
              >
                {(confirmText) ? confirmText : '삭제'}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  )
}

export function XButton({
  isDisabled,
  onPress,
}: {
  isDisabled?: boolean
  onPress?(event: PressEvent): void
}) {
  return(
    <CloseButton
      className='w-8 h-8 rounded-full'
      isDisabled={isDisabled}
      onPress={onPress}
    />
  )
}

export function FormSection({
  children,
  eyebrow,
  title,
  action,
  ariaLabel,
  className = '',
}: {
  children: ReactNode
  eyebrow?: string
  title?: string
  action?: ReactNode
  ariaLabel: string
  className?: string
}) {
  return (
    <section className={`settings-subsection grid gap-3 p-4 ${className}`} aria-label={ariaLabel}>
      {title ? (
        <div className="section-heading compact-heading">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h3>{title}</h3>
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  )
}

export function FieldGrid({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`form-grid grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-3 ${className}`}
    >
      {children}
    </div>
  )
}

export function FormFieldset({
  children,
  legend,
  className = '',
}: {
  children: ReactNode
  legend: ReactNode
  className?: string
}) {
  return (
    <Fieldset className={`settings-fieldset grid gap-3 ${className}`}>
      <Fieldset.Legend>{legend}</Fieldset.Legend>
      {children}
    </Fieldset>
  )
}

export function TextInputField({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = 'text',
  isDisabled,
  readOnly,
  min,
  max,
  step,
  description,
}: {
  label: ReactNode
  name: string
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  type?: 'email' | 'number' | 'password' | 'tel' | 'text' | 'time' | 'url'
  isDisabled?: boolean
  readOnly?: boolean
  min?: number
  max?: number
  step?: number
  description?: ReactNode
}) {
  return (
    <TextField
      isDisabled={isDisabled}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
    >
      <Label>{label}</Label>
      <Input
        max={max}
        min={min}
        placeholder={placeholder}
        readOnly={readOnly}
        step={step}
      />
      {description ? <Description>{description}</Description> : null}
    </TextField>
  )
}

export function TextAreaField({
  label,
  name,
  value,
  onChange,
  placeholder,
  rows,
  className,
  isDisabled,
  description,
}: {
  label: ReactNode
  name: string
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  rows?: number
  className?: string
  isDisabled?: boolean
  description?: ReactNode
}) {
  return (
    <TextField
      className={className}
      isDisabled={isDisabled}
      name={name}
      value={value}
      onChange={onChange}
    >
      <Label>{label}</Label>
      <TextArea placeholder={placeholder} rows={rows} />
      {description ? <small className="field-help">{description}</small> : null}
    </TextField>
  )
}

export function SelectField<TValue extends string>({
  label,
  selectedKey,
  options,
  onChange,
  isDisabled,
}: {
  label: ReactNode
  selectedKey: TValue
  options: readonly SelectFieldOption<TValue>[]
  onChange(value: TValue): void
  isDisabled?: boolean
}) {
  return (
    <Select
      isDisabled={isDisabled}
      selectedKey={selectedKey}
      onSelectionChange={(key) => onChange(String(key) as TValue)}
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((option) => (
            <ListBox.Item
              id={option.value}
              isDisabled={option.isDisabled}
              key={option.value}
              textValue={option.textValue ?? String(option.label)}
            >
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}

export function CheckboxField({
  label,
  isSelected,
  onChange,
  isDisabled,
  className = '',
}: {
  label: ReactNode
  isSelected: boolean
  onChange(value: boolean): void
  isDisabled?: boolean
  className?: string
}) {
  return (
    <Checkbox
      className={`inline-check ${className}`}
      isDisabled={isDisabled}
      isSelected={isSelected}
      onChange={onChange}
    >
      <Checkbox.Control>
        <Checkbox.Indicator />
      </Checkbox.Control>
      <Checkbox.Content>
        <Label>{label}</Label>
      </Checkbox.Content>
    </Checkbox>
  )
}
