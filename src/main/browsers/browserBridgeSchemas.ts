import { z } from 'zod'

export const browserBridgeCommandSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('ping'),
  }),
  z.object({
    type: z.literal('ensureGroup'),
    browserGroupId: z.string().min(1),
    initialUrls: z.array(z.string()),
  }),
  z.object({
    type: z.literal('snapshotGroup'),
    browserGroupId: z.string().min(1),
  }),
  z.object({
    type: z.literal('closeGroup'),
    browserGroupId: z.string().min(1),
  }),
])

export type BrowserBridgeCommand = z.infer<typeof browserBridgeCommandSchema>

const browserTabSnapshotSchema = z.object({
  id: z.number().optional(),
  windowId: z.number(),
  index: z.number(),
  url: z.string(),
  title: z.string().optional(),
  groupId: z.number().optional(),
  active: z.boolean(),
  pinned: z.boolean(),
})

const browserTabGroupSnapshotSchema = z.object({
  id: z.number(),
  windowId: z.number(),
  title: z.string().optional(),
  color: z.enum([
    'grey',
    'blue',
    'red',
    'yellow',
    'green',
    'pink',
    'purple',
    'cyan',
    'orange',
  ]),
  collapsed: z.boolean(),
})

export const browserTabGroupStateSnapshotSchema = z.object({
  capturedAt: z.string(),
  tabs: z.array(browserTabSnapshotSchema),
  groups: z.array(browserTabGroupSnapshotSchema),
})

export const browserBridgePingResultSchema = z.object({
  ok: z.literal(true),
  version: z.string(),
})
