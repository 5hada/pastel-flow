import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type {
  CreateLocalSecretInput,
  LocalSecretMetadata,
} from '../../../src/shared/secrets'
import { normalizeLocalSecretName } from '../../../src/shared/secrets'

export type SecretStore = {
  listSecrets(): Promise<LocalSecretMetadata[]>
  createSecret(input: CreateLocalSecretInput): Promise<LocalSecretMetadata>
  deleteSecret(id: string): Promise<void>
}

export type SecretStoreOptions = {
  dataDir: string
}

type StoredLocalSecret = LocalSecretMetadata & {
  value: string
}

type SecretFile = {
  secrets: StoredLocalSecret[]
}

export function createSecretStore({ dataDir }: SecretStoreOptions): SecretStore {
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

  return {
    async listSecrets() {
      const secretFile = await readSecretFile()
      return secretFile.secrets.map(toMetadata)
    },

    async createSecret(input) {
      const name = normalizeLocalSecretName(input.name)
      const value = input.value.trim()

      if (!name || !value) {
        throw new Error('Secret 이름과 값이 필요합니다.')
      }

      const now = new Date().toISOString()
      const secret: StoredLocalSecret = {
        id: randomUUID(),
        name,
        value,
        description: input.description?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      }
      const secretFile = await readSecretFile()
      await writeSecretFile({
        secrets: [...secretFile.secrets, secret],
      })

      return toMetadata(secret)
    },

    async deleteSecret(id) {
      const secretFile = await readSecretFile()
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
