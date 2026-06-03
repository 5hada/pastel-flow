

import { Card } from '@heroui/react'

export type DetailItemProps = {
  label: string
  value: string
}

export function DetailItem({ label, value }: DetailItemProps) {
  return (
    <Card className="detail-item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </Card>
  )
}
