import type { CurrentDevice } from '../../../shared/devices'
import type { LocalSecretMetadata } from '../../../shared/secrets'
import type { BrowserProfilePreset } from '../../../shared/settings'
import type { BrowserTaskFormState } from '../state/taskFormState'

export type TaskFieldsProps = {
  form: BrowserTaskFormState
  isDisabled?: boolean
  profilePresets?: BrowserProfilePreset[]
  onChange(value: BrowserTaskFormState): void
}

export type PolicyFieldsProps = {
  currentDevice: CurrentDevice
  form: BrowserTaskFormState
  secrets: LocalSecretMetadata[]
  onChange(value: BrowserTaskFormState): void
}
