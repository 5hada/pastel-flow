import type {
  BrowserTabGroupColor,
  BrowserKind,
  BrowserTabGroupConfig,
  BrowserTabGroupSnapshot,
  BrowserTabGroupStateSnapshot,
  BrowserTabSnapshot,
  BrowserRunMode,
  BrowserProfileSource,
  DevicePolicy,
  DeviceExecutionPolicy,
  DeviceVisibilityPolicy,
  ActionDefinition,
  ActionType,
  RestorePolicy,
  DayOfWeek,
  TaskSchedule,
  TaskScheduleMode,
  TaskState,
  TaskTemplate,
  TaskType,
  WorkflowDefinition,
} from './types'

export const defaultDevicePolicy: DevicePolicy = {
  visibility: 'local_only',
  execution: 'local_only',
}

export const defaultTaskState: TaskState = {
  status: 'idle',
}

export const defaultTaskSchedule: TaskSchedule = {
  enabled: false,
  mode: 'interval',
  intervalMinutes: 60,
}

export const defaultBrowserRunMode: BrowserRunMode = 'dedicated_profile'

export const defaultDynamicTemplateUpdates = false

export function createDefaultBrowserTabGroupConfig(
  profileId: string,
): BrowserTabGroupConfig {
  return {
    profileId,
    initialUrls: [],
    browserKind: 'chrome',
    restorePolicy: 'browser_profile',
    runMode: defaultBrowserRunMode,
    profileSource: 'task_profile',
    dynamicTemplateUpdates: defaultDynamicTemplateUpdates,
  }
}

export function normalizeBrowserTabGroupConfig(
  config: Partial<BrowserTabGroupConfig>,
): BrowserTabGroupConfig {
  return {
    profileId: config.profileId ?? '',
    initialUrls: Array.isArray(config.initialUrls) ? config.initialUrls : [],
    browserKind: isBrowserKind(config.browserKind)
      ? config.browserKind
      : 'chrome',
    restorePolicy: isRestorePolicy(config.restorePolicy)
      ? config.restorePolicy
      : 'browser_profile',
    runMode: isBrowserRunMode(config.runMode)
      ? config.runMode
      : defaultBrowserRunMode,
    profileSource: isBrowserProfileSource(config.profileSource)
      ? config.profileSource
      : 'task_profile',
    existingProfilePath:
      typeof config.existingProfilePath === 'string' &&
      config.existingProfilePath.trim()
        ? config.existingProfilePath.trim()
        : undefined,
    dynamicTemplateUpdates:
      typeof config.dynamicTemplateUpdates === 'boolean'
        ? config.dynamicTemplateUpdates
        : defaultDynamicTemplateUpdates,
    tabGroupSnapshot: normalizeBrowserTabGroupStateSnapshot(
      config.tabGroupSnapshot,
    ),
  }
}

export function normalizeDevicePolicy(
  policy: Partial<DevicePolicy> | null | undefined,
): DevicePolicy {
  return {
    visibility: isDeviceVisibilityPolicy(policy?.visibility)
      ? policy.visibility
      : defaultDevicePolicy.visibility,
    execution: isDeviceExecutionPolicy(policy?.execution)
      ? policy.execution
      : defaultDevicePolicy.execution,
    allowedDeviceIds: Array.isArray(policy?.allowedDeviceIds)
      ? policy.allowedDeviceIds
          .map((deviceId) =>
            typeof deviceId === 'string' ? deviceId.trim() : '',
          )
          .filter(Boolean)
      : undefined,
    secretRefs: Array.isArray(policy?.secretRefs)
      ? policy.secretRefs.filter(
          (secretRef) =>
            typeof secretRef.id === 'string' &&
            secretRef.id.trim() &&
            (secretRef.scope === 'local_device' ||
              secretRef.scope === 'trusted_devices'),
        )
      : undefined,
  }
}

export function normalizeTaskSchedule(
  schedule: Partial<TaskSchedule> | null | undefined,
): TaskSchedule | undefined {
  if (!schedule) {
    return undefined
  }

  return {
    enabled: schedule.enabled === true,
    mode: isTaskScheduleMode(schedule.mode) ? schedule.mode : 'interval',
    intervalMinutes: normalizeScheduleInterval(schedule.intervalMinutes),
    timeOfDay: normalizeTimeOfDay(schedule.timeOfDay),
    daysOfWeek: normalizeDaysOfWeek(schedule.daysOfWeek),
    nextRunAt:
      typeof schedule.nextRunAt === 'string' && schedule.nextRunAt.trim()
        ? schedule.nextRunAt
        : undefined,
    lastTriggeredAt:
      typeof schedule.lastTriggeredAt === 'string' &&
      schedule.lastTriggeredAt.trim()
        ? schedule.lastTriggeredAt
        : undefined,
  }
}

export function getBrowserRunModeLabel(runMode?: BrowserRunMode): string {
  switch (runMode ?? defaultBrowserRunMode) {
    case 'dedicated_profile':
      return '전용 프로필'
    case 'extension_controlled':
      return '확장 프로그램'
    case 'default_browser_deeplink':
      return '기본 브라우저 연결'
  }
}

export function getDeviceVisibilityPolicyLabel(
  visibility: DeviceVisibilityPolicy,
): string {
  switch (visibility) {
    case 'all_devices':
      return '모든 기기'
    case 'trusted_devices':
      return '신뢰 기기'
    case 'specific_devices':
      return '지정 기기'
    case 'local_only':
      return '로컬 전용'
  }
}

export function getDeviceExecutionPolicyLabel(
  execution: DeviceExecutionPolicy,
): string {
  switch (execution) {
    case 'anywhere':
      return '어디서나'
    case 'trusted_only':
      return '신뢰 기기'
    case 'specific_devices':
      return '지정 기기'
    case 'local_only':
      return '로컬 전용'
  }
}

export function isRestrictedDevicePolicy(policy: DevicePolicy): boolean {
  return (
    policy.visibility !== 'all_devices' ||
    policy.execution !== 'anywhere' ||
    Boolean(policy.secretRefs?.length)
  )
}

export function getActionTypeForLegacyTaskType(taskType: TaskType): ActionType {
  switch (taskType) {
    case 'browser_tab_group':
      return 'browser_action'
    case 'crawler':
      return 'crawler_action'
    case 'discord_bot':
      return 'discord_dry_run_action'
    case 'notion_sync':
      return 'notion_dry_run_action'
    case 'trading_bot':
      return 'trading_dry_run_action'
  }
}

export function getLegacyActionId(taskId: string): string {
  return `action_${taskId}`
}

export function getLegacyWorkflowId(taskId: string): string {
  return `workflow_${taskId}`
}

export function createActionFromLegacyTask(
  task: TaskTemplate,
): ActionDefinition {
  return {
    id: getLegacyActionId(task.id),
    name: task.name,
    type: getActionTypeForLegacyTaskType(task.type),
    config: task.config,
    secretRefs: task.permissions.secretRefs,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  }
}

export function createWorkflowFromLegacyTask(
  task: TaskTemplate,
): WorkflowDefinition {
  const actionId = getLegacyActionId(task.id)

  return {
    id: getLegacyWorkflowId(task.id),
    name: task.name,
    actionRefs: [
      {
        id: `workflow_action_${task.id}`,
        actionId,
        order: 0,
        enabled: true,
      },
    ],
    permissions: normalizeDevicePolicy(task.permissions),
    schedule: normalizeTaskSchedule(task.schedule),
    state: task.state,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  }
}

function isBrowserKind(value: unknown): value is BrowserKind {
  return value === 'chrome' || value === 'edge' || value === 'chromium'
}

function isRestorePolicy(value: unknown): value is RestorePolicy {
  return value === 'browser_profile' || value === 'initial_urls_only'
}

function isBrowserRunMode(value: unknown): value is BrowserRunMode {
  return (
    value === 'dedicated_profile' ||
    value === 'extension_controlled' ||
    value === 'default_browser_deeplink'
  )
}

function normalizeScheduleInterval(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return defaultTaskSchedule.intervalMinutes
  }

  return Math.min(Math.max(Math.round(value), 1), 10080)
}

function normalizeTimeOfDay(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmedValue = value.trim()
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(trimmedValue)
    ? trimmedValue
    : undefined
}

function normalizeDaysOfWeek(value: unknown): DayOfWeek[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const days = value
    .map((day) => (typeof day === 'number' ? Math.round(day) : -1))
    .filter((day): day is DayOfWeek => day >= 0 && day <= 6)

  return days.length > 0 ? [...new Set(days)] : undefined
}

function isTaskScheduleMode(value: unknown): value is TaskScheduleMode {
  return value === 'interval' || value === 'daily' || value === 'weekly'
}

function isDeviceVisibilityPolicy(
  value: unknown,
): value is DeviceVisibilityPolicy {
  return (
    value === 'all_devices' ||
    value === 'trusted_devices' ||
    value === 'specific_devices' ||
    value === 'local_only'
  )
}

function isBrowserProfileSource(
  value: unknown,
): value is BrowserProfileSource {
  return value === 'task_profile' || value === 'existing_profile'
}

function normalizeBrowserTabGroupStateSnapshot(
  snapshot: unknown,
): BrowserTabGroupStateSnapshot | undefined {
  if (!snapshot || typeof snapshot !== 'object') {
    return undefined
  }

  const candidate = snapshot as Partial<BrowserTabGroupStateSnapshot>
  if (
    typeof candidate.capturedAt !== 'string' ||
    !Array.isArray(candidate.tabs) ||
    !Array.isArray(candidate.groups)
  ) {
    return undefined
  }

  const tabs = candidate.tabs.reduce<BrowserTabSnapshot[]>((result, tab) => {
    if (!tab || typeof tab !== 'object') {
      return result
    }

    const normalizedTab: BrowserTabSnapshot = {
      id:
        typeof tab.id === 'number' && Number.isFinite(tab.id)
          ? tab.id
          : undefined,
      windowId:
        typeof tab.windowId === 'number' && Number.isFinite(tab.windowId)
          ? tab.windowId
          : 0,
      index:
        typeof tab.index === 'number' && Number.isFinite(tab.index)
          ? tab.index
          : 0,
      url: typeof tab.url === 'string' ? tab.url : '',
      title: typeof tab.title === 'string' ? tab.title : undefined,
      groupId:
        typeof tab.groupId === 'number' && Number.isFinite(tab.groupId)
          ? tab.groupId
          : undefined,
      active: tab.active === true,
      pinned: tab.pinned === true,
    }

    return normalizedTab.url ? [...result, normalizedTab] : result
  }, [])
  const groups = candidate.groups.reduce<BrowserTabGroupSnapshot[]>(
    (result, group) => {
      if (!group || typeof group !== 'object') {
        return result
      }

      return [
        ...result,
        {
          id:
            typeof group.id === 'number' && Number.isFinite(group.id)
              ? group.id
              : 0,
          windowId:
            typeof group.windowId === 'number' &&
            Number.isFinite(group.windowId)
              ? group.windowId
              : 0,
          title:
            typeof group.title === 'string' && group.title.trim()
              ? group.title
              : undefined,
          color: isBrowserTabGroupColor(group.color) ? group.color : 'grey',
          collapsed: group.collapsed === true,
        },
      ]
    },
    [],
  )

  return {
    capturedAt: candidate.capturedAt,
    tabs,
    groups,
  }
}

function isBrowserTabGroupColor(
  value: unknown,
): value is BrowserTabGroupColor {
  return (
    value === 'grey' ||
    value === 'blue' ||
    value === 'red' ||
    value === 'yellow' ||
    value === 'green' ||
    value === 'pink' ||
    value === 'purple' ||
    value === 'cyan' ||
    value === 'orange'
  )
}

function isDeviceExecutionPolicy(
  value: unknown,
): value is DeviceExecutionPolicy {
  return (
    value === 'anywhere' ||
    value === 'trusted_only' ||
    value === 'specific_devices' ||
    value === 'local_only'
  )
}
