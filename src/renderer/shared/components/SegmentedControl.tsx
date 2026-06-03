import type { ReactNode } from 'react'
import { IconButton } from './IconButton'

export type SegmentedControlOption<TValue extends string> = {
  ariaLabel: string
  content: ReactNode
  value: TValue
}

export type SegmentedControlProps<TValue extends string> = {
  ariaLabel: string
  className?: string
  options: SegmentedControlOption<TValue>[]
  value: TValue
  onChange(value: TValue): void
}

export function SegmentedControl<TValue extends string>({
  ariaLabel,
  className = 'display-toggle',
  onChange,
  options,
  value,
}: SegmentedControlProps<TValue>) {
  return (
    <div aria-label={ariaLabel} className={className}>
      {options.map((option) => (
        <IconButton
          aria-label={option.ariaLabel}
          className={value === option.value ? 'is-active' : ''}
          icon={option.content}
          key={option.value}
          onClick={() => onChange(option.value)}
        />
      ))}
    </div>
  )
}
