import { Card } from '@heroui/react'
import type { ReactNode } from 'react'
import { Button, type ButtonIntent } from './button'

export type RunCardProps = {
  actionIntent?: ButtonIntent
  actionLabel: ReactNode
  className?: string
  isActionDisabled?: boolean
  status: string
  subtitle?: ReactNode
  title: ReactNode
  onAction(): void
}

export function RunCard({
  actionIntent = 'primary',
  actionLabel,
  className,
  isActionDisabled = false,
  onAction,
  status,
  subtitle,
  title,
}: RunCardProps) {
  return (
    <Card className={`workflow-run-card status-${status}${className ? ` ${className}` : ''}`}>
      <Card.Header>
        <Card.Title>{title}</Card.Title>
        {subtitle ? <small>{subtitle}</small> : null}
      </Card.Header>
      <Card.Footer>
      <Button
        intent={actionIntent}
        isDisabled={isActionDisabled}
        type="button"
        onClick={onAction}
      >
        {actionLabel}
      </Button>
      </Card.Footer>
    </Card>
  )
}
