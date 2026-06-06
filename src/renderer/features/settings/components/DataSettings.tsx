import {
  FormSection,
  TextInputField,
} from '../../../shared/components/HeroForm'
import { SettingsDetailItem } from './SettingsDetailItem'

export type DataSettingsProps = {
  userDataPath: string
}

export function DataSettings({ userDataPath }: DataSettingsProps) {
  return (
    <FormSection ariaLabel="데이터 관리" eyebrow="Data" title="로컬 데이터 위치">
      <TextInputField
        label="userData 위치"
        name="user-data-path"
        value={userDataPath || '아직 불러오지 못했습니다.'}
        readOnly
      />
      <dl className="detail-list">
        <SettingsDetailItem label="작업 저장" value="tasks.json" />
        <SettingsDetailItem label="도구 등록" value="toolModules.json" />
        <SettingsDetailItem label="도구 복사" value="tool-modules/" />
        <SettingsDetailItem label="Secret 저장" value="secrets.json" />
      </dl>
    </FormSection>
  )
}
