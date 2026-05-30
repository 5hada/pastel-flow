import type { AppSettings } from '../../../shared/settings'
import type { CurrentDevice, LinkedDevice } from '../../../shared/devices'
import {
  createDefaultBrowserTabGroupConfig,
  normalizeBrowserTabGroupConfig,
  normalizeDevicePolicy,
  type BrowserTabGroupConfig,
  type CrawlerConfig,
  type DevicePolicy,
  type DiscordBotConfig,
  type NotionSyncConfig,
  type SecretRef,
  type TaskSchedule,
  type TaskTemplate,
  type TradingBotConfig,
} from '../../../shared/tasks'
import type { BrowserTaskFormState } from '../taskFormState'

export function parseInitialUrls(value: string): string[] {
  return parseLines(value)
}

export function parseLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export function parseDaysOfWeek(value: string): TaskSchedule['daysOfWeek'] {
  const days = value
    .split(/[,\r\n]+/)
    .map((item) => Number(item.trim()))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)

  return days.length > 0
    ? ([...new Set(days)] as TaskSchedule['daysOfWeek'])
    : undefined
}

export function createTaskConfigFromForm(
  form: BrowserTaskFormState,
  existingTask?: TaskTemplate,
):
  | BrowserTabGroupConfig
  | CrawlerConfig
  | DiscordBotConfig
  | NotionSyncConfig
  | TradingBotConfig {
  switch (form.taskType) {
    case 'browser_tab_group': {
      const currentConfig =
        existingTask?.type === 'browser_tab_group'
          ? normalizeBrowserTabGroupConfig(
              existingTask.config as Partial<BrowserTabGroupConfig>,
            )
          : createDefaultBrowserTabGroupConfig(`browser-${crypto.randomUUID()}`)
      return {
        ...currentConfig,
        browserKind: form.browserKind,
        runMode: form.runMode,
        profileSource: form.profileSource,
        existingProfilePath: form.existingProfilePath.trim() || undefined,
        initialUrls: parseInitialUrls(form.initialUrls),
        dynamicTemplateUpdates: form.dynamicTemplateUpdates,
      }
    }
    case 'crawler':
      return {
        urls: parseInitialUrls(form.crawlerUrls),
        maxBytes: normalizeCrawlerMaxBytes(form.crawlerMaxBytes),
      }
    case 'discord_bot':
      return {
        dryRun: true,
        commandPrefix: form.discordCommandPrefix.trim() || undefined,
      }
    case 'notion_sync':
      return {
        dryRun: true,
        databaseId: form.notionDatabaseId.trim() || undefined,
      }
    case 'trading_bot':
      return {
        dryRun: true,
        exchange: form.tradingExchange.trim() || undefined,
        symbol: form.tradingSymbol.trim() || undefined,
      }
  }
}

export function normalizeCrawlerConfig(config: unknown): CrawlerConfig {
  const candidate = config as Partial<CrawlerConfig>
  return {
    urls: Array.isArray(candidate?.urls)
      ? candidate.urls
          .map((url) => (typeof url === 'string' ? url.trim() : ''))
          .filter(Boolean)
      : [],
    maxBytes: normalizeCrawlerMaxBytes(candidate?.maxBytes),
  }
}

function normalizeCrawlerMaxBytes(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(Math.max(Math.round(value), 1024), 500000)
    : 50000
}

export function createDevicePolicyFromForm(
  form: BrowserTaskFormState,
  currentDevice: CurrentDevice,
): DevicePolicy {
  const allowedDeviceIds = parseLines(form.allowedDeviceIds)
  const secretRefs = parseLines(form.secretRefIds).map(
    (secretId): SecretRef => ({
      id: secretId,
      scope: 'local_device',
    }),
  )
  const shouldUseCurrentDevice =
    allowedDeviceIds.length === 0 &&
    (form.visibility === 'local_only' || form.execution === 'local_only') &&
    currentDevice.id

  return normalizeDevicePolicy({
    visibility: form.visibility,
    execution: form.execution,
    allowedDeviceIds: shouldUseCurrentDevice
      ? [currentDevice.id]
      : allowedDeviceIds,
    secretRefs,
  })
}

export function createTaskScheduleFromForm(
  form: BrowserTaskFormState,
): TaskSchedule | undefined {
  if (!form.scheduleEnabled) {
    return undefined
  }

  const intervalMinutes = Math.min(
    Math.max(Math.round(form.scheduleIntervalMinutes), 1),
    10080,
  )
  const scheduleMode = form.scheduleMode

  return {
    enabled: true,
    mode: scheduleMode,
    intervalMinutes,
    timeOfDay:
      scheduleMode === 'daily' || scheduleMode === 'weekly'
        ? form.scheduleTimeOfDay
        : undefined,
    daysOfWeek:
      scheduleMode === 'weekly'
        ? parseDaysOfWeek(form.scheduleDaysOfWeek)
        : undefined,
    nextRunAt: getInitialScheduleRunAt({
      enabled: true,
      mode: scheduleMode,
      intervalMinutes,
      timeOfDay: form.scheduleTimeOfDay,
      daysOfWeek: parseDaysOfWeek(form.scheduleDaysOfWeek),
    }),
  }
}

function getInitialScheduleRunAt(schedule: TaskSchedule): string {
  const now = new Date()

  switch (schedule.mode) {
    case 'daily':
      return getNextWallClockRunAt(now, schedule.timeOfDay, [
        0, 1, 2, 3, 4, 5, 6,
      ])
    case 'weekly':
      return getNextWallClockRunAt(now, schedule.timeOfDay, schedule.daysOfWeek)
    case 'interval':
      return new Date(
        now.getTime() + schedule.intervalMinutes * 60_000,
      ).toISOString()
  }
}

function getNextWallClockRunAt(
  date: Date,
  timeOfDay = '09:00',
  daysOfWeek: number[] | undefined,
): string {
  const allowedDays =
    daysOfWeek && daysOfWeek.length > 0
      ? new Set(daysOfWeek)
      : new Set([date.getDay()])
  const [hour, minute] = timeOfDay.split(':').map(Number)

  for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
    const candidate = new Date(date)
    candidate.setDate(date.getDate() + dayOffset)
    candidate.setHours(hour, minute, 0, 0)

    if (candidate <= date || !allowedDays.has(candidate.getDay())) {
      continue
    }

    return candidate.toISOString()
  }

  return new Date(date.getTime() + 24 * 60 * 60_000).toISOString()
}

export function isSettingsDirty(form: AppSettings, settings: AppSettings): boolean {
  return (
    form.themeMode !== settings.themeMode ||
    form.defaultBrowserKind !== settings.defaultBrowserKind ||
    form.defaultTaskName.trim() !== settings.defaultTaskName ||
    form.defaultActionName.trim() !== settings.defaultActionName ||
    form.defaultWorkflowName.trim() !== settings.defaultWorkflowName ||
    form.initialUrlInputMode !== settings.initialUrlInputMode ||
    form.taskListDisplayMode !== settings.taskListDisplayMode ||
    form.workflowGridColumnCount !== settings.workflowGridColumnCount ||
    form.taskRunEventRetentionLimit !== settings.taskRunEventRetentionLimit ||
    form.taskRunEventExportLimit !== settings.taskRunEventExportLimit ||
    normalizeSettingsPath(form.browserExecutablePaths.chrome) !==
      normalizeSettingsPath(settings.browserExecutablePaths.chrome) ||
    normalizeSettingsPath(form.browserExecutablePaths.edge) !==
      normalizeSettingsPath(settings.browserExecutablePaths.edge) ||
    normalizeSettingsPath(form.browserExecutablePaths.chromium) !==
      normalizeSettingsPath(settings.browserExecutablePaths.chromium) ||
    JSON.stringify(normalizeLinkedDeviceList(form.linkedDevices)) !==
      JSON.stringify(normalizeLinkedDeviceList(settings.linkedDevices))
  )
}

function normalizeSettingsPath(value: string | undefined): string {
  return value?.trim() ?? ''
}

export function createEmptyLinkedDevice(): LinkedDevice {
  return {
    id: '',
    name: '',
    accessLevel: 'visible',
  }
}

export function normalizeLinkedDeviceList(devices: LinkedDevice[]): LinkedDevice[] {
  return devices.map((device) => ({
    id: device.id.trim(),
    name: device.name.trim(),
    accessLevel: device.accessLevel,
  }))
}
