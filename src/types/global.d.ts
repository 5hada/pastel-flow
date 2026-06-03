import type { PastelFlowApi } from '../renderer/shared/api'

declare global {
  interface Window {
    pastelFlow?: PastelFlowApi
  }
}

export {}
