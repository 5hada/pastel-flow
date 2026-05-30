import { useState } from 'react'
import type { LocalSecretMetadata } from '../../../shared/secrets'
import type { SecretStorageStatus } from '../../../shared/secrets'
import {
  defaultSecretForm,
  defaultSecretStorageStatus,
  type SecretFormState,
} from '../taskFormState'
import { getErrorMessage } from '../utils/viewLabels'

export function useSecretsData(
  setErrorMessage: (message: string | null) => void,
  setSettingsErrorMessage: (message: string | null) => void,
) {
  const [secrets, setSecrets] = useState<LocalSecretMetadata[]>([])
  const [secretStorageStatus, setSecretStorageStatus] =
    useState<SecretStorageStatus>(defaultSecretStorageStatus)
  const [secretForm, setSecretForm] =
    useState<SecretFormState>(defaultSecretForm)

  async function loadSecrets() {
    if (!window.pastelFlow) {
      return
    }

    try {
      setSecrets(await window.pastelFlow.secrets.list())
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function loadSecretStorageStatus() {
    if (!window.pastelFlow) {
      return
    }

    try {
      setSecretStorageStatus(await window.pastelFlow.secrets.status())
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleCreateSecret() {
    if (!window.pastelFlow) {
      return
    }

    try {
      setSettingsErrorMessage(null)
      const createdSecret = await window.pastelFlow.secrets.create(secretForm)
      setSecrets((currentSecrets) => [...currentSecrets, createdSecret])
      setSecretForm(defaultSecretForm)
    } catch (error) {
      setSettingsErrorMessage(getErrorMessage(error))
    }
  }

  async function handleDeleteSecret(secretId: string) {
    if (!window.pastelFlow) {
      return
    }

    try {
      setSettingsErrorMessage(null)
      await window.pastelFlow.secrets.delete(secretId)
      setSecrets((currentSecrets) =>
        currentSecrets.filter((secret) => secret.id !== secretId),
      )
    } catch (error) {
      setSettingsErrorMessage(getErrorMessage(error))
    }
  }

  return {
    secretForm,
    secretStorageStatus,
    secrets,
    handleCreateSecret,
    handleDeleteSecret,
    loadSecrets,
    loadSecretStorageStatus,
    setSecretForm,
  }
}
