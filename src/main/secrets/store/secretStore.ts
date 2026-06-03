import { randomUUID } from 'node:crypto'
import path from 'node:path'
import type {
  CreateLocalSecretInput,
  LocalSecretMetadata,
  SecretStorageStatus,
} from '../../../shared/secrets'
import { normalizeLocalSecretName } from '../../../shared/secrets'
import { createAtomicJsonFile } from '../../storage/atomicJsonFile'

export type SecretStore = {
  getStorageStatus(): Promise<SecretStorageStatus>
  listSecrets(): Promise<LocalSecretMetadata[]>
  createSecret(input: CreateLocalSecretInput): Promise<LocalSecretMetadata>
  deleteSecret(id: string): Promise<void>
}

export type SecretStoreOptions = {
  dataDir: string
  encrypt(value: string): string
  encryptionAvailable: boolean
  encryptionBackend: string
}

type StoredLocalSecret = LocalSecretMetadata & {
  encryptedValue?: string
  value?: string
  storage: 'electron_safe_storage'
}

type SecretFile = {
  secrets: StoredLocalSecret[]
}

export function createSecretStore({
  dataDir,
  encrypt,
  encryptionBackend,
  encryptionAvailable,
}: SecretStoreOptions): SecretStore {
  const secretsFilePath = path.join(dataDir, 'secrets.json')
  const secretJsonFile = createAtomicJsonFile<SecretFile>({
    filePath: secretsFilePath,
    defaultValue: () => ({ secrets: [] }),
    normalize: normalizeSecretFile,
  })

  async function readSecretFile(): Promise<SecretFile> {
    return secretJsonFile.read()
  }

  async function writeSecretFile(secretFile: SecretFile): Promise<void> {
    await secretJsonFile.write(secretFile)
  }

  async function readMigratedSecretFile(): Promise<SecretFile> {
    const secretFile = await readSecretFile()

    if (!encryptionAvailable) {
      return secretFile
    }

    const { didMigrate, secretFile: migratedSecretFile } =
      migratePlaintextSecrets(secretFile, encrypt)

    if (didMigrate) {
      await writeSecretFile(migratedSecretFile)
    }

    return migratedSecretFile
  }

  return {
    async getStorageStatus() {
      return {
        encryptionAvailable,
        backend: encryptionBackend,
        message: encryptionAvailable
          ? 'Secret 암호화 저장을 사용할 수 있습니다.'
          : '이 기기에서는 Electron safeStorage 암호화 저장을 사용할 수 없습니다.',
      }
    },

    async listSecrets() {
      const secretFile = await readMigratedSecretFile()
      return secretFile.secrets.map(toMetadata)
    },

    async createSecret(input) {
      const name = normalizeLocalSecretName(input.name)
      const value = typeof input.value === 'string' ? input.value : ''

      if (!name || value.length === 0) {
        throw new Error('Secret 이름과 값이 필요합니다.')
      }

      if (!encryptionAvailable) {
        throw new Error(
          '이 기기에서는 Secret 암호화 저장을 사용할 수 없습니다.',
        )
      }

      const now = new Date().toISOString()
      const secret: StoredLocalSecret = {
        id: randomUUID(),
        name,
        encryptedValue: encrypt(value),
        storage: 'electron_safe_storage',
        description: input.description?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      }
      await secretJsonFile.update((currentSecretFile) => {
        const { secretFile } = migratePlaintextSecrets(
          currentSecretFile,
          encrypt,
        )
        if (secretFile.secrets.some((currentSecret) => currentSecret.name === name)) {
          throw new Error('같은 이름의 Secret이 이미 있습니다.')
        }

        return {
          nextValue: {
            secrets: [...secretFile.secrets, secret],
          },
          result: undefined,
        }
      })

      return toMetadata(secret)
    },

    async deleteSecret(id) {
      await secretJsonFile.update((currentSecretFile) => {
        const { secretFile } = migratePlaintextSecrets(
          currentSecretFile,
          encrypt,
        )

        return {
          nextValue: {
            secrets: secretFile.secrets.filter((secret) => secret.id !== id),
          },
          result: undefined,
        }
      })
    },
  }
}

function migratePlaintextSecrets(
  secretFile: SecretFile,
  encrypt: (value: string) => string,
): {
  didMigrate: boolean
  secretFile: SecretFile
} {
  let didMigrate = false
  const secrets = secretFile.secrets.map((secret) => {
    if (!secret.value || secret.encryptedValue) {
      return secret
    }

    didMigrate = true
    return {
      ...secret,
      value: undefined,
      encryptedValue: encrypt(secret.value),
      storage: 'electron_safe_storage' as const,
      updatedAt: new Date().toISOString(),
    }
  })

  return {
    didMigrate,
    secretFile: { secrets },
  }
}

function normalizeSecretFile(value: unknown): SecretFile {
  const candidate = value as Partial<SecretFile>
  return {
    secrets: Array.isArray(candidate.secrets) ? candidate.secrets : [],
  }
}

function toMetadata(secret: StoredLocalSecret): LocalSecretMetadata {
  return {
    id: secret.id,
    name: secret.name,
    description: secret.description,
    createdAt: secret.createdAt,
    updatedAt: secret.updatedAt,
  }
}
