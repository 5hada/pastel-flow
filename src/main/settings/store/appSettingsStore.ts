import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  defaultAppSettings,
  normalizeAppSettings,
  type AppSettings,
  type AppSettingsSnapshot,
} from '../../../shared/settings'

export type StoredAppSettingsSnapshot = Omit<AppSettingsSnapshot, 'currentDevice'>

export type AppSettingsStore = {
  getSnapshot(): Promise<StoredAppSettingsSnapshot>
  updateSettings(settings: AppSettings): Promise<StoredAppSettingsSnapshot>
}

export type AppSettingsStoreOptions = {
  dataDir: string
}

type AppSettingsFile = {
  settings?: Partial<AppSettings>
}

export function createAppSettingsStore({
  dataDir,
}: AppSettingsStoreOptions): AppSettingsStore {
  const settingsFilePath = path.join(dataDir, 'appSettings.json')

  async function readSettings(): Promise<AppSettings> {
    try {
      const raw = await readFile(settingsFilePath, 'utf8')
      const parsed = JSON.parse(raw) as AppSettingsFile

      return normalizeAppSettings(parsed.settings)
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return defaultAppSettings
      }

      throw error
    }
  }

  async function writeSettings(settings: AppSettings): Promise<void> {
    await mkdir(dataDir, { recursive: true })
    await writeFile(
      settingsFilePath,
      `${JSON.stringify({ settings: normalizeAppSettings(settings) }, null, 2)}\n`,
      'utf8',
    )
  }

  return {
    async getSnapshot() {
      return {
        settings: await readSettings(),
        userDataPath: dataDir,
      }
    },

    async updateSettings(settings) {
      const normalizedSettings = normalizeAppSettings(settings)
      await writeSettings(normalizedSettings)

      return {
        settings: normalizedSettings,
        userDataPath: dataDir,
      }
    },
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}
