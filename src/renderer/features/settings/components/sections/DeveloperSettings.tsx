import type { AppSettings } from '../../../../../shared/settings'
import {
  CheckboxField,
  FormSection,
} from '../../../../shared/components/HeroForm'

export type DeveloperSettingsProps = {
  form: AppSettings
  onChange(value: AppSettings): void
}

export function DeveloperSettings({ form, onChange }: DeveloperSettingsProps) {
  return (
    <FormSection
      ariaLabel="개발자 설정"
      eyebrow="Developer"
      title="세부 정보 표시"
    >
      {[
        ['showIds', 'ID 표시'],
        ['showPaths', '세부 위치 경로 표시'],
        ['showToolMetadata', '도구 메타데이터 표시'],
      ].map(([key, label]) => (
        <CheckboxField
          key={key}
          label={label}
          isSelected={
            form.developerVisibility[
              key as keyof typeof form.developerVisibility
            ]
          }
          onChange={(isSelected) =>
            onChange({
              ...form,
              developerVisibility: {
                ...form.developerVisibility,
                [key]: isSelected,
              },
            })
          }
        />
      ))}
    </FormSection>
  )
}
