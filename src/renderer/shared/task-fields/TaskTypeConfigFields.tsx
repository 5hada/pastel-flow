import { Checkbox, Input, Label, ListBox, Select, TextArea } from '@heroui/react'
import {
  browserKindOptions,
  browserRunModeOptions,
  profileSourceOptions,
} from './options'
import type { TaskFieldsProps } from './types'

export function TaskTypeConfigFields({
  form,
  isDisabled = false,
  onChange,
  profilePresets,
}: TaskFieldsProps) {
  switch (form.taskType) {
    case 'browser_tab_group':
      return (
        <BrowserConfigFields
          form={form}
          isDisabled={isDisabled}
          profilePresets={profilePresets}
          onChange={onChange}
        />
      )
    case 'crawler':
      return <CrawlerConfigFields form={form} isDisabled={isDisabled} onChange={onChange} />
    case 'discord_bot':
      return <DiscordBotConfigFields form={form} isDisabled={isDisabled} onChange={onChange} />
    case 'notion_sync':
      return <NotionSyncConfigFields form={form} isDisabled={isDisabled} onChange={onChange} />
    case 'trading_bot':
      return <TradingBotConfigFields form={form} isDisabled={isDisabled} onChange={onChange} />
  }
}

function BrowserConfigFields({
  form,
  isDisabled = false,
  onChange,
  profilePresets = [],
}: TaskFieldsProps) {
  const selectedProfilePresetId =
    form.profilePresetId ||
    profilePresets.find(
      (preset) => preset.profilePath === form.existingProfilePath,
    )?.id ||
    ''

  return (
    <>
      <div className="form-grid">
        <Select isDisabled={isDisabled} selectedKey={form.browserKind} onSelectionChange={(key) => onChange({ ...form, browserKind: String(key) as typeof form.browserKind })}>
          <Label>브라우저</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {browserKindOptions.map((option) => (
                <ListBox.Item id={option.value} key={option.value} textValue={option.label}>
                  {option.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <Select isDisabled={isDisabled} selectedKey={form.runMode} onSelectionChange={(key) => onChange({ ...form, runMode: String(key) as typeof form.runMode })}>
          <Label>실행 방식</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {browserRunModeOptions.map((option) => (
                <ListBox.Item id={option.value} key={option.value} textValue={option.label}>
                  {option.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        {form.runMode === 'extension_controlled' ? (
          <Select isDisabled={isDisabled} selectedKey={form.profileSource} onSelectionChange={(key) => onChange({ ...form, profileSource: String(key) as typeof form.profileSource })}>
            <Label>프로필 소스</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {profileSourceOptions.map((option) => (
                  <ListBox.Item id={option.value} key={option.value} textValue={option.label}>
                    {option.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        ) : null}
      </div>
      {form.runMode === 'extension_controlled' &&
      form.profileSource === 'existing_profile' ? (
        profilePresets.length > 0 ? (
          <Select isDisabled={isDisabled} selectedKey={selectedProfilePresetId} onSelectionChange={(key) => {
            const profilePresetId = String(key)
            const preset = profilePresets.find(
              (currentPreset) => currentPreset.id === profilePresetId,
            )
            onChange({
              ...form,
              profilePresetId,
              browserKind: preset?.browserKind ?? form.browserKind,
              existingProfilePath: preset?.profilePath ?? '',
            })
          }}>
            <Label>사용자 지정 프로필</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="" textValue="프로필 선택">
                  프로필 선택
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                {profilePresets.map((preset) => (
                  <ListBox.Item id={preset.id} key={preset.id} textValue={preset.name}>
                    {preset.name}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        ) : (
          <label>
            기존 프로필 경로
            <Input
              disabled={isDisabled}
              value={form.existingProfilePath}
              onChange={(event) =>
                onChange({ ...form, existingProfilePath: event.target.value })
              }
            />
          </label>
        )
      ) : null}
      <label>
        초기 URL
        <TextArea
          disabled={isDisabled}
          value={form.initialUrls}
          onChange={(event) => onChange({ ...form, initialUrls: event.target.value })}
          placeholder="한 줄에 하나씩 입력"
          rows={5}
        />
      </label>
      <Checkbox
        className="inline-check"
        isDisabled={isDisabled}
        isSelected={form.dynamicTemplateUpdates}
        onChange={(dynamicTemplateUpdates) =>
          onChange({ ...form, dynamicTemplateUpdates })
        }
      >
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <Checkbox.Content>
          <Label>실행 후 열린 탭 URL을 템플릿에 반영</Label>
        </Checkbox.Content>
      </Checkbox>
    </>
  )
}

function CrawlerConfigFields({ form, isDisabled = false, onChange }: TaskFieldsProps) {
  return (
    <>
      <label>
        수집 URL
        <TextArea
          disabled={isDisabled}
          value={form.crawlerUrls}
          onChange={(event) => onChange({ ...form, crawlerUrls: event.target.value })}
          placeholder="한 줄에 하나씩 입력"
          rows={5}
        />
      </label>
      <label>
        URL당 최대 bytes
        <Input
          disabled={isDisabled}
          max={500000}
          min={1024}
          type="number"
          value={form.crawlerMaxBytes}
          onChange={(event) =>
            onChange({ ...form, crawlerMaxBytes: Number(event.target.value) })
          }
        />
      </label>
    </>
  )
}

function DiscordBotConfigFields({ form, isDisabled = false, onChange }: TaskFieldsProps) {
  return (
    <label>
      명령 prefix
      <Input
        disabled={isDisabled}
        value={form.discordCommandPrefix}
        onChange={(event) =>
          onChange({ ...form, discordCommandPrefix: event.target.value })
        }
      />
    </label>
  )
}

function NotionSyncConfigFields({ form, isDisabled = false, onChange }: TaskFieldsProps) {
  return (
    <label>
      Database ID
      <Input
        disabled={isDisabled}
        value={form.notionDatabaseId}
        onChange={(event) =>
          onChange({ ...form, notionDatabaseId: event.target.value })
        }
      />
    </label>
  )
}

function TradingBotConfigFields({ form, isDisabled = false, onChange }: TaskFieldsProps) {
  return (
    <fieldset className="settings-fieldset">
      <legend>자동매매 skeleton</legend>
      <p className="muted-text">실제 주문 실행 없이 dry-run 뼈대만 저장합니다.</p>
      <div className="form-grid">
        <label>
          Exchange
          <Input
            disabled={isDisabled}
            value={form.tradingExchange}
            onChange={(event) =>
              onChange({ ...form, tradingExchange: event.target.value })
            }
          />
        </label>
        <label>
          Symbol
          <Input
            disabled={isDisabled}
            value={form.tradingSymbol}
            onChange={(event) =>
              onChange({ ...form, tradingSymbol: event.target.value })
            }
          />
        </label>
      </div>
    </fieldset>
  )
}
