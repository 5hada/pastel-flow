export type DeviceAccessLevel = 'blocked' | 'visible' | 'executable' | 'trusted'

export type CurrentDevice = {
  id: string
  name: string
}

export type LinkedDevice = CurrentDevice & {
  accessLevel: DeviceAccessLevel
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
