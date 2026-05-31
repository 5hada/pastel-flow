import { randomBytes } from 'node:crypto'
import { createConnection } from 'node:net'

export type DevToolsTarget = {
  type?: string
  url?: string
  webSocketDebuggerUrl?: string
}

export async function readDevToolsTargets(
  port: number,
): Promise<DevToolsTarget[]> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/list`)

    if (!response.ok) {
      return []
    }

    return (await response.json()) as DevToolsTarget[]
  } catch {
    return []
  }
}

export async function evaluateDevToolsExpression(
  webSocketUrl: string,
  expression: string,
): Promise<unknown> {
  const client = await connectDevToolsWebSocket(webSocketUrl)

  try {
    const response = await client.request({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        awaitPromise: true,
        expression,
        returnByValue: true,
      },
    })

    if (response.result?.exceptionDetails) {
      throw new Error('DevTools Runtime.evaluate 실행 중 오류가 발생했습니다.')
    }

    return response.result?.result?.value
  } finally {
    client.close()
  }
}

type DevToolsWebSocketClient = {
  request(message: DevToolsRequest): Promise<DevToolsResponse>
  close(): void
}

type DevToolsRequest = {
  id: number
  method: string
  params?: Record<string, unknown>
}

type DevToolsResponse = {
  id?: number
  result?: {
    exceptionDetails?: unknown
    result?: {
      value?: unknown
    }
  }
}

async function connectDevToolsWebSocket(
  webSocketUrl: string,
): Promise<DevToolsWebSocketClient> {
  const url = new URL(webSocketUrl)
  const socket = createConnection({
    host: url.hostname,
    port: Number(url.port),
  })
  const acceptKey = randomBytes(16).toString('base64')
  let readBuffer: Buffer<ArrayBufferLike> = Buffer.alloc(0)

  await new Promise<void>((resolve, reject) => {
    socket.once('error', reject)
    socket.once('connect', () => {
      socket.write(
        [
          `GET ${url.pathname}${url.search} HTTP/1.1`,
          `Host: ${url.host}`,
          'Upgrade: websocket',
          'Connection: Upgrade',
          `Sec-WebSocket-Key: ${acceptKey}`,
          'Sec-WebSocket-Version: 13',
          '\r\n',
        ].join('\r\n'),
      )
    })
    socket.once('data', (chunk) => {
      readBuffer = Buffer.concat([readBuffer, chunk])
      const headerEnd = readBuffer.indexOf('\r\n\r\n')

      if (headerEnd === -1) {
        reject(new Error('DevTools WebSocket handshake failed.'))
        return
      }

      const header = readBuffer.subarray(0, headerEnd).toString('utf8')
      if (!header.includes(' 101 ')) {
        reject(new Error('DevTools WebSocket upgrade was rejected.'))
        return
      }

      readBuffer = readBuffer.subarray(headerEnd + 4)
      resolve()
    })
  })

  return {
    request(message) {
      socket.write(encodeWebSocketFrame(JSON.stringify(message)))

      return new Promise((resolve, reject) => {
        const handleData = (chunk: Buffer) => {
          readBuffer = Buffer.concat([readBuffer, chunk])
          const decodedFrame = decodeWebSocketFrame(readBuffer)

          if (!decodedFrame) {
            return
          }

          readBuffer = decodedFrame.remaining
          socket.off('error', reject)
          socket.off('data', handleData)
          resolve(JSON.parse(decodedFrame.payload.toString('utf8')))
        }

        socket.on('data', handleData)
        socket.once('error', reject)
      })
    },
    close() {
      socket.end()
    },
  }
}

function encodeWebSocketFrame(payloadText: string): Buffer {
  const payload = Buffer.from(payloadText)
  const mask = randomBytes(4)
  const headerLength = payload.length < 126 ? 6 : 8
  const frame = Buffer.alloc(headerLength + payload.length)

  frame[0] = 0x81
  if (payload.length < 126) {
    frame[1] = 0x80 | payload.length
    mask.copy(frame, 2)
  } else {
    frame[1] = 0x80 | 126
    frame.writeUInt16BE(payload.length, 2)
    mask.copy(frame, 4)
  }

  const payloadOffset = headerLength
  for (let index = 0; index < payload.length; index += 1) {
    frame[payloadOffset + index] = payload[index] ^ mask[index % 4]
  }

  return frame
}

function decodeWebSocketFrame(
  buffer: Buffer<ArrayBufferLike>,
): {
  payload: Buffer<ArrayBufferLike>
  remaining: Buffer<ArrayBufferLike>
} | null {
  if (buffer.length < 2) {
    return null
  }

  const opcode = buffer[0] & 0x0f
  if (opcode === 0x8) {
    throw new Error('DevTools WebSocket was closed.')
  }

  const payloadLengthIndicator = buffer[1] & 0x7f
  const payloadOffset = payloadLengthIndicator === 126 ? 4 : 2
  const payloadLength =
    payloadLengthIndicator === 126
      ? buffer.readUInt16BE(2)
      : payloadLengthIndicator

  if (buffer.length < payloadOffset + payloadLength) {
    return null
  }

  return {
    payload: buffer.subarray(payloadOffset, payloadOffset + payloadLength),
    remaining: buffer.subarray(payloadOffset + payloadLength),
  }
}
