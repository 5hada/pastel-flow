import { Button, Card } from '@heroui/react'
import type { AppSettings } from '../../../../shared/settings'
import {
  CheckboxField,
  TextInputField,
} from '../../../shared/components/HeroForm'

export type GeneralSettingsProps = {
  form: AppSettings
  onChange(value: AppSettings): void
  onRegisterToolModule(): Promise<void>
}

export function GeneralSettings({
  form,
  onChange,
  onRegisterToolModule,
}: GeneralSettingsProps) {
  return (
    <>
      <CheckboxField
        label="시작 프로그램으로 설정"
        isSelected={form.startAtLogin}
        onChange={(startAtLogin) =>
          onChange({
            ...form,
            startAtLogin,
          })
        }
      />

      <TextInputField
        label="새 Action 기본 이름"
        name="default-action-name"
        value={form.defaultActionName}
        onChange={(defaultActionName) =>
          onChange({
            ...form,
            defaultActionName,
          })
        }
      />

      <TextInputField
        label="새 Workflow 기본 이름"
        name="default-workflow-name"
        value={form.defaultWorkflowName}
        onChange={(defaultWorkflowName) =>
          onChange({
            ...form,
            defaultWorkflowName,
          })
        }
      />

      <Card className="settings-subsection" aria-label="도구 폴더">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow">Tools</p>
            <h3>도구 폴더 등록</h3>
          </div>
          <Button
            variant="secondary"
            type="button"
            onPress={() => void onRegisterToolModule()}
          >
            폴더 등록
          </Button>
        </div>
      </Card>
    </>
  )
}
