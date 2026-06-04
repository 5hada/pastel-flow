import CDP from 'chrome-remote-interface'

export type DevToolsTarget = {
  type?: string
  url?: string
  webSocketDebuggerUrl?: string
}

export async function readDevToolsTargets(
  port: number,
): Promise<DevToolsTarget[]> {
  try {
    return await CDP.List({
      host: '127.0.0.1',
      port,
    })
  } catch {
    return []
  }
}

export async function evaluateDevToolsExpression(
  webSocketUrl: string,
  expression: string,
): Promise<unknown> {
  const client = await CDP({
    target: webSocketUrl,
  })

  try {
    const response = await client.Runtime.evaluate({
      awaitPromise: true,
      expression,
      returnByValue: true,
    })

    if (response.exceptionDetails) {
      throw new Error('DevTools Runtime.evaluate 실행 중 오류가 발생했습니다.')
    }

    return response.result.value
  } finally {
    await client.close()
  }
}

export async function createDevToolsTarget(
  port: number,
  url: string,
): Promise<string | undefined> {
  const client = await CDP({
    host: '127.0.0.1',
    port,
  })

  try {
    const response = await client.Target.createTarget({ url }) as {
      targetId?: string
    }
    return response.targetId
  } finally {
    await client.close()
  }
}

export async function closeDevToolsTarget(
  port: number,
  targetId: string,
): Promise<void> {
  const client = await CDP({
    host: '127.0.0.1',
    port,
  })

  try {
    await (client.Target as unknown as {
      closeTarget(params: { targetId: string }): Promise<unknown>
    }).closeTarget({ targetId })
  } finally {
    await client.close()
  }
}
