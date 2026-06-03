import { spawn } from 'node:child_process'
import { nativeMessagingHostName } from './nativeMessagingProtocol'

export type NativeMessagingBrowserKind = 'chrome' | 'edge'

export type NativeMessagingRegistrationResult = {
  browserKind: NativeMessagingBrowserKind
  registryKey: string
  registered: boolean
  error?: string
}

const windowsRegistryRoots: Record<NativeMessagingBrowserKind, string> = {
  chrome: 'HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts',
  edge: 'HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts',
}

export async function ensureNativeMessagingHostRegistration(
  manifestPath: string,
): Promise<NativeMessagingRegistrationResult[]> {
  if (process.platform !== 'win32') {
    return []
  }

  return Promise.all(
    (Object.keys(windowsRegistryRoots) as NativeMessagingBrowserKind[]).map(
      async (browserKind) => {
        const registryKey = getWindowsRegistryKey(browserKind)

        try {
          await runRegCommand([
            'add',
            registryKey,
            '/ve',
            '/t',
            'REG_SZ',
            '/d',
            manifestPath,
            '/f',
          ])

          return {
            browserKind,
            registryKey,
            registered: true,
          }
        } catch (error) {
          return {
            browserKind,
            registryKey,
            registered: false,
            error:
              error instanceof Error
                ? error.message
                : 'Native messaging registry registration failed.',
          }
        }
      },
    ),
  )
}

export async function removeNativeMessagingHostRegistration(): Promise<void> {
  if (process.platform !== 'win32') {
    return
  }

  await Promise.all(
    (Object.keys(windowsRegistryRoots) as NativeMessagingBrowserKind[]).map(
      (browserKind) =>
        runRegCommand(['delete', getWindowsRegistryKey(browserKind), '/f']).catch(
          () => undefined,
        ),
    ),
  )
}

function getWindowsRegistryKey(browserKind: NativeMessagingBrowserKind): string {
  return `${windowsRegistryRoots[browserKind]}\\${nativeMessagingHostName}`
}

function runRegCommand(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('reg.exe', args, {
      windowsHide: true,
    })
    let stderr = ''

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(stderr.trim() || `reg.exe exited with code ${code}`))
    })
  })
}
