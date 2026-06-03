import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
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
): Promise<NativeMessagingHostAssets> {
  const hostDirectory = path.join(dataDir, 'browser-native-messaging')
  const hostScriptPath = path.join(hostDirectory, 'pastel-flow-browser-host.mjs')
  const windowsLauncherPath = path.join(hostDirectory, 'pastel-flow-browser-host.cmd')
  const manifestPath = path.join(hostDirectory, `${nativeMessagingHostName}.json`)
  const allowedOrigins = [`chrome-extension://${browserExtensionId}/`]

  await mkdir(hostDirectory, { recursive: true })
  await Promise.all([
    writeFile(hostScriptPath, nativeHostScript.trimStart(), 'utf8'),
    writeFile(
      windowsLauncherPath,
      createWindowsLauncherScript(hostScriptPath),
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

function createWindowsLauncherScript(hostScriptPath: string): string {
  return [
    '@echo off',
    'setlocal',
    `node "${hostScriptPath}"`,
    '',
  ].join('\r\n')
}

const nativeHostScript = `
import { stdin, stdout } from 'node:process'

let buffer = Buffer.alloc(0)

stdin.on('data', (chunk) => {
  buffer = Buffer.concat([buffer, chunk])
  readMessages()
})

function readMessages() {
  while (buffer.length >= 4) {
    const bodyLength = buffer.readUInt32LE(0)
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
    const request = JSON.parse(rawMessage.toString('utf8'))
    writeMessage({
      id: request.id || 'unknown',
      ok: true,
      result: {
        ok: true,
        version: '0.1.0',
        transport: 'native-messaging',
      },
    })
  } catch (error) {
    writeMessage({
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
`
