import type {
  AppSettings,
  BrowserExecutablePaths,
} from '../../../../shared/settings'
import { getBrowserProfileSourceLabel } from '../../../shared/utils/viewLabels'
import {
  FieldGrid,
  FormSection,
  SelectField,
  TextInputField,
} from '../../../shared/components/HeroForm'
import { ProfilePresetEditor } from './ProfilePresetEditor'

export type BrowserSettingsProps = {
  form: AppSettings
  onChange(value: AppSettings): void
}

export function BrowserSettings({ form, onChange }: BrowserSettingsProps) {
  return (
    <FormSection
      ariaLabel="브라우저 설정"
      eyebrow="Browser"
      title="브라우저 실행 정책"
    >
      <SelectField
        label="기본 브라우저"
        selectedKey={form.defaultBrowserKind}
        options={(['chrome', 'edge', 'chromium'] as const).map(
          (browserKind) => ({
            value: browserKind,
            label: getBrowserKindLabel(browserKind),
            textValue: browserKind,
          }),
        )}
        onChange={(defaultBrowserKind) =>
            onChange({
              ...form,
              defaultBrowserKind,
            })
        }
      />
      <FieldGrid>
        <SelectField
          label="기본 실행 방식"
          selectedKey={form.defaultBrowserRunMode}
          options={[
            { value: 'dedicated_profile', label: '전용 프로필' },
            { value: 'extension_controlled', label: '확장 프로그램 제어' },
            { value: 'default_browser_deeplink', label: '기본 브라우저 연결' },
          ]}
          onChange={(defaultBrowserRunMode) =>
              onChange({
                ...form,
                defaultBrowserRunMode,
              })
          }
        />
        <SelectField
          label="기본 프로필 소스"
          selectedKey={form.defaultBrowserProfileSource}
          options={(['action_profile', 'existing_profile'] as const).map(
            (profileSource) => ({
              value: profileSource,
              label: getBrowserProfileSourceLabel(profileSource),
            }),
          )}
          onChange={(defaultBrowserProfileSource) =>
              onChange({
                ...form,
                defaultBrowserProfileSource,
              })
          }
        />
      </FieldGrid>

      <ProfilePresetEditor form={form} onChange={onChange} />

      {(['chrome', 'edge', 'chromium'] as const).map((browserKind) => (
        <TextInputField
          label={`${getBrowserKindLabel(browserKind)} 실행 파일 경로`}
          key={browserKind}
          name={`${browserKind}-executable-path`}
          value={form.browserExecutablePaths[browserKind] ?? ''}
          onChange={(value) =>
            onChange({
              ...form,
              browserExecutablePaths: {
                ...form.browserExecutablePaths,
                [browserKind]: value,
              },
            })
          }
          placeholder="비워두면 자동으로 찾습니다."
        />
      ))}
    </FormSection>
  )
}

function getBrowserKindLabel(browserKind: keyof BrowserExecutablePaths) {
  if (browserKind === 'chrome') {
    return 'Chrome'
  }

  if (browserKind === 'edge') {
    return 'Edge'
  }

  return 'Chromium'
}
