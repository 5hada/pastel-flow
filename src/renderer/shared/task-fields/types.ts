import type { CurrentDevice } from '../../../shared/devices'
import type { LocalSecretMetadata } from '../../../shared/secrets'
import type { BrowserProfilePreset } from '../../../shared/settings'
import type { UrlGroup } from '../../../shared/urlGroups'
import type { BrowserTaskFormState } from '../state/taskFormState'

export type TaskFieldsProps = {
  form: BrowserTaskFormState
  isDisabled?: boolean
  profilePresets?: BrowserProfilePreset[]
  urlGroups?: UrlGroup[]
  onChange(value: BrowserTaskFormState): void
}

export type PolicyFieldsProps = {
  currentDevice: CurrentDevice
  form: BrowserTaskFormState
  secrets: LocalSecretMetadata[]
  onChange(value: BrowserTaskFormState): void
}
