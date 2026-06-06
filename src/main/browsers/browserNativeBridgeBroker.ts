import { randomUUID, timingSafeEqual } from 'node:crypto'
import { createServer, type Server, type Socket } from 'node:net'
import {
  browserBridgeEventSchema,
  type BrowserBridgeCommand,
  type BrowserBridgeEvent,
} from './browserBridgeSchemas'

export type BrowserNativeBridgeBrokerConnection = {
  port: number
  token: string
}

export type BrowserNativeBridgeBroker = {
  connection: BrowserNativeBridgeBrokerConnection
  dispatch(command: BrowserBridgeCommand): Promise<unknown>
  hasClient(): boolean
  onClientDisconnected(listener: () => void): () => void
  onEvent(listener: (event: BrowserBridgeEvent) => void): () => void
  dispose(): void
}

type PendingRequest = {
  reject(error: Error): void
  resolve(value: unknown): void
  timeoutId: ReturnType<typeof setTimeout>
}

type ClientWaiter = {
  notify(): void
  reject(error: Error): void
}

const maxBrokerLineBytes = 1024 * 1024
const bridgeConnectionTimeoutMs = 15000
const bridgeResponseTimeoutMs = 15000

export async function createBrowserNativeBridgeBroker(): Promise<BrowserNativeBridgeBroker> {
  const token = randomUUID()
  const server = createServer()
  const pendingRequests = new Map<string, PendingRequest>()
  const waiters = new Set<ClientWaiter>()
  const disconnectListeners = new Set<() => void>()
  const eventListeners = new Set<(event: BrowserBridgeEvent) => void>()
  let client: Socket | null = null
  let disposed = false

  server.on('connection', (socket) => {
    if (!isLoopbackAddress(socket.remoteAddress)) {
      socket.destroy()
      return
    }

    let authenticated = false
    let buffer = ''

    socket.setEncoding('utf8')
    socket.on('data', (chunk) => {
      buffer += chunk
      if (Buffer.byteLength(buffer, 'utf8') > maxBrokerLineBytes) {
        socket.destroy()
        return
      }

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.trim()) {
          continue
        }

        const message = parseBrokerMessage(line)
        if (!authenticated) {
          authenticated = authenticateBrokerClient(message, token)
          if (!authenticated) {
            socket.destroy()
            return
          }

          if (client && client !== socket) {
            rejectPendingRequests(
              pendingRequests,
              '브라우저 확장 제어 연결이 새 연결로 교체되었습니다.',
            )
            client.destroy()
          }
          client = socket
          notifyWaiters(waiters)
          continue
        }

        if (emitBrokerEvent(eventListeners, message)) {
          continue
        }

        settlePendingRequest(pendingRequests, message)
      }
    })
    socket.on('close', () => {
      if (client === socket) {
        client = null
        rejectPendingRequests(
          pendingRequests,
          '브라우저 확장 제어 연결이 끊겼습니다.',
        )
        notifyDisconnectListeners(disconnectListeners)
      }
    })
    socket.on('error', () => undefined)
  })

  const port = await listen(server)

  return {
    connection: {
      port,
      token,
    },
    async dispatch(command) {
      if (disposed) {
        throw new Error('브라우저 확장 제어 broker가 종료되었습니다.')
      }

      const activeClient = await waitForClient({
        getClient: () => client,
        timeoutMs: bridgeConnectionTimeoutMs,
        waiters,
      })
      const id = randomUUID()

      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          pendingRequests.delete(id)
          client?.destroy()
          reject(
            new Error(
              `브라우저 확장 제어 응답 시간이 초과되었습니다: ${command.type}`,
            ),
          )
        }, bridgeResponseTimeoutMs)

        pendingRequests.set(id, {
          reject,
          resolve,
          timeoutId,
        })
        activeClient.write(`${JSON.stringify({ id, command })}\n`, (error) => {
          if (!error) {
            return
          }

          clearTimeout(timeoutId)
          pendingRequests.delete(id)
          reject(error)
        })
      })
    },
    hasClient() {
      return Boolean(client && !client.destroyed && client.writable)
    },
    onClientDisconnected(listener) {
      disconnectListeners.add(listener)

      return () => {
        disconnectListeners.delete(listener)
      }
    },
    onEvent(listener) {
      eventListeners.add(listener)

      return () => {
        eventListeners.delete(listener)
      }
    },
    dispose() {
      disposed = true
      client?.destroy()
      server.close()
      rejectClientWaiters(
        waiters,
        '브라우저 확장 제어 broker가 종료되었습니다.',
      )
      disconnectListeners.clear()
      eventListeners.clear()
      rejectPendingRequests(
        pendingRequests,
        '브라우저 확장 제어 broker가 종료되었습니다.',
      )
    },
  }
}

function emitBrokerEvent(
  listeners: Set<(event: BrowserBridgeEvent) => void>,
  message: unknown,
): boolean {
  const candidate = message as { event?: unknown; type?: unknown }
  if (candidate.type !== 'pastelFlow:event') {
    return false
  }

  const parsedEvent = browserBridgeEventSchema.safeParse(candidate.event)
  if (!parsedEvent.success) {
    return true
  }

  listeners.forEach((listener) => listener(parsedEvent.data))
  return true
}

function parseBrokerMessage(line: string): unknown {
  try {
    return JSON.parse(line) as unknown
  } catch {
    return undefined
  }
}

function authenticateBrokerClient(message: unknown, token: string): boolean {
  const candidate = message as { hello?: unknown; token?: unknown }
  if (
    candidate.hello !== 'pastel-flow-browser-host' ||
    typeof candidate.token !== 'string'
  ) {
    return false
  }

  return timingSafeStringEqual(candidate.token, token)
}

function settlePendingRequest(
  pendingRequests: Map<string, PendingRequest>,
  message: unknown,
): void {
  const response = message as {
    id?: unknown
    ok?: unknown
    result?: unknown
    error?: unknown
  }
  if (typeof response.id !== 'string') {
    return
  }

  const pendingRequest = pendingRequests.get(response.id)
  if (!pendingRequest) {
    return
  }

  clearTimeout(pendingRequest.timeoutId)
  pendingRequests.delete(response.id)

  if (response.ok === true) {
    pendingRequest.resolve(response.result)
    return
  }

  pendingRequest.reject(
    new Error(
      typeof response.error === 'string'
        ? response.error
        : '브라우저 확장 제어 명령이 실패했습니다.',
    ),
  )
}

function rejectPendingRequests(
  pendingRequests: Map<string, PendingRequest>,
  message: string,
): void {
  pendingRequests.forEach((pendingRequest) => {
    clearTimeout(pendingRequest.timeoutId)
    pendingRequest.reject(new Error(message))
  })
  pendingRequests.clear()
}

async function waitForClient({
  getClient,
  timeoutMs,
  waiters,
}: {
  getClient(): Socket | null
  timeoutMs: number
  waiters: Set<ClientWaiter>
}): Promise<Socket> {
  const existingClient = getWritableClient(getClient())
  if (existingClient) {
    return existingClient
  }

  return new Promise((resolve, reject) => {
    const waiter: ClientWaiter = {
      notify: () => onClient(),
      reject(error) {
        clearTimeout(timeoutId)
        waiters.delete(waiter)
        reject(error)
      },
    }
    const timeoutId = setTimeout(() => {
      waiters.delete(waiter)
      reject(
        new Error(
          [
            '브라우저 확장 제어 연결을 찾지 못했습니다.',
            'Pastel Flow Browser Bridge 확장 프로그램이 설치 및 활성화되어 있고 브라우저가 실행 중인지 확인하세요.',
          ].join('\n'),
        ),
      )
    }, timeoutMs)

    function onClient() {
      const client = getWritableClient(getClient())
      if (!client) {
        return
      }

      clearTimeout(timeoutId)
      waiters.delete(waiter)
      resolve(client)
    }

    waiters.add(waiter)
  })
}

function getWritableClient(client: Socket | null): Socket | null {
  return client && !client.destroyed && client.writable ? client : null
}

function isLoopbackAddress(address: string | undefined): boolean {
  return (
    address === '127.0.0.1' ||
    address === '::1' ||
    address === '::ffff:127.0.0.1'
  )
}

function timingSafeStringEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  )
}

function notifyWaiters(waiters: Set<ClientWaiter>): void {
  waiters.forEach((waiter) => waiter.notify())
}

function notifyDisconnectListeners(listeners: Set<() => void>): void {
  listeners.forEach((listener) => listener())
}

function rejectClientWaiters(waiters: Set<ClientWaiter>, message: string): void {
  waiters.forEach((waiter) => {
    waiter.reject(new Error(message))
  })
  waiters.clear()
}

function listen(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (typeof address === 'object' && address?.port) {
        resolve(address.port)
        return
      }

      reject(new Error('브라우저 확장 제어 broker 포트를 할당하지 못했습니다.'))
    })
  })
}
