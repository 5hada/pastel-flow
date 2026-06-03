declare module 'chrome-remote-interface' {
  export type ListOptions = {
    host?: string
    port?: number
  }

  export type ClientOptions = {
    target?: string
    host?: string
    port?: number
  }

  export type Target = {
    type?: string
    url?: string
    webSocketDebuggerUrl?: string
  }

  export type RuntimeEvaluateParams = {
    awaitPromise?: boolean
    expression: string
    returnByValue?: boolean
  }

  export type RuntimeEvaluateResponse = {
    exceptionDetails?: unknown
    result: {
      value?: unknown
    }
  }

  export type Client = {
    Runtime: {
      evaluate(
        params: RuntimeEvaluateParams,
      ): Promise<RuntimeEvaluateResponse>
    }
    Target: {
      createTarget(params: { url: string }): Promise<unknown>
    }
    close(): Promise<void>
  }

  export type ChromeRemoteInterface = {
    (options: ClientOptions): Promise<Client>
    List(options: ListOptions): Promise<Target[]>
  }

  const CDP: ChromeRemoteInterface
  export default CDP
}
