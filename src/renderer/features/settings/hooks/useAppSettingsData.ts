import { type FormEvent, useEffect, useState } from 'react'
import type { CurrentDevice } from '../../../../shared/devices'
import {
  type AppSettings,
  type WorkflowListDisplayMode,
} from '../../../../shared/settings'
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
    const customVars: [string, string][] = [
      ['--app-bg', appSettings.customThemeColors.appBg],
      ['--surface', appSettings.customThemeColors.surface],
      ['--surface-muted', appSettings.customThemeColors.surfaceMuted],
      ['--surface-raised', appSettings.customThemeColors.surfaceRaised],
      ['--surface-selected', appSettings.customThemeColors.surfaceSelected],
      ['--border', appSettings.customThemeColors.border],
      ['--border-strong', appSettings.customThemeColors.borderStrong],
      ['--text', appSettings.customThemeColors.text],
      ['--text-muted', appSettings.customThemeColors.textMuted],
      ['--accent', appSettings.customThemeColors.accent],
      ['--accent-hover', appSettings.customThemeColors.accentHover],
      ['--accent-soft', appSettings.customThemeColors.accentSoft],
      ['--accent-contrast', appSettings.customThemeColors.accentContrast],
      ['--danger', appSettings.customThemeColors.danger],
      ['--danger-hover', appSettings.customThemeColors.dangerHover],
      ['--danger-soft', appSettings.customThemeColors.dangerSoft],
      ['--info', appSettings.customThemeColors.info],
      ['--info-soft', appSettings.customThemeColors.infoSoft],
      ['--warning', appSettings.customThemeColors.warning],
      ['--warning-text', appSettings.customThemeColors.warningText],
      ['--success', appSettings.customThemeColors.success],
      ['--success-soft', appSettings.customThemeColors.successSoft],
      ['--control-bg', appSettings.customThemeColors.controlBg],
      ['--readonly-bg', appSettings.customThemeColors.readonlyBg],
      ['--rail-bg', appSettings.customThemeColors.railBg],
    ]

    if (appSettings.themeMode === 'custom') {
      customVars.forEach(([name, value]) => root.style.setProperty(name, value))
    } else {
      customVars.forEach(([name]) => root.style.removeProperty(name))
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
