import type { SecretRef } from '../secrets/types'

export type DeviceAccessLevel = 'blocked' | 'visible' | 'executable' | 'trusted'

export type CurrentDevice = {
  id: string
  name: string
}

export type LinkedDevice = CurrentDevice & {
  accessLevel: DeviceAccessLevel
}

export type DeviceVisibilityPolicy =
  | 'all_devices'
  | 'trusted_devices'
  | 'specific_devices'
  | 'local_only'

export type DeviceExecutionPolicy =
  | 'anywhere'
  | 'trusted_only'
  | 'specific_devices'
  | 'local_only'

export type DevicePolicy = {
  visibility: DeviceVisibilityPolicy
  execution: DeviceExecutionPolicy
  allowedDeviceIds?: string[]
  secretRefs?: SecretRef[]
}
  