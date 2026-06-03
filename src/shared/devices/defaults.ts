import type { 
  DevicePolicy,
  DeviceAccessLevel,
  DeviceVisibilityPolicy,
  DeviceExecutionPolicy,
  LinkedDevice
} from "./types"

export const defaultDevicePolicy: DevicePolicy = {
  visibility: 'local_only',
  execution: 'local_only',
}

export function normalizeDevicePolicy(
  policy: Partial<DevicePolicy> | null | undefined,
): DevicePolicy {
  return {
    visibility: isDeviceVisibilityPolicy(policy?.visibility)
      ? policy.visibility
      : defaultDevicePolicy.visibility,
    execution: isDeviceExecutionPolicy(policy?.execution)
      ? policy.execution
      : defaultDevicePolicy.execution,
    allowedDeviceIds: Array.isArray(policy?.allowedDeviceIds)
      ? policy.allowedDeviceIds
          .map((deviceId) =>
            typeof deviceId === 'string' ? deviceId.trim() : '',
          )
          .filter(Boolean)
      : undefined,
    secretRefs: Array.isArray(policy?.secretRefs)
      ? policy.secretRefs.filter(
          (secretRef) =>
            typeof secretRef.id === 'string' &&
            secretRef.id.trim() &&
            (secretRef.scope === 'local_device' ||
              secretRef.scope === 'trusted_devices'),
        )
      : undefined,
  }
}

export function getDeviceVisibilityPolicyLabel(
  visibility: DeviceVisibilityPolicy,
): string {
  switch (visibility) {
    case 'all_devices':
      return '모든 기기'
    case 'trusted_devices':
      return '신뢰 기기'
    case 'specific_devices':
      return '지정 기기'
    case 'local_only':
      return '로컬 전용'
  }
}

export function getDeviceExecutionPolicyLabel(
  execution: DeviceExecutionPolicy,
): string {
  switch (execution) {
    case 'anywhere':
      return '어디서나'
    case 'trusted_only':
      return '신뢰 기기'
    case 'specific_devices':
      return '지정 기기'
    case 'local_only':
      return '로컬 전용'
  }
}

export function isRestrictedDevicePolicy(policy: DevicePolicy): boolean {
  return (
    policy.visibility !== 'all_devices' ||
    policy.execution !== 'anywhere' ||
    Boolean(policy.secretRefs?.length)
  )
}

function isDeviceVisibilityPolicy(
  value: unknown,
): value is DeviceVisibilityPolicy {
  return (
    value === 'all_devices' ||
    value === 'trusted_devices' ||
    value === 'specific_devices' ||
    value === 'local_only'
  )
}

function isDeviceExecutionPolicy(
  value: unknown,
): value is DeviceExecutionPolicy {
  return (
    value === 'anywhere' ||
    value === 'trusted_only' ||
    value === 'specific_devices' ||
    value === 'local_only'
  )
}

export function normalizeLinkedDevices(value: unknown): LinkedDevice[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((device): LinkedDevice | null => {
      if (!device || typeof device !== 'object') {
        return null
      }

      const candidate = device as Partial<LinkedDevice>
      if (typeof candidate.id !== 'string' || !candidate.id.trim()) {
        return null
      }

      return {
        id: candidate.id.trim(),
        name:
          typeof candidate.name === 'string' && candidate.name.trim()
            ? candidate.name.trim()
            : candidate.id.trim(),
        accessLevel: isDeviceAccessLevel(candidate.accessLevel)
          ? candidate.accessLevel
          : 'visible',
      }
    })
    .filter((device): device is LinkedDevice => Boolean(device))
}

export function getDeviceAccessLevelLabel(
  accessLevel: DeviceAccessLevel,
): string {
  switch (accessLevel) {
    case 'blocked':
      return '차단'
    case 'visible':
      return '보기 허용'
    case 'executable':
      return '실행 허용'
    case 'trusted':
      return '신뢰'
  }
}

function isDeviceAccessLevel(value: unknown): value is DeviceAccessLevel {
  return (
    value === 'blocked' ||
    value === 'visible' ||
    value === 'executable' ||
    value === 'trusted'
  )
}