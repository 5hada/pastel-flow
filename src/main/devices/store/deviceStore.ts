import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { CurrentDevice } from '../../../shared/devices'

export type DeviceStore = {
  getCurrentDevice(): Promise<CurrentDevice>
}

export type DeviceStoreOptions = {
  dataDir: string
}

type DeviceFile = Partial<CurrentDevice>

export function createDeviceStore({ dataDir }: DeviceStoreOptions): DeviceStore {
  const deviceFilePath = path.join(dataDir, 'device.json')

  async function readCurrentDevice(): Promise<CurrentDevice | null> {
    try {
      const raw = await readFile(deviceFilePath, 'utf8')
      const parsed = JSON.parse(raw) as DeviceFile

      if (typeof parsed.id === 'string' && parsed.id.trim()) {
        return {
          id: parsed.id.trim(),
          name:
            typeof parsed.name === 'string' && parsed.name.trim()
              ? parsed.name.trim()
              : parsed.id.trim(),
        }
      }

      return null
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return null
      }

      throw error
    }
  }

  async function writeCurrentDevice(device: CurrentDevice): Promise<void> {
    await mkdir(dataDir, { recursive: true })
    await writeFile(
      deviceFilePath,
      `${JSON.stringify(device, null, 2)}\n`,
      'utf8',
    )
  }

  return {
    async getCurrentDevice() {
      const existingDevice = await readCurrentDevice()

      if (existingDevice) {
        return existingDevice
      }

      const device = {
        id: randomUUID(),
        name: os.hostname() || 'Local device',
      }
      await writeCurrentDevice(device)

      return device
    },
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}
