import { Card } from '@heroui/react'
import type { ReactNode } from 'react'

export function FormPanel({ children }: { children: ReactNode }) {
  return (
    <Card className="form-panel" variant="secondary">
      <Card.Content className="task-form">{children}</Card.Content>
    </Card>
  )
}
