import type { 
    CurrentDevice,
    DeviceAccessLevel,
    LinkedDevice,
    DevicePolicy
} from './types'

import type { WorkflowDefinition } from '../workflows/types'

export function canViewWorkflowOnDevice(
  workflow: WorkflowDefinition,
  currentDevice: CurrentDevice,
  linkedDevices: LinkedDevice[],
): boolean {
  return canViewPolicyOnDevice(
    workflow.permissions,
    currentDevice,
    linkedDevices,
  )
}

export function canExecuteWorkflowOnDevice(
  workflow: WorkflowDefinition,
  currentDevice: CurrentDevice,
  linkedDevices: LinkedDevice[],
): boolean {
  return canExecutePolicyOnDevice(
    workflow.permissions,
    currentDevice,
    linkedDevices,
  )
}

export function createLocalOnlyDevicePolicy(
  currentDevice: CurrentDevice,
): DevicePolicy {
  return {
    visibility: 'local_only',
    execution: 'local_only',
    allowedDeviceIds: [currentDevice.id],
  }
}

function canViewPolicyOnDevice(
  permissions: DevicePolicy,
  currentDevice: CurrentDevice,
  linkedDevices: LinkedDevice[],
): boolean {
  const accessLevel = getCurrentDeviceAccessLevel(currentDevice, linkedDevices)

  if (accessLevel === 'blocked') {
    return false
  }

  switch (permissions.visibility) {
    case 'all_devices':
      return true
    case 'trusted_devices':
      return accessLevel === 'trusted'
    case 'specific_devices':
      return isDeviceAllowed(permissions, currentDevice.id)
    case 'local_only':
      return isLocalDeviceAllowed(permissions, currentDevice.id)
  }
}

function canExecutePolicyOnDevice(
  permissions: DevicePolicy,
  currentDevice: CurrentDevice,
  linkedDevices: LinkedDevice[],
): boolean {
  const accessLevel = getCurrentDeviceAccessLevel(currentDevice, linkedDevices)

  if (accessLevel !== 'executable' && accessLevel !== 'trusted') {
    return false
  }

  switch (permissions.execution) {
    case 'anywhere':
      return true
    case 'trusted_only':
      return accessLevel === 'trusted'
    case 'specific_devices':
      return isDeviceAllowed(permissions, currentDevice.id)
    case 'local_only':
      return isLocalDeviceAllowed(permissions, currentDevice.id)
  }
}

function getCurrentDeviceAccessLevel(
  currentDevice: CurrentDevice,
  linkedDevices: LinkedDevice[],
): DeviceAccessLevel {
  return (
    linkedDevices.find((device) => device.id === currentDevice.id)
      ?.accessLevel ?? 'trusted'
  )
}

function isDeviceAllowed(
  permissions: DevicePolicy,
  deviceId: string,
): boolean {
  return Boolean(permissions.allowedDeviceIds?.includes(deviceId))
}

function isLocalDeviceAllowed(
  permissions: DevicePolicy,
  deviceId: string,
): boolean {
  if (!permissions.allowedDeviceIds || permissions.allowedDeviceIds.length === 0) {
    return true
  }

  return permissions.allowedDeviceIds.includes(deviceId)
}
