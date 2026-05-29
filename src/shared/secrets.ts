export type LocalSecretMetadata = {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

export type CreateLocalSecretInput = {
  name: string
  value: string
  description?: string
}

export type SecretStorageStatus = {
  encryptionAvailable: boolean
  backend: string
  message: string
}

export function normalizeLocalSecretName(value: string): string {
  return value.trim()
}
