import {
  CheckboxField,
  FieldGrid,
  FormFieldset,
  SelectField,
  TextAreaField,
  TextInputField,
} from '../components/HeroForm'
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
  urlGroups,
}: TaskFieldsProps) {
  switch (form.taskType) {
    case 'browser_tab_group':
      return (
        <BrowserConfigFields
          form={form}
          isDisabled={isDisabled}
          profilePresets={profilePresets}
          urlGroups={urlGroups}
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
    case 'transform':
      return <TransformConfigFields form={form} isDisabled={isDisabled} onChange={onChange} />
  }
}

function BrowserConfigFields({
  form,
  isDisabled = false,
  onChange,
  profilePresets = [],
  urlGroups = [],
}: TaskFieldsProps) {
  const selectedProfilePresetId =
    form.profilePresetId ||
    profilePresets.find(
      (preset) => preset.profilePath === form.existingProfilePath,
    )?.id ||
    ''

  return (
    <>
      <FieldGrid>
        <SelectField
          isDisabled={isDisabled}
          label="브라우저"
          options={browserKindOptions}
          selectedKey={form.browserKind}
          onChange={(browserKind) => onChange({ ...form, browserKind })}
        />
        <SelectField
          isDisabled={isDisabled}
          label="실행 방식"
          options={browserRunModeOptions}
          selectedKey={form.runMode}
          onChange={(runMode) => onChange({ ...form, runMode })}
        />
        {form.runMode === 'extension_controlled' ? (
          <SelectField
            isDisabled={isDisabled}
            label="프로필 소스"
            options={profileSourceOptions}
            selectedKey={form.profileSource}
            onChange={(profileSource) => onChange({ ...form, profileSource })}
          />
        ) : null}
      </FieldGrid>
      {form.runMode === 'extension_controlled' &&
      form.profileSource === 'existing_profile' ? (
        profilePresets.length > 0 ? (
          <SelectField
            isDisabled={isDisabled}
            label="사용자 지정 프로필"
            options={[
              { value: '', label: '프로필 선택' },
              ...profilePresets.map((preset) => ({
                value: preset.id,
                label: preset.name,
              })),
            ]}
            selectedKey={selectedProfilePresetId}
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
        ) : (
          <TextInputField
            isDisabled={isDisabled}
            label="기존 프로필 경로"
            name="existing-profile-path"
            value={form.existingProfilePath}
            onChange={(existingProfilePath) =>
              onChange({ ...form, existingProfilePath })
            }
          />
        )
      ) : null}
      <SelectField
        isDisabled={isDisabled}
        label="URL Group"
        options={[
          { value: '', label: '직접 입력' },
          ...urlGroups.map((urlGroup) => ({
            value: urlGroup.id,
            label: urlGroup.name,
          })),
        ]}
        selectedKey={form.urlGroupId}
        onChange={(urlGroupId) => onChange({ ...form, urlGroupId })}
      />
      <TextAreaField
        isDisabled={isDisabled || Boolean(form.urlGroupId)}
        label="초기 URL"
        name="initial-urls"
        placeholder="한 줄에 하나씩 입력"
        rows={5}
        value={form.initialUrls}
        onChange={(initialUrls) => onChange({ ...form, initialUrls })}
      />
      <CheckboxField
        isDisabled={isDisabled}
        isSelected={form.dynamicTemplateUpdates}
        label="실행 후 열린 탭 URL을 템플릿에 반영"
        onChange={(dynamicTemplateUpdates) =>
          onChange({ ...form, dynamicTemplateUpdates })
        }
      />
    </>
  )
}

function CrawlerConfigFields({ form, isDisabled = false, onChange }: TaskFieldsProps) {
  return (
    <>
      <TextAreaField
        isDisabled={isDisabled}
        label="수집 URL"
        name="crawler-urls"
        placeholder="한 줄에 하나씩 입력"
        rows={5}
        value={form.crawlerUrls}
        onChange={(crawlerUrls) => onChange({ ...form, crawlerUrls })}
      />
      <TextInputField
        isDisabled={isDisabled}
        label="URL당 최대 bytes"
        max={500000}
        min={1024}
        name="crawler-max-bytes"
        type="number"
        value={String(form.crawlerMaxBytes)}
        onChange={(crawlerMaxBytes) =>
          onChange({ ...form, crawlerMaxBytes: Number(crawlerMaxBytes) })
        }
      />
    </>
  )
}

function DiscordBotConfigFields({ form, isDisabled = false, onChange }: TaskFieldsProps) {
  return (
    <TextInputField
      isDisabled={isDisabled}
      label="명령 prefix"
      name="discord-command-prefix"
      value={form.discordCommandPrefix}
      onChange={(discordCommandPrefix) =>
        onChange({ ...form, discordCommandPrefix })
      }
    />
  )
}

function NotionSyncConfigFields({ form, isDisabled = false, onChange }: TaskFieldsProps) {
  return (
    <TextInputField
      isDisabled={isDisabled}
      label="Database ID"
      name="notion-database-id"
      value={form.notionDatabaseId}
      onChange={(notionDatabaseId) => onChange({ ...form, notionDatabaseId })}
    />
  )
}

function TradingBotConfigFields({ form, isDisabled = false, onChange }: TaskFieldsProps) {
  return (
    <FormFieldset legend="자동매매 skeleton">
      <p className="muted-text">실제 주문 실행 없이 dry-run 뼈대만 저장합니다.</p>
      <FieldGrid>
        <TextInputField
          isDisabled={isDisabled}
          label="Exchange"
          name="trading-exchange"
          value={form.tradingExchange}
          onChange={(tradingExchange) => onChange({ ...form, tradingExchange })}
        />
        <TextInputField
          isDisabled={isDisabled}
          label="Symbol"
          name="trading-symbol"
          value={form.tradingSymbol}
          onChange={(tradingSymbol) => onChange({ ...form, tradingSymbol })}
        />
      </FieldGrid>
    </FormFieldset>
  )
}

function TransformConfigFields({ form, isDisabled = false, onChange }: TaskFieldsProps) {
  return (
    <FormFieldset legend="Transform">
      <FieldGrid>
        <SelectField
          isDisabled={isDisabled}
          label="변환 모드"
          options={[
            { value: 'json_to_string', label: 'JSON to string' },
            { value: 'string_to_json', label: 'String to JSON' },
            { value: 'pick_field', label: 'Pick field' },
            { value: 'join', label: 'Join' },
            { value: 'split', label: 'Split' },
          ]}
          selectedKey={form.transformMode}
          onChange={(transformMode) => onChange({ ...form, transformMode })}
        />
        {form.transformMode === 'pick_field' ? (
          <TextInputField
            isDisabled={isDisabled}
            label="Dot path"
            name="transform-path"
            placeholder="items.0.title"
            value={form.transformPath}
            onChange={(transformPath) => onChange({ ...form, transformPath })}
          />
        ) : null}
        {form.transformMode === 'join' || form.transformMode === 'split' ? (
          <TextInputField
            isDisabled={isDisabled}
            label="Separator"
            name="transform-separator"
            value={form.transformSeparator}
            onChange={(transformSeparator) =>
              onChange({ ...form, transformSeparator })
            }
          />
        ) : null}
      </FieldGrid>
    </FormFieldset>
  )
}
