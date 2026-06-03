import path from 'node:path'
import {
  defaultAppSettings,
  normalizeAppSettings,
  type AppSettings,
  type AppSettingsSnapshot,
} from '../../../shared/settings'
import { createAtomicJsonFile } from '../../storage/atomicJsonFile'

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
  const settingsFile = createAtomicJsonFile<AppSettingsFile>({
    filePath: settingsFilePath,
    defaultValue: () => ({ settings: defaultAppSettings }),
    normalize(value) {
      const candidate = value as Partial<AppSettingsFile>
      return {
        settings: normalizeAppSettings(candidate.settings),
      }
    },
  })

  async function readSettings(): Promise<AppSettings> {
    return normalizeAppSettings((await settingsFile.read()).settings)
  }

  async function writeSettings(settings: AppSettings): Promise<void> {
    await settingsFile.write({ settings: normalizeAppSettings(settings) })
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
