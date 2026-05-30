import { useState } from 'react'
import type {
  RegisteredToolModule,
  ToolModuleRunResult,
} from '../../../shared/tools'
import { createToolInputDefaults, getErrorMessage } from '../utils/viewLabels'

export function useToolModulesData(
  setErrorMessage: (message: string | null) => void,
  loadActionWorkflowData: () => Promise<void>,
) {
  const [toolModules, setToolModules] = useState<RegisteredToolModule[]>([])
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null)
  const [toolInputValues, setToolInputValues] = useState<
    Record<string, unknown>
  >({})
  const [toolRunResult, setToolRunResult] =
    useState<ToolModuleRunResult | null>(null)
  const [toolMessage, setToolMessage] = useState<string | null>(null)

  async function loadToolModules() {
    if (!window.pastelFlow) {
      return
    }

    try {
      const tools = await window.pastelFlow.tools.list()
      setToolModules(tools)
      setSelectedToolId((currentToolId) => currentToolId ?? tools[0]?.id ?? null)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  function selectTool(tool: RegisteredToolModule) {
    setSelectedToolId(tool.id)
    setToolRunResult(null)
    setToolMessage(null)
    setToolInputValues(createToolInputDefaults(tool))
  }

  async function handleRegisterToolModule() {
    if (!window.pastelFlow) {
      return
    }

    try {
      setErrorMessage(null)
      setToolMessage(null)
      const registeredTool = await window.pastelFlow.tools.registerFolder()
      if (!registeredTool) {
        return
      }

      await loadToolModules()
      setSelectedToolId(registeredTool.id)
      setToolRunResult(null)
      setToolInputValues(createToolInputDefaults(registeredTool))
      setToolMessage(`${registeredTool.manifest.name} 도구를 등록했습니다.`)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleRunToolModule() {
    if (!window.pastelFlow || !selectedToolId) {
      return
    }

    try {
      setErrorMessage(null)
      setToolMessage(null)
      const result = await window.pastelFlow.tools.run(
        selectedToolId,
        toolInputValues,
      )
      setToolRunResult(result)
      setToolMessage('도구 실행을 완료했습니다.')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleCreateToolAction() {
    if (!window.pastelFlow || !selectedToolId) {
      return
    }

    try {
      setErrorMessage(null)
      setToolMessage(null)
      const action = await window.pastelFlow.tools.createAction(selectedToolId)
      setToolMessage(`${action.name} Action을 생성했습니다.`)
      await loadActionWorkflowData()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  return {
    selectedToolId,
    toolInputValues,
    toolMessage,
    toolModules,
    toolRunResult,
    handleCreateToolAction,
    handleRegisterToolModule,
    handleRunToolModule,
    loadToolModules,
    selectTool,
    setSelectedToolId,
    setToolInputValues,
    setToolMessage,
    setToolRunResult,
  }
}
