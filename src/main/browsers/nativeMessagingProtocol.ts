import { z } from 'zod'
import { browserBridgeCommandSchema } from './browserBridgeSchemas'

export const nativeMessagingHostName = 'com.pastelflow.browser_bridge'

export const nativeMessagingRequestSchema = z.object({
  id: z.string().min(1),
  command: browserBridgeCommandSchema,
})

export const nativeMessagingResponseSchema = z.discriminatedUnion('ok', [
  z.object({
    id: z.string().min(1),
    ok: z.literal(true),
    result: z.unknown(),
  }),
  z.object({
    id: z.string().min(1),
    ok: z.literal(false),
    error: z.string(),
  }),
])

export type NativeMessagingRequest = z.infer<
  typeof nativeMessagingRequestSchema
>

export type NativeMessagingResponse = z.infer<
  typeof nativeMessagingResponseSchema
>

export function encodeNativeMessagingPayload(value: unknown): Buffer {
  const body = Buffer.from(JSON.stringify(value), 'utf8')
  const header = Buffer.alloc(4)
  header.writeUInt32LE(body.length, 0)
  return Buffer.concat([header, body])
}

export function decodeNativeMessagingPayload(buffer: Buffer): unknown {
  if (buffer.length < 4) {
    throw new Error('Native messaging payload header is incomplete.')
  }

  const bodyLength = buffer.readUInt32LE(0)
  const body = buffer.subarray(4, 4 + bodyLength)

  if (body.length !== bodyLength) {
    throw new Error('Native messaging payload body is incomplete.')
  }

  return JSON.parse(body.toString('utf8')) as unknown
}
