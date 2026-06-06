import type { AppSettings } from '../../../../shared/settings'
import { FormSection, TextInputField } from '../../../shared/components/HeroForm'

export type ShortcutsSettingsProps = {
  form: AppSettings
  onChange(value: AppSettings): void
}

const shortcutFields: {
  key: keyof AppSettings['shortcuts']
  label: string
}[] = [
  { key: 'refresh', label: '새로고침' },
  { key: 'openRun', label: '실행 화면 열기' },
  { key: 'openActions', label: 'Action 화면 열기' },
  { key: 'openWorkflows', label: 'Workflow 화면 열기' },
  { key: 'openTools', label: '도구 화면 열기' },
  { key: 'openSettings', label: '설정 열기' },
  { key: 'runSelectedWorkflow', label: '선택 Workflow 실행' },
]

export function ShortcutsSettings({ form, onChange }: ShortcutsSettingsProps) {
  return (
    <FormSection
      ariaLabel="단축키"
      eyebrow="Shortcuts"
      title="단축키 사용자 정의"
    >
      <div className="shortcut-list">
        {shortcutFields.map((field) => (
          <TextInputField
            label={field.label}
            key={field.key}
            name={`shortcut-${field.key}`}
            value={form.shortcuts[field.key]}
            onChange={(value) =>
              onChange({
                ...form,
                shortcuts: {
                  ...form.shortcuts,
                  [field.key]: value,
                },
              })
            }
          />
        ))}
      </div>
    </FormSection>
  )
}
