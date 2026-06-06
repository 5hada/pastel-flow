import type { AppSettingsPanelProps } from '../../AppSettingsPanel'

export type SettingsCategoryContentProps = Omit<
  AppSettingsPanelProps,
  'onClose' | 'onSubmit' | 'saveState' | 'settingsErrorMessage'
>
