import {
  getDeviceExecutionPolicyLabel,
  getDeviceVisibilityPolicyLabel,
  type BrowserKind,
  type BrowserProfileSource,
  type BrowserRunMode,
  type DeviceExecutionPolicy,
  type DeviceVisibilityPolicy,
  type TaskScheduleMode,
} from '../../../../shared/tasks'
import type { CurrentDevice } from '../../../../shared/devices'
import type { LocalSecretMetadata } from '../../../../shared/secrets'
import type { BrowserTaskFormState } from '../../taskFormState'
import { parseLines } from '../../utils/taskFormTransforms'

export type ScheduleFieldsProps = {
  form: BrowserTaskFormState
  onChange(value: BrowserTaskFormState): void
}

export function TaskTypeConfigFields({ form, onChange }: ScheduleFieldsProps) {
  switch (form.taskType) {
    case 'browser_tab_group':
      return <BrowserConfigFields form={form} onChange={onChange} />
    case 'crawler':
      return <CrawlerConfigFields form={form} onChange={onChange} />
    case 'discord_bot':
      return <DiscordBotConfigFields form={form} onChange={onChange} />
    case 'notion_sync':
      return <NotionSyncConfigFields form={form} onChange={onChange} />
    case 'trading_bot':
      return <TradingBotConfigFields form={form} onChange={onChange} />
  }
}

export function BrowserConfigFields({ form, onChange }: ScheduleFieldsProps) {
  return (
    <>
      <div className="form-grid">
        <label>
          브라우저
          <select
            value={form.browserKind}
            onChange={(event) =>
              onChange({
                ...form,
                browserKind: event.target.value as BrowserKind,
              })
            }
          >
            <option value="chrome">Chrome</option>
            <option value="edge">Edge</option>
            <option value="chromium">Chromium</option>
          </select>
        </label>
        <label>
          실행 방식
          <select
            value={form.runMode}
            onChange={(event) =>
              onChange({
                ...form,
                runMode: event.target.value as BrowserRunMode,
              })
            }
          >
            <option value="dedicated_profile">전용 프로필</option>
            <option value="extension_controlled">확장 프로그램 제어</option>
            <option value="default_browser_deeplink">기본 브라우저 연결</option>
          </select>
        </label>
        {form.runMode === 'extension_controlled' ? (
          <label>
            프로필 소스
            <select
              value={form.profileSource}
              onChange={(event) =>
                onChange({
                  ...form,
                  profileSource: event.target.value as BrowserProfileSource,
                })
              }
            >
              <option value="task_profile">작업 전용 프로필</option>
              <option value="existing_profile">기존 브라우저 프로필</option>
            </select>
          </label>
        ) : null}
      </div>
      {form.runMode === 'extension_controlled' &&
      form.profileSource === 'existing_profile' ? (
        <label>
          기존 프로필 경로
          <input
            value={form.existingProfilePath}
            onChange={(event) =>
              onChange({
                ...form,
                existingProfilePath: event.target.value,
              })
            }
          />
        </label>
      ) : null}
      <label>
        초기 URL
        <textarea
          value={form.initialUrls}
          onChange={(event) =>
            onChange({
              ...form,
              initialUrls: event.target.value,
            })
          }
          placeholder="한 줄에 하나씩 입력"
          rows={5}
        />
      </label>
      <label className="inline-check">
        <input
          checked={form.dynamicTemplateUpdates}
          type="checkbox"
          onChange={(event) =>
            onChange({
              ...form,
              dynamicTemplateUpdates: event.target.checked,
            })
          }
        />
        실행 후 열린 탭 URL을 템플릿에 반영
      </label>
    </>
  )
}

export function CrawlerConfigFields({ form, onChange }: ScheduleFieldsProps) {
  return (
    <>
      <label>
        수집 URL
        <textarea
          value={form.crawlerUrls}
          onChange={(event) =>
            onChange({
              ...form,
              crawlerUrls: event.target.value,
            })
          }
          placeholder="한 줄에 하나씩 입력"
          rows={5}
        />
      </label>
      <label>
        URL당 최대 bytes
        <input
          max={500000}
          min={1024}
          type="number"
          value={form.crawlerMaxBytes}
          onChange={(event) =>
            onChange({
              ...form,
              crawlerMaxBytes: Number(event.target.value),
            })
          }
        />
      </label>
    </>
  )
}

export function DiscordBotConfigFields({ form, onChange }: ScheduleFieldsProps) {
  return (
    <label>
      명령 prefix
      <input
        value={form.discordCommandPrefix}
        onChange={(event) =>
          onChange({
            ...form,
            discordCommandPrefix: event.target.value,
          })
        }
      />
    </label>
  )
}

export function NotionSyncConfigFields({ form, onChange }: ScheduleFieldsProps) {
  return (
    <label>
      Database ID
      <input
        value={form.notionDatabaseId}
        onChange={(event) =>
          onChange({
            ...form,
            notionDatabaseId: event.target.value,
          })
        }
      />
    </label>
  )
}

export function TradingBotConfigFields({ form, onChange }: ScheduleFieldsProps) {
  return (
    <fieldset className="settings-fieldset">
      <legend>자동매매 skeleton</legend>
      <p className="muted-text">실제 주문 실행 없이 dry-run 뼈대만 저장합니다.</p>
      <div className="form-grid">
        <label>
          Exchange
          <input
            value={form.tradingExchange}
            onChange={(event) =>
              onChange({
                ...form,
                tradingExchange: event.target.value,
              })
            }
          />
        </label>
        <label>
          Symbol
          <input
            value={form.tradingSymbol}
            onChange={(event) =>
              onChange({
                ...form,
                tradingSymbol: event.target.value,
              })
            }
          />
        </label>
      </div>
    </fieldset>
  )
}

export function ScheduleFields({ form, onChange }: ScheduleFieldsProps) {
  return (
    <fieldset className="settings-fieldset">
      <legend>예약 실행</legend>
      <label className="inline-check">
        <input
          checked={form.scheduleEnabled}
          type="checkbox"
          onChange={(event) =>
            onChange({
              ...form,
              scheduleEnabled: event.target.checked,
            })
          }
        />
        주기적으로 실행
      </label>
      <label>
        예약 방식
        <select
          value={form.scheduleMode}
          onChange={(event) =>
            onChange({
              ...form,
              scheduleMode: event.target.value as TaskScheduleMode,
            })
          }
        >
          <option value="interval">간격</option>
          <option value="daily">매일</option>
          <option value="weekly">매주</option>
        </select>
      </label>
      {form.scheduleMode === 'interval' ? (
        <label>
          실행 간격(분)
          <input
            max={10080}
            min={1}
            type="number"
            value={form.scheduleIntervalMinutes}
            onChange={(event) =>
              onChange({
                ...form,
                scheduleIntervalMinutes: Number(event.target.value),
              })
            }
          />
        </label>
      ) : null}
      {form.scheduleMode === 'daily' || form.scheduleMode === 'weekly' ? (
        <label>
          실행 시각
          <input
            type="time"
            value={form.scheduleTimeOfDay}
            onChange={(event) =>
              onChange({
                ...form,
                scheduleTimeOfDay: event.target.value,
              })
            }
          />
        </label>
      ) : null}
      {form.scheduleMode === 'weekly' ? (
        <label>
          실행 요일
          <textarea
            value={form.scheduleDaysOfWeek}
            onChange={(event) =>
              onChange({
                ...form,
                scheduleDaysOfWeek: event.target.value,
              })
            }
            placeholder="0=일, 1=월 ... 6=토"
            rows={3}
          />
        </label>
      ) : null}
    </fieldset>
  )
}

export type PolicyFieldsProps = {
  currentDevice: CurrentDevice
  form: BrowserTaskFormState
  secrets: LocalSecretMetadata[]
  onChange(value: BrowserTaskFormState): void
}

export function PolicyFields({
  currentDevice,
  form,
  onChange,
  secrets,
}: PolicyFieldsProps) {
  return (
    <fieldset className="settings-fieldset">
      <legend>작업 정책</legend>
      <div className="form-grid">
        <label>
          표시 정책
          <select
            value={form.visibility}
            onChange={(event) =>
              onChange({
                ...form,
                visibility: event.target.value as DeviceVisibilityPolicy,
              })
            }
          >
            {(
              [
                'all_devices',
                'trusted_devices',
                'specific_devices',
                'local_only',
              ] as const
            ).map((visibility) => (
              <option key={visibility} value={visibility}>
                {getDeviceVisibilityPolicyLabel(visibility)}
              </option>
            ))}
          </select>
        </label>
        <label>
          실행 정책
          <select
            value={form.execution}
            onChange={(event) =>
              onChange({
                ...form,
                execution: event.target.value as DeviceExecutionPolicy,
              })
            }
          >
            {(
              ['anywhere', 'trusted_only', 'specific_devices', 'local_only'] as const
            ).map((execution) => (
              <option key={execution} value={execution}>
                {getDeviceExecutionPolicyLabel(execution)}
              </option>
            ))}
          </select>
        </label>
        <label>
          현재 기기 ID
          <input value={currentDevice.id || '아직 없음'} readOnly />
        </label>
      </div>
      <label>
        허용 기기 ID
        <textarea
          value={form.allowedDeviceIds}
          onChange={(event) =>
            onChange({
              ...form,
              allowedDeviceIds: event.target.value,
            })
          }
          placeholder="한 줄에 하나씩 입력"
          rows={3}
        />
      </label>
      <label>
        Secret 참조
        <select
          multiple
          value={parseLines(form.secretRefIds)}
          onChange={(event) =>
            onChange({
              ...form,
              secretRefIds: Array.from(event.target.selectedOptions)
                .map((option) => option.value)
                .join('\n'),
            })
          }
        >
          {secrets.map((secret) => (
            <option key={secret.id} value={secret.id}>
              {secret.name}
            </option>
          ))}
        </select>
      </label>
    </fieldset>
  )
}
