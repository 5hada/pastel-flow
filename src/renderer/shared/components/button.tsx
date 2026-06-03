import { Button as HeroButton, Spinner } from '@heroui/react'
import type { ComponentProps, ReactNode } from 'react'

type HeroButtonProps = ComponentProps<typeof HeroButton>
type HeroButtonVariant = HeroButtonProps['variant']

export type ButtonIntent =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'danger'
  | 'dangerSoft'
  | 'ghost'
  | 'outline'
  | 'link'
export type ButtonShape = 'default' | 'circle'
export type ButtonIconPosition = 'start' | 'end'
export type ButtonTransparentContent = 'text' | 'icon'

export type ButtonProps = Omit<HeroButtonProps, 'className' | 'isIconOnly' | 'isPending'> & {
  className?: string
  icon?: ReactNode
  iconOnly?: boolean
  iconPosition?: ButtonIconPosition
  intent?: ButtonIntent
  isIconOnly?: HeroButtonProps['isIconOnly']
  isPending?: HeroButtonProps['isPending']
  label?: ReactNode
  loading?: boolean
  loadingIcon?: ReactNode
  shape?: ButtonShape
  transparent?: boolean
  transparentContent?: ButtonTransparentContent
}

const INTENT_VARIANTS: Record<ButtonIntent, HeroButtonVariant> = {
  primary: 'primary',
  secondary: 'secondary',
  tertiary: 'tertiary',
  danger: 'danger',
  dangerSoft: 'danger-soft',
  ghost: 'ghost',
  outline: 'outline',
  link: 'ghost',
}

const SHAPE_CLASS_NAMES: Record<ButtonShape, string> = {
  default: 'flex flex-wrap gap-3',
  circle: 'flex gap-3',
}

const INTENT_CLASS_NAMES: Partial<Record<ButtonIntent, string>> = {
  link: 'bg-transparent px-1 text-current hover:bg-transparent underline-offset-4 hover:underline',
}

const TRANSPARENT_CLASS_NAMES: Record<ButtonTransparentContent, string> = {
  icon: 'bg-transparent text-current hover:bg-black/5 dark:hover:bg-white/10',
  text: 'bg-transparent px-1 text-current hover:bg-transparent underline-offset-4 hover:underline',
}

function mergeClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(' ')
}

function resolveContent({
  children,
  icon,
  iconOnly,
  iconPosition,
  isLoading,
  label,
  loadingIcon,
}: Pick<ButtonProps, 'children' | 'icon' | 'iconOnly' | 'iconPosition' | 'label' | 'loadingIcon'> & {
  isLoading: boolean
}) {
  if (children !== undefined) {
    return children
  }

  const resolvedIcon = isLoading ? (loadingIcon ?? <Spinner color="current" size="sm" />) : icon
  const resolvedLabel = label

  if (iconOnly) {
    return resolvedIcon
  }

  if (iconPosition === 'end') {
    return (
      <>
        {resolvedLabel}
        {resolvedIcon}
      </>
    )
  }

  return (
    <>
      {resolvedIcon}
      {resolvedLabel}
    </>
  )
}

export function Button({
  children,
  className,
  icon,
  iconOnly,
  iconPosition = 'start',
  intent,
  isIconOnly,
  isPending,
  label,
  loading = false,
  loadingIcon,
  shape = 'default',
  transparent = false,
  transparentContent = iconOnly || isIconOnly ? 'icon' : 'text',
  variant,
  ...props
}: ButtonProps) {
  const resolvedIconOnly = iconOnly ?? isIconOnly ?? false
  const isLoading = loading || Boolean(isPending)
  const resolvedIntent = intent ?? (variant === 'danger-soft' ? 'dangerSoft' : variant)
  const resolvedVariant = transparent ? 'ghost' : (resolvedIntent ? INTENT_VARIANTS[resolvedIntent] : variant)

  return (
    <HeroButton
      className={mergeClassNames(
        SHAPE_CLASS_NAMES[shape],
        resolvedIntent ? INTENT_CLASS_NAMES[resolvedIntent] : undefined,
        transparent ? TRANSPARENT_CLASS_NAMES[transparentContent] : undefined,
        className,
      )}
      isIconOnly={resolvedIconOnly}
      isPending={isLoading}
      variant={resolvedVariant}
      {...props}
    >
      {resolveContent({
        children,
        icon,
        iconOnly: resolvedIconOnly,
        iconPosition,
        isLoading,
        label,
        loadingIcon,
      })}
    </HeroButton>
  )
}
