import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { BrowserNativeBridgeBrokerConnection } from './browserNativeBridgeBroker'
import { nativeMessagingHostName } from './nativeMessagingProtocol'
import {
  ensureNativeMessagingHostRegistration,
  type NativeMessagingRegistrationResult,
} from './browserNativeMessagingRegistry'

export const browserExtensionPublicKey =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAlCX95HItWhCd7SfJ/GxY0i0dwtN7tj+9jRAjVTAPHzplCnnhMUKXWWcJWk3/1Arfxv5xye6nDSKWzMRgFvhzE9LKxBXWgdTyL1NgJHi3w37WaVxIf38XIR1F3RjxnMDhjy2VWqHEktmRvlcBCcO1CVgoHq1rz/AS2/TWteGS4K8FJdRXnlJEP6zqnm3Xodc51ojKCKnQqsUEvTq14/LibtXKUz+X/Gvzup1RTUMvN6QDVRyQ9kjUiDlAj9tgvTmqJ9oa7K0qvxKae4qsYQ6S1Lvu2WXdb+1W2jBA2x1a4jwqtnwcnQNFzZu4jeQBYe5QpbaEbsBmZzP5b8qQTjlGEQIDAQAB'

export const browserExtensionId = 'hoibifinkplnnlanagfmbdilpiedcnfc'

export type NativeMessagingHostAssets = {
  allowedOrigins: string[]
  hostName: string
  hostScriptPath: string
  manifestPath: string
  registrationResults: NativeMessagingRegistrationResult[]
  windowsLauncherPath: string
}

export async function ensureBrowserNativeMessagingHostAssets(
  dataDir: string,
  brokerConnection: BrowserNativeBridgeBrokerConnection,
): Promise<NativeMessagingHostAssets> {
  const hostDirectory = path.join(dataDir, 'browser-native-messaging')
  const hostScriptPath = path.join(hostDirectory, 'pastel-flow-browser-host.mjs')
  const windowsLauncherPath = path.join(hostDirectory, 'pastel-flow-browser-host.cmd')
  const manifestPath = path.join(hostDirectory, `${nativeMessagingHostName}.json`)
  const brokerConnectionPath = path.join(hostDirectory, 'broker-connection.json')
  const allowedOrigins = [`chrome-extension://${browserExtensionId}/`]

  await mkdir(hostDirectory, { recursive: true })
  await Promise.all([
    writeFile(hostScriptPath, nativeHostScript.trimStart(), 'utf8'),
    writeFile(
      brokerConnectionPath,
      `${JSON.stringify(brokerConnection, null, 2)}\n`,
      'utf8',
    ),
    writeFile(
      windowsLauncherPath,
      createWindowsLauncherScript(hostScriptPath, getNativeHostNodeExecutable()),
      'utf8',
    ),
    writeFile(
      manifestPath,
      `${JSON.stringify(
        createNativeHostManifest(windowsLauncherPath, allowedOrigins),
        null,
        2,
      )}\n`,
      'utf8',
    ),
  ])
  const registrationResults =
    await ensureNativeMessagingHostRegistration(manifestPath)

  return {
    allowedOrigins,
    hostName: nativeMessagingHostName,
    hostScriptPath,
    manifestPath,
    registrationResults,
    windowsLauncherPath,
  }
}

export function getNativeMessagingRegistrationHint(
  manifestPath: string,
): string {
  return [
    `Chrome HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${nativeMessagingHostName}`,
    `Edge HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts\\${nativeMessagingHostName}`,
    manifestPath,
  ].join('\n')
}

function createNativeHostManifest(hostPath: string, allowedOrigins: string[]) {
  return {
    name: nativeMessagingHostName,
    description: 'Pastel Flow browser bridge native messaging host.',
    path: hostPath,
    type: 'stdio',
    allowed_origins: allowedOrigins,
  }
}

function createWindowsLauncherScript(
  hostScriptPath: string,
  nodeExecutablePath: string,
): string {
  return [
    '@echo off',
    'setlocal',
    `"${nodeExecutablePath}" "${hostScriptPath}" %*`,
    '',
  ].join('\r\n')
}

function getNativeHostNodeExecutable(): string {
  const npmNodeExecutablePath = process.env['npm_node_execpath']
  if (npmNodeExecutablePath) {
    return npmNodeExecutablePath
  }

  return process.execPath.toLowerCase().includes('electron')
    ? 'node'
    : process.execPath
}

const nativeHostScript = `
import { readFile } from 'node:fs/promises'
import net from 'node:net'
import { argv, exit, stdin, stdout } from 'node:process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const MAX_MESSAGE_BYTES = 1024 * 1024
const BROKER_RECONNECT_MS = 500
const HOST_DIR = path.dirname(fileURLToPath(import.meta.url))
const BROKER_CONNECTION_PATH = path.join(HOST_DIR, 'broker-connection.json')
const EXPECTED_EXTENSION_ORIGIN = ${JSON.stringify(`chrome-extension://${browserExtensionId}/`)}

let buffer = Buffer.alloc(0)
let brokerSocket
let brokerBuffer = ''
let reconnectTimer

assertAllowedOrigin()
connectBroker()

stdin.on('data', (chunk) => {
  if (buffer.length + chunk.length > MAX_MESSAGE_BYTES + 4) {
    failAndExit('Native messaging payload is too large.')
    return
  }

  buffer = Buffer.concat([buffer, chunk])
  readMessages()
})

function readMessages() {
  while (buffer.length >= 4) {
    const bodyLength = buffer.readUInt32LE(0)
    if (bodyLength > MAX_MESSAGE_BYTES) {
      failAndExit('Native messaging payload is too large.')
      return
    }

    if (buffer.length < 4 + bodyLength) {
      return
    }

    const rawMessage = buffer.subarray(4, 4 + bodyLength)
    buffer = buffer.subarray(4 + bodyLength)
    handleMessage(rawMessage)
  }
}

function handleMessage(rawMessage) {
  try {
    writeBrokerLine(JSON.parse(rawMessage.toString('utf8')))
  } catch (error) {
    writeBrokerLine({
      id: 'unknown',
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown native host error.',
    })
  }
}

function writeMessage(message) {
  const body = Buffer.from(JSON.stringify(message), 'utf8')
  const header = Buffer.alloc(4)
  header.writeUInt32LE(body.length, 0)
  stdout.write(Buffer.concat([header, body]))
}

function failAndExit(error) {
  writeMessage({
    id: 'unknown',
    ok: false,
    error,
  })
  exit(1)
}

async function connectBroker() {
  try {
    const connection = JSON.parse(
      await readFile(BROKER_CONNECTION_PATH, 'utf8'),
    )
    const socket = net.createConnection({
      host: '127.0.0.1',
      port: connection.port,
    })
    brokerSocket = socket
    socket.setEncoding('utf8')
    socket.on('connect', () => {
      writeBrokerLine({
        hello: 'pastel-flow-browser-host',
        token: connection.token,
      })
    })
    socket.on('data', (chunk) => {
      brokerBuffer += chunk
      const lines = brokerBuffer.split('\\n')
      brokerBuffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) {
          continue
        }

        try {
          writeMessage(JSON.parse(line))
        } catch (error) {
          writeBrokerLine({
            id: 'unknown',
            ok: false,
            error: error instanceof Error ? error.message : 'Invalid broker message.',
          })
        }
      }
    })
    socket.on('close', scheduleBrokerReconnect)
    socket.on('error', scheduleBrokerReconnect)
  } catch {
    scheduleBrokerReconnect()
  }
}

function scheduleBrokerReconnect() {
  if (reconnectTimer) {
    return
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined
    brokerSocket = undefined
    connectBroker()
  }, BROKER_RECONNECT_MS)
}

function writeBrokerLine(message) {
  if (!brokerSocket || brokerSocket.destroyed) {
    return
  }

  brokerSocket.write(JSON.stringify(message) + '\\n')
}

function assertAllowedOrigin() {
  const callerOrigin = argv.find((argument) => argument.startsWith('chrome-extension://'))
  if (callerOrigin !== EXPECTED_EXTENSION_ORIGIN) {
    failAndExit('Native messaging caller origin is not allowed.')
  }
}
`
