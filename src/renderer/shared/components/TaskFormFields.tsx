import { Input, TextArea } from '@heroui/react'
import {
  getDeviceExecutionPolicyLabel,
  getDeviceVisibilityPolicyLabel,
} from '../../../shared/devices'
import type {
} from '../state/taskTypes'
import type { BrowserProfilePreset } from '../../../shared/settings'
import type { CurrentDevice } from '../../../shared/devices'
import type { LocalSecretMetadata } from '../../../shared/secrets'
import type { BrowserTaskFormState } from '../state/taskFormState'
import { parseLines } from '../utils/taskFormTransforms'
import { SimpleSelect } from './SimpleSelect'

export type ScheduleFieldsProps = {
  form: BrowserTaskFormState
  profilePresets?: BrowserProfilePreset[]
  onChange(value: BrowserTaskFormState): void
}

export function TaskTypeConfigFields({
  form,
  onChange,
  profilePresets,
}: ScheduleFieldsProps) {
  switch (form.taskType) {
    case 'browser_tab_group':
      return (
        <BrowserConfigFields
          form={form}
          profilePresets={profilePresets}
          onChange={onChange}
        />
      )
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

export function BrowserConfigFields({
  form,
  onChange,
  profilePresets = [],
}: ScheduleFieldsProps) {
  const selectedProfilePresetId =
    form.profilePresetId ||
    profilePresets.find(
      (preset) => preset.profilePath === form.existingProfilePath,
    )?.id ||
    ''

  return (
    <>
      <div className="form-grid">
        <label>
          브라우저
          <SimpleSelect
            aria-label="브라우저"
            options={[
              { label: 'Chrome', value: 'chrome' },
              { label: 'Edge', value: 'edge' },
              { label: 'Chromium', value: 'chromium' },
            ]}
            value={form.browserKind}
            onChange={(browserKind) =>
              onChange({
                ...form,
                browserKind,
              })
            }
          />
        </label>
        <label>
          실행 방식
          <SimpleSelect
            aria-label="실행 방식"
            options={[
              { label: '전용 프로필', value: 'dedicated_profile' },
              { label: '확장 프로그램 제어', value: 'extension_controlled' },
              { label: '기본 브라우저 연결', value: 'default_browser_deeplink' },
            ]}
            value={form.runMode}
            onChange={(runMode) =>
              onChange({
                ...form,
                runMode,
              })
            }
          />
        </label>
        {form.runMode === 'extension_controlled' ? (
          <label>
            프로필 소스
            <SimpleSelect
              aria-label="프로필 소스"
              options={[
                { label: '작업 전용 프로필', value: 'action_profile' },
                { label: '기존 브라우저 프로필', value: 'existing_profile' },
              ]}
              value={form.profileSource}
              onChange={(profileSource) =>
                onChange({
                  ...form,
                  profileSource,
                })
              }
            />
          </label>
        ) : null}
      </div>
      {form.runMode === 'extension_controlled' &&
      form.profileSource === 'existing_profile' ? (
        profilePresets.length > 0 ? (
          <label>
            사용자 지정 프로필
            <SimpleSelect
              aria-label="사용자 지정 프로필"
              options={[
                { label: '프로필 선택', value: '' },
                ...profilePresets.map((preset) => ({
                  label: preset.name,
                  value: preset.id,
                })),
              ]}
              value={selectedProfilePresetId}
              onChange={(profilePresetId) => {
                const preset = profilePresets.find(
                  (currentPreset) => currentPreset.id === profilePresetId,
                )
                onChange({
                  ...form,
                  profilePresetId,
                  browserKind: preset?.browserKind ?? form.browserKind,
                  existingProfilePath: preset?.profilePath ?? '',
                })
              }}
            />
          </label>
        ) : (
          <label>
            기존 프로필 경로
            <Input
              value={form.existingProfilePath}
              onChange={(event) =>
                onChange({
                  ...form,
                  existingProfilePath: event.target.value,
                })
              }
            />
          </label>
        )
      ) : null}
      <label>
        초기 URL
        <TextArea
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
        <TextArea
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
        <Input
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
      <Input
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
      <Input
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
          <Input
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
          <Input
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
        <SimpleSelect
          aria-label="예약 방식"
          options={[
            { label: '간격', value: 'interval' },
            { label: '매일', value: 'daily' },
            { label: '매주', value: 'weekly' },
          ]}
          value={form.scheduleMode}
          onChange={(scheduleMode) =>
            onChange({
              ...form,
              scheduleMode,
            })
          }
        />
      </label>
      {form.scheduleMode === 'interval' ? (
        <label>
          실행 간격(분)
          <Input
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
          <Input
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
          <TextArea
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
          <SimpleSelect
            aria-label="표시 정책"
            options={(
              [
                'all_devices',
                'trusted_devices',
                'specific_devices',
                'local_only',
              ] as const
            ).map((visibility) => ({
              label: getDeviceVisibilityPolicyLabel(visibility),
              value: visibility,
            }))}
            value={form.visibility}
            onChange={(visibility) =>
              onChange({
                ...form,
                visibility,
              })
            }
          />
        </label>
        <label>
          실행 정책
          <SimpleSelect
            aria-label="실행 정책"
            options={(
              ['anywhere', 'trusted_only', 'specific_devices', 'local_only'] as const
            ).map((execution) => ({
              label: getDeviceExecutionPolicyLabel(execution),
              value: execution,
            }))}
            value={form.execution}
            onChange={(execution) =>
              onChange({
                ...form,
                execution,
              })
            }
          />
        </label>
        <label>
          현재 기기 ID
          <Input value={currentDevice.id || '아직 없음'} readOnly />
        </label>
      </div>
      <label>
        허용 기기 ID
        <TextArea
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
