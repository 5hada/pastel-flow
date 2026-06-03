import type { ReactNode } from 'react'
import { Button, type ButtonIntent, type ButtonProps } from './button'

export type IconButtonProps = Omit<
  ButtonProps,
  'children' | 'icon' | 'iconOnly' | 'intent' | 'label' | 'shape'
> & {
  icon: ReactNode
  intent?: Extract<ButtonIntent, 'danger' | 'ghost' | 'secondary'>
}

export function IconButton({
  className,
  icon,
  intent = 'ghost',
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <Button
      className={className}
      icon={icon}
      iconOnly
      intent={intent}
      shape="circle"
      type={type}
      {...props}
    />
  )
}
