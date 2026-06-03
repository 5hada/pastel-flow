import {
  getDeviceExecutionPolicyLabel,
  getDeviceVisibilityPolicyLabel,
} from '../../../shared/devices'

export const browserKindOptions = [
  { label: 'Chrome', value: 'chrome' },
  { label: 'Edge', value: 'edge' },
  { label: 'Chromium', value: 'chromium' },
] as const

export const browserRunModeOptions = [
  { label: '전용 프로필', value: 'dedicated_profile' },
  { label: '확장 프로그램 제어', value: 'extension_controlled' },
  { label: '기본 브라우저 연결', value: 'default_browser_deeplink' },
] as const

export const profileSourceOptions = [
  { label: '작업 전용 프로필', value: 'action_profile' },
  { label: '기존 브라우저 프로필', value: 'existing_profile' },
] as const

export const scheduleModeOptions = [
  { label: '간격', value: 'interval' },
  { label: '매일', value: 'daily' },
  { label: '매주', value: 'weekly' },
] as const

export const visibilityOptions = (
  ['all_devices', 'trusted_devices', 'specific_devices', 'local_only'] as const
).map((visibility) => ({
  label: getDeviceVisibilityPolicyLabel(visibility),
  value: visibility,
}))

export const executionOptions = (
  ['anywhere', 'trusted_only', 'specific_devices', 'local_only'] as const
).map((execution) => ({
  label: getDeviceExecutionPolicyLabel(execution),
  value: execution,
}))
