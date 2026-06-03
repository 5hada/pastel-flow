import type {
    CreateLocalSecretInput,
    LocalSecretMetadata,
    SecretStorageStatus
} from '../../../shared/secrets'


export type SecretsApi = {
  status(): Promise<SecretStorageStatus>
  list(): Promise<LocalSecretMetadata[]>
  create(input: CreateLocalSecretInput): Promise<LocalSecretMetadata>
  delete(id: string): Promise<void>
}