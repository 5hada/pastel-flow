import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

export type AtomicJsonFile<TValue> = {
  read(): Promise<TValue>
  write(value: TValue): Promise<void>
  update<TResult>(
    updater: (currentValue: TValue) => Promise<{
      nextValue: TValue
      result: TResult
    }> | {
      nextValue: TValue
      result: TResult
    },
  ): Promise<TResult>
}

export type AtomicJsonFileOptions<TValue> = {
  filePath: string
  defaultValue(): TValue
  normalize(value: unknown): TValue
  createMissingFile?: boolean
  resetEmptyFile?: boolean
  resetInvalidJson?: boolean
}

export function createAtomicJsonFile<TValue>({
  defaultValue,
  filePath,
  normalize,
  createMissingFile = false,
  resetEmptyFile = false,
  resetInvalidJson = false,
}: AtomicJsonFileOptions<TValue>): AtomicJsonFile<TValue> {
  let writeQueue = Promise.resolve()

  async function read(): Promise<TValue> {
    try {
      const raw = await readFile(filePath, 'utf8')
      if (!raw.trim() && resetEmptyFile) {
        const value = defaultValue()
        await write(value)
        return value
      }

      return normalize(JSON.parse(raw))
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        const value = defaultValue()
        if (createMissingFile) {
          await write(value)
        }
        return value
      }

      if (error instanceof SyntaxError && resetInvalidJson) {
        const value = defaultValue()
        await write(value)
        return value
      }

      throw error
    }
  }

  async function write(value: TValue): Promise<void> {
    const normalizedValue = normalize(value)
    const tempFilePath = `${filePath}.${randomUUID()}.tmp`

    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(
      tempFilePath,
      `${JSON.stringify(normalizedValue, null, 2)}\n`,
      'utf8',
    )
    await rename(tempFilePath, filePath)
  }

  return {
    read,
    write(value) {
      writeQueue = writeQueue.then(() => write(value))
      return writeQueue
    },
    update(updater) {
      const nextWrite = writeQueue.then(async () => {
        const currentValue = await read()
        const { nextValue, result } = await updater(currentValue)
        await write(nextValue)
        return result
      })
      writeQueue = nextWrite.then(() => undefined)
      return nextWrite
    },
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}
