import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type {
  CreateLocalSecretInput,
  LocalSecretMetadata,
  SecretStorageStatus,
} from '../../../src/shared/secrets'
import { normalizeLocalSecretName } from '../../../src/shared/secrets'

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

  async function readSecretFile(): Promise<SecretFile> {
    try {
      const raw = await readFile(secretsFilePath, 'utf8')
      const parsed = JSON.parse(raw) as Partial<SecretFile>

      return {
        secrets: Array.isArray(parsed.secrets) ? parsed.secrets : [],
      }
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return { secrets: [] }
      }

      throw error
    }
  }

  async function writeSecretFile(secretFile: SecretFile): Promise<void> {
    await mkdir(dataDir, { recursive: true })
    await writeFile(
      secretsFilePath,
      `${JSON.stringify(secretFile, null, 2)}\n`,
      'utf8',
    )
  }

  async function readMigratedSecretFile(): Promise<SecretFile> {
    const secretFile = await readSecretFile()

    if (!encryptionAvailable) {
      return secretFile
    }

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

    if (didMigrate) {
      await writeSecretFile({ secrets })
    }

    return { secrets }
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
      const value = input.value.trim()

      if (!name || !value) {
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
      const secretFile = await readMigratedSecretFile()
      await writeSecretFile({
        secrets: [...secretFile.secrets, secret],
      })

      return toMetadata(secret)
    },

    async deleteSecret(id) {
      const secretFile = await readMigratedSecretFile()
      await writeSecretFile({
        secrets: secretFile.secrets.filter((secret) => secret.id !== id),
      })
    },
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

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}
