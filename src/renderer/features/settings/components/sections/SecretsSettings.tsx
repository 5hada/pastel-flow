import { Button } from '@heroui/react'
import type {
  LocalSecretMetadata,
  SecretStorageStatus,
} from '../../../../../shared/secrets'
import type { SecretFormState } from '../../../../shared/state/taskFormState'
import {
  FormSection,
  TextInputField,
} from '../../../../shared/components/HeroForm'

export type SecretsSettingsProps = {
  secretForm: SecretFormState
  secretStorageStatus: SecretStorageStatus
  secrets: LocalSecretMetadata[]
  onCreateSecret(): Promise<void>
  onDeleteSecret(secretId: string): Promise<void>
  onSecretFormChange(value: SecretFormState): void
}

export function SecretsSettings({
  secretForm,
  secretStorageStatus,
  secrets,
  onCreateSecret,
  onDeleteSecret,
  onSecretFormChange,
}: SecretsSettingsProps) {
  return (
    <FormSection
      ariaLabel="로컬 Secret"
      eyebrow="Secrets"
      title="로컬 Secret"
      action={<span>{secrets.length}개</span>}
    >
      <div
        className={`secret-storage-status${
          secretStorageStatus.encryptionAvailable ? ' is-ok' : ' is-warning'
        }`}
      >
        <strong>
          {secretStorageStatus.encryptionAvailable
            ? '암호화 사용 가능'
            : '암호화 사용 불가'}
        </strong>
        <span>{secretStorageStatus.message}</span>
        <code>{secretStorageStatus.backend}</code>
      </div>

      <div className="secret-form">
        <TextInputField
          label="이름"
          name="secret-name"
          value={secretForm.name}
          onChange={(value) =>
            onSecretFormChange({
              ...secretForm,
              name: value,
            })
          }
        />
        <TextInputField
          label="값"
          name="secret-value"
          type="password"
          value={secretForm.value}
          onChange={(value) =>
            onSecretFormChange({
              ...secretForm,
              value,
            })
          }
        />
        <TextInputField
          label="설명"
          name="secret-description"
          value={secretForm.description}
          onChange={(value) =>
            onSecretFormChange({
              ...secretForm,
              description: value,
            })
          }
        />
        <Button
          variant="secondary"
          type="button"
          onPress={() => void onCreateSecret()}
        >
          추가
        </Button>
      </div>

      {secrets.length === 0 ? (
        <p className="muted-text">저장된 로컬 Secret이 없습니다.</p>
      ) : (
        <div className="secret-list">
          {secrets.map((secret) => (
            <div className="secret-row" key={secret.id}>
              <div>
                <strong>{secret.name}</strong>
                <small>{secret.description ?? secret.id}</small>
              </div>
              <Button
                className="danger-button"
                variant="danger"
                type="button"
                onPress={() => void onDeleteSecret(secret.id)}
              >
                삭제
              </Button>
            </div>
          ))}
        </div>
      )}
    </FormSection>
  )
}
