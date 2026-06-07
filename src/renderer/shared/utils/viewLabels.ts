import type { ThemeMode } from '../../../shared/settings'
import {
  getBrowserRunModeLabel,
  normalizeBrowserTabGroupConfig,
  type BrowserKind,
  type BrowserProfileSource,
  type BrowserTabGroupConfig,
} from '../../../shared/browsers'
import { isRestrictedDevicePolicy } from '../../../shared/devices'
import type { ActionDefinition } from '../../../shared/actions'
import type {
  DiscordBotConfig,
  NotionSyncConfig,
  TradingBotConfig,
} from '../../../shared/actions'
import type {
  TaskSchedule,
  TaskState,
  TaskTemplate,
  TaskType,
} from '../state/taskTypes'
import type { SyncStatus } from '../../../shared/sync'
import type { RegisteredToolModule, ToolModuleField } from '../../../shared/tools'
import type { WorkflowDefinition } from '../../../shared/workflows'
import type { NavigationCategory, WorkspaceMode } from '../state/taskFormState'
import { normalizeCrawlerConfig } from './taskFormTransforms'

export function filterTasks(
  tasks: TaskTemplate[],
  category: NavigationCategory,
): TaskTemplate[] {
  switch (category) {
    case 'favorites':
      return tasks
    case 'due_soon':
      return tasks
    case 'running':
      return tasks.filter((task) => task.state.status === 'running')
    case 'scheduled':
      return tasks.filter((task) => task.schedule?.enabled)
    case 'failed':
      return tasks.filter((task) => task.state.status === 'failed')
    case 'restricted':
      return tasks.filter((task) => isRestrictedDevicePolicy(task.permissions))
    case 'secret_required':
      return tasks.filter((task) => (task.permissions.secretRefs?.length ?? 0) > 0)
    case 'all':
      return tasks
  }
}

export function getTaskTypeLabel(taskType: TaskType): string {
  switch (taskType) {
    case 'browser_tab_group':
      return '브라우저 탭 그룹'
    case 'discord_bot':
      return 'Discord bot'
    case 'crawler':
      return 'Crawler'
    case 'notion_sync':
      return 'Notion sync'
    case 'trading_bot':
      return 'Trading bot'
    case 'transform':
      return 'Transform'
  }
}

export function getActionTypeLabel(actionType: ActionDefinition['type']): string {
  switch (actionType) {
    case 'browser_action':
      return 'Browser Action'
    case 'crawler_action':
      return 'Crawler Action'
    case 'discord_dry_run_action':
      return 'Discord dry-run'
    case 'notion_dry_run_action':
      return 'Notion dry-run'
    case 'trading_dry_run_action':
      return 'Trading dry-run'
    case 'transform_action':
      return 'Transform Action'
    case 'tool_action':
      return 'Tool Action'
  }
}

export function getTaskConfigSummary(task: TaskTemplate): string {
  switch (task.type) {
    case 'browser_tab_group': {
      const config = normalizeBrowserTabGroupConfig(
        task.config as Partial<BrowserTabGroupConfig>,
      )
      return `${getBrowserKindLabel(config.browserKind)} · ${getBrowserRunModeLabel(
        config.runMode,
      )} · URL ${config.initialUrls.length}개`
    }
    case 'crawler': {
      const config = normalizeCrawlerConfig(task.config)
      return `URL ${config.urls.length}개 · 최대 ${config.maxBytes} bytes`
    }
    case 'discord_bot': {
      const config = task.config as Partial<DiscordBotConfig>
      return `dry-run · prefix ${config.commandPrefix ?? '!'}`
    }
    case 'notion_sync': {
      const config = task.config as Partial<NotionSyncConfig>
      return `dry-run · database ${config.databaseId || '미지정'}`
    }
    case 'trading_bot': {
      const config = task.config as Partial<TradingBotConfig>
      return `skeleton dry-run · 실제 주문 없음 · ${config.exchange || 'exchange 미지정'} / ${
        config.symbol || 'symbol 미지정'
      }`
    }
    case 'transform':
      return '입출력 변환'
  }
}

export function getSyncModeLabel(mode: SyncStatus['mode']): string {
  switch (mode) {
    case 'mock_file':
      return '로컬 mock 파일'
  }
}

export function createToolInputDefaults(
  tool: RegisteredToolModule,
): Record<string, unknown> {
  return tool.manifest.inputs.reduce<Record<string, unknown>>(
    (defaults, field) => ({
      ...defaults,
      [field.key]: getToolFieldDefaultValue(field),
    }),
    {},
  )
}

export function getToolFieldDefaultValue(field: ToolModuleField): unknown {
  if (field.default !== undefined) {
    return field.type === 'json' || field.type === 'record[]'
      ? JSON.stringify(field.default, null, 2)
      : field.default
  }

  if (
    (field.ui?.control === 'select' || field.ui?.control === 'radio') &&
    field.ui.options?.[0]
  ) {
    return field.ui.options[0].value
  }

  switch (field.type) {
    case 'boolean':
      return false
    case 'boolean[]':
    case 'json':
    case 'record[]':
      return '{}'
    case 'number':
      return ''
    case 'number[]':
    case 'string[]':
    case 'file[]':
    case 'image[]':
    case 'color[]':
    case 'url[]':
      return ''
    case 'color':
      return 'black'
    case 'file':
    case 'image':
    case 'url':
    case 'string':
      return ''
  }
}

export function getNavigationCategoryLabel(category: NavigationCategory): string {
  switch (category) {
    case 'all':
      return 'All templates'
    case 'favorites':
      return 'Favorites'
    case 'due_soon':
      return 'Due soon'
    case 'running':
      return 'Running'
    case 'scheduled':
      return 'Scheduled'
    case 'failed':
      return 'Failed'
    case 'restricted':
      return 'Restricted'
    case 'secret_required':
      return 'Secret required'
  }
}

export function getThemeModeLabel(themeMode: ThemeMode): string {
  switch (themeMode) {
    case 'system':
      return '시스템'
    case 'light':
      return '라이트'
    case 'dark':
      return '다크'
    case 'custom':
      return '사용자 지정'
  }
}

export function getWorkspaceModeLabel(workspaceMode: WorkspaceMode): string {
  switch (workspaceMode) {
    case 'run':
      return '실행'
    case 'actions':
      return 'Action'
    case 'workflows':
      return 'Workflow'
    case 'urlGroups':
      return 'URL Groups'
    case 'todos':
      return 'Todos'
    case 'tools':
      return '도구'
    case 'settings':
      return '설정'
  }
}

export function getTaskStatusLabel(status: TaskState['status']): string {
  switch (status) {
    case 'idle':
      return '대기'
    case 'running':
      return '실행 중'
    case 'succeeded':
      return '완료'
    case 'failed':
      return '실패'
  }
}

export function getBrowserKindLabel(browserKind: BrowserKind): string {
  switch (browserKind) {
    case 'chrome':
      return 'Chrome'
    case 'edge':
      return 'Edge'
    case 'chromium':
      return 'Chromium'
  }
}

export function getBrowserProfileSourceLabel(
  profileSource: BrowserProfileSource,
): string {
  switch (profileSource) {
    case 'action_profile':
      return 'Action 전용 프로필'
    case 'existing_profile':
      return '기존 브라우저 프로필'
  }
}

export function getTabGroupSnapshotLabel(config: BrowserTabGroupConfig): string {
  if (!config.tabGroupSnapshot) {
    return '아직 없음'
  }

  return `${config.tabGroupSnapshot.groups.length}개 그룹, ${
    config.tabGroupSnapshot.tabs.length
  }개 탭 · ${formatDate(config.tabGroupSnapshot.capturedAt)}`
}

export function getTaskScheduleLabel(schedule?: TaskSchedule): string {
  if (!schedule?.enabled) {
    return '사용 안 함'
  }

  switch (schedule.mode) {
    case 'daily':
      return `매일 ${schedule.timeOfDay ?? '09:00'} · 다음 실행 ${formatDate(
        schedule.nextRunAt,
      )}`
    case 'weekly':
      return `매주 ${formatDaysOfWeek(
        schedule.daysOfWeek,
      )} ${schedule.timeOfDay ?? '09:00'} · 다음 실행 ${formatDate(
        schedule.nextRunAt,
      )}`
    case 'interval':
      return `${schedule.intervalMinutes}분마다 · 다음 실행 ${formatDate(
        schedule.nextRunAt,
      )}`
  }
}

export function getWorkflowRunPolicyLabel(
  runPolicy: WorkflowDefinition['runPolicy'],
): string {
  if (!runPolicy) {
    return '기본'
  }

  const parts: string[] = []
  if (runPolicy.allowedActors?.length) {
    parts.push(`허용 ${runPolicy.allowedActors.length}개`)
  }

  if (runPolicy.allowSchedule === false) {
    parts.push('Schedule 차단')
  }

  if (runPolicy.requiresConfirmation) {
    parts.push('확인 필요')
  }

  if (runPolicy.maxRunsPerHour) {
    parts.push(`시간당 ${runPolicy.maxRunsPerHour}회`)
  }

  if (runPolicy.allowedExternalClientIds?.length) {
    parts.push(`외부 client ${runPolicy.allowedExternalClientIds.length}개`)
  }

  return parts.length > 0 ? parts.join(' · ') : '기본'
}

export function formatDaysOfWeek(daysOfWeek: TaskSchedule['daysOfWeek']): string {
  const labels = ['일', '월', '화', '수', '목', '금', '토']
  return daysOfWeek?.map((day) => labels[day]).join(', ') || '요일 미지정'
}

export function formatDate(value?: string): string {
  if (!value) {
    return '아직 없음'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return '알 수 없는 오류가 발생했습니다.'
}
