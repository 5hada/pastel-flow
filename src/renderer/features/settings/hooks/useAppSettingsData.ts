import { type FormEvent, useEffect, useState } from 'react'
import type { CurrentDevice } from '../../../../shared/devices'
import {
  type AppSettings,
  type WorkflowListDisplayMode,
} from '../../../../shared/settings'
import { themeColorDefinitions } from '../../../../shared/settings/themeTokens'
import {
  defaultSettingsForm,
  initialSettingsSnapshot,
  type SettingsSaveState,
} from '../../../shared/state/taskFormState'
import { isSettingsDirty } from '../../../shared/utils/taskFormTransforms'
import { getErrorMessage } from '../../../shared/utils/viewLabels'

type AppSettingsSnapshot = {
  settings: AppSettings
  userDataPath: string
  currentDevice: CurrentDevice
}

export function useAppSettingsData(
  setErrorMessage: (message: string | null) => void,
  setWorkspaceMode: (mode: 'run') => void,
) {
  const [appSettings, setAppSettings] = useState<AppSettings>(
    initialSettingsSnapshot.settings,
  )
  const [settingsForm, setSettingsForm] =
    useState<AppSettings>(defaultSettingsForm)
  const [userDataPath, setUserDataPath] = useState(
    initialSettingsSnapshot.userDataPath,
  )
  const [currentDevice, setCurrentDevice] = useState<CurrentDevice>(
    initialSettingsSnapshot.currentDevice,
  )
  const [settingsSaveState, setSettingsSaveState] =
    useState<SettingsSaveState>(null)
  const [settingsErrorMessage, setSettingsErrorMessage] = useState<
    string | null
  >(null)

  useEffect(() => {
    document.documentElement.dataset.theme = appSettings.themeMode
    const root = document.documentElement

    if (appSettings.themeMode === 'custom') {
      themeColorDefinitions.forEach((definition) =>
        root.style.setProperty(
          definition.cssVariable,
          appSettings.customThemeColors[definition.key],
        ),
      )
    } else {
      themeColorDefinitions.forEach((definition) =>
        root.style.removeProperty(definition.cssVariable),
      )
    }
  }, [appSettings])

  function applySnapshot(snapshot: AppSettingsSnapshot) {
    setAppSettings(snapshot.settings)
    setSettingsForm(snapshot.settings)
    setUserDataPath(snapshot.userDataPath)
    setCurrentDevice(snapshot.currentDevice)
  }

  async function loadAppSettings() {
    if (!window.pastelFlow) {
      setErrorMessage('Pastel Flow API를 불러오지 못했습니다.')
      return
    }

    try {
      setSettingsErrorMessage(null)
      applySnapshot(await window.pastelFlow.settings.get())
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function updateSettings(nextSettings: AppSettings) {
    if (!window.pastelFlow) {
      return
    }

    try {
      setErrorMessage(null)
      applySnapshot(await window.pastelFlow.settings.update(nextSettings))
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleSaveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!window.pastelFlow) {
      return
    }

    try {
      setSettingsSaveState(null)
      setSettingsErrorMessage(null)
      applySnapshot(await window.pastelFlow.settings.update(settingsForm))
      setSettingsSaveState('saved')
    } catch (error) {
      setSettingsSaveState('failed')
      setSettingsErrorMessage(getErrorMessage(error))
    }
  }

  async function handleTaskListDisplayModeChange(
    workflowListDisplayMode: WorkflowListDisplayMode,
  ) {
    const nextSettings = {
      ...appSettings,
      workflowListDisplayMode,
    }

    setAppSettings(nextSettings)
    setSettingsForm((currentForm) => ({
      ...currentForm,
      workflowListDisplayMode,
    }))
    await updateSettings(nextSettings)
  }

  async function handleWorkflowGridColumnCountChange(
    workflowGridColumnCount: number,
  ) {
    const nextSettings = {
      ...appSettings,
      workflowGridColumnCount,
    }

    setAppSettings(nextSettings)
    setSettingsForm((currentForm) => ({
      ...currentForm,
      workflowGridColumnCount,
    }))
    await updateSettings(nextSettings)
  }

  function resetSettingsDraft() {
    setSettingsForm(appSettings)
    setSettingsSaveState(null)
    setSettingsErrorMessage(null)
  }

  function closeSettingsMode() {
    if (
      isSettingsDirty(settingsForm, appSettings) &&
      !window.confirm('저장하지 않은 설정 변경 사항을 버릴까요?')
    ) {
      return
    }

    resetSettingsDraft()
    setWorkspaceMode('run')
  }

  return {
    appSettings,
    currentDevice,
    settingsErrorMessage,
    settingsForm,
    settingsSaveState,
    userDataPath,
    closeSettingsMode,
    handleSaveSettings,
    handleTaskListDisplayModeChange,
    handleWorkflowGridColumnCountChange,
    loadAppSettings,
    resetSettingsDraft,
    setSettingsErrorMessage,
    setSettingsForm,
    setSettingsSaveState,
    updateSettings,
  }
}
