import type { CustomThemeColors, ThemeColorKey, ThemeMode } from './types'

export type ThemeColorGroup =
  | 'accent'
  | 'base'
  | 'field'
  | 'status'
  | 'surface'

export type ThemeColorDefinition = {
  key: ThemeColorKey
  cssVariable: string
  defaultValue: string
  group: ThemeColorGroup
  label: string
  description: string
}

export const themeColorDefinitions: ThemeColorDefinition[] = [
  token('background', '--background', '#f7f7f7', 'base', 'Background'),
  token('foreground', '--foreground', '#27272a', 'base', 'Foreground'),
  token('muted', '--muted', '#71717a', 'base', 'Muted'),
  token('border', '--border', '#e4e4e7', 'base', 'Border'),
  token('focus', '--focus', '#2563eb', 'base', 'Focus'),
  token('surface', '--surface', '#ffffff', 'surface', 'Surface'),
  token(
    'surfaceForeground',
    '--surface-foreground',
    '#27272a',
    'surface',
    'Surface foreground',
  ),
  token(
    'surfaceSecondary',
    '--surface-secondary',
    '#f4f4f5',
    'surface',
    'Surface secondary',
  ),
  token(
    'surfaceSecondaryForeground',
    '--surface-secondary-foreground',
    '#27272a',
    'surface',
    'Surface secondary foreground',
  ),
  token(
    'surfaceTertiary',
    '--surface-tertiary',
    '#eeeeef',
    'surface',
    'Surface tertiary',
  ),
  token('default', '--default', '#f4f4f5', 'surface', 'Default'),
  token(
    'defaultForeground',
    '--default-foreground',
    '#27272a',
    'surface',
    'Default foreground',
  ),
  token('segment', '--segment', '#ffffff', 'surface', 'Segment'),
  token('accent', '--accent', '#2563eb', 'accent', 'Accent'),
  token(
    'accentForeground',
    '--accent-foreground',
    '#ffffff',
    'accent',
    'Accent foreground',
  ),
  token('accentHover', '--accent-hover', '#1d4ed8', 'accent', 'Accent hover'),
  token('accentSoft', '--accent-soft', '#dbeafe', 'accent', 'Accent soft'),
  token(
    'accentSoftForeground',
    '--accent-soft-foreground',
    '#1d4ed8',
    'accent',
    'Accent soft foreground',
  ),
  token(
    'fieldBackground',
    '--field-background',
    '#ffffff',
    'field',
    'Field background',
  ),
  token(
    'fieldForeground',
    '--field-foreground',
    '#27272a',
    'field',
    'Field foreground',
  ),
  token(
    'fieldPlaceholder',
    '--field-placeholder',
    '#71717a',
    'field',
    'Field placeholder',
  ),
  token('danger', '--danger', '#dc2626', 'status', 'Danger'),
  token(
    'dangerForeground',
    '--danger-foreground',
    '#ffffff',
    'status',
    'Danger foreground',
  ),
  token('dangerHover', '--danger-hover', '#b91c1c', 'status', 'Danger hover'),
  token('dangerSoft', '--danger-soft', '#fee2e2', 'status', 'Danger soft'),
  token('warning', '--warning', '#f59e0b', 'status', 'Warning'),
  token(
    'warningForeground',
    '--warning-foreground',
    '#27272a',
    'status',
    'Warning foreground',
  ),
  token('warningSoft', '--warning-soft', '#fef3c7', 'status', 'Warning soft'),
  token('success', '--success', '#16a34a', 'status', 'Success'),
  token(
    'successForeground',
    '--success-foreground',
    '#27272a',
    'status',
    'Success foreground',
  ),
  token('successSoft', '--success-soft', '#dcfce7', 'status', 'Success soft'),
]

export const themeColorGroups: Array<{
  id: ThemeColorGroup
  label: string
}> = [
  { id: 'base', label: 'Base' },
  { id: 'surface', label: 'Surface' },
  { id: 'accent', label: 'Accent' },
  { id: 'field', label: 'Field' },
  { id: 'status', label: 'Status' },
]

export function createDefaultCustomThemeColors(): CustomThemeColors {
  return Object.fromEntries(
    themeColorDefinitions.map((definition) => [
      definition.key,
      definition.defaultValue,
    ]),
  ) as CustomThemeColors
}

export const themePreviewColorSets: Record<
  Exclude<ThemeMode, 'custom'>,
  CustomThemeColors
> = {
  light: createDefaultCustomThemeColors(),
  system: createDefaultCustomThemeColors(),
  dark: {
    ...createDefaultCustomThemeColors(),
    background: '#1f1f23',
    foreground: '#fafafa',
    muted: '#a1a1aa',
    border: '#3f3f46',
    surface: '#27272a',
    surfaceForeground: '#fafafa',
    surfaceSecondary: '#303035',
    surfaceSecondaryForeground: '#fafafa',
    surfaceTertiary: '#3f3f46',
    default: '#3f3f46',
    defaultForeground: '#fafafa',
    segment: '#52525b',
    fieldBackground: '#27272a',
    fieldForeground: '#fafafa',
    fieldPlaceholder: '#a1a1aa',
    warningForeground: '#27272a',
    successForeground: '#27272a',
  },
}

function token(
  key: ThemeColorKey,
  cssVariable: string,
  defaultValue: string,
  group: ThemeColorGroup,
  label: string,
): ThemeColorDefinition {
  return {
    key,
    cssVariable,
    defaultValue,
    group,
    label,
    description: `HeroUI ${cssVariable}`,
  }
}
