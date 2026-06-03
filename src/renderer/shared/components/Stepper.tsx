import { IconButton } from './IconButton'

export type StepperProps = {
  ariaLabel?: string
  className?: string
  decrementLabel: string
  incrementLabel: string
  max: number
  min: number
  value: number
  onChange(value: number): void
}

export function Stepper({
  ariaLabel,
  className = 'grid-column-stepper',
  decrementLabel,
  incrementLabel,
  max,
  min,
  onChange,
  value,
}: StepperProps) {
  return (
    <div aria-label={ariaLabel} className={className}>
      <IconButton
        aria-label={decrementLabel}
        icon="-"
        isDisabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      />
      <span aria-label={`${value}열`}>{value}</span>
      <IconButton
        aria-label={incrementLabel}
        icon="+"
        isDisabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      />
    </div>
  )
}
