import type { PastelFlowApi } from '../api/tasksApi'

declare global {
  interface Window {
    pastelFlow?: PastelFlowApi
  }
}

export {}
