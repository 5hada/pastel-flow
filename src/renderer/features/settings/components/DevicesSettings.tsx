import { Button } from '@heroui/react'
import type { CurrentDevice } from '../../../../shared/devices'
import type { AppSettings } from '../../../../shared/settings'
import { FormSection } from '../../../shared/components/HeroForm'
import { createEmptyLinkedDevice } from '../../../shared/utils/taskFormTransforms'
import { LinkedDeviceEditor } from './LinkedDeviceEditor'

export type DevicesSettingsProps = {
  currentDevice: CurrentDevice
  form: AppSettings
  onChange(value: AppSettings): void
}

export function DevicesSettings({
  currentDevice,
  form,
  onChange,
}: DevicesSettingsProps) {
  return (
    <FormSection
      ariaLabel="기기 권한"
      eyebrow="Device policy"
      title="기기별 허용 수준"
      action={
        <Button
          className="ghost-button"
          variant="ghost"
          type="button"
          onPress={() =>
            onChange({
              ...form,
              linkedDevices: [...form.linkedDevices, createEmptyLinkedDevice()],
            })
          }
        >
          기기 추가
        </Button>
      }
    >
      <div className="device-current">
        <span>현재 기기</span>
        <strong>{currentDevice.name || '아직 불러오지 못했습니다.'}</strong>
        <code>{currentDevice.id || '기기 ID 없음'}</code>
      </div>

      {form.linkedDevices.length === 0 ? (
        <p className="muted-text">아직 연동된 기기 설정이 없습니다.</p>
      ) : (
        <div className="linked-device-list">
          {form.linkedDevices.map((device, index) => (
            <LinkedDeviceEditor
              device={device}
              key={`${device.id}-${index}`}
              onChange={(updatedDevice) =>
                onChange({
                  ...form,
                  linkedDevices: form.linkedDevices.map(
                    (currentDeviceItem, currentIndex) =>
                      currentIndex === index
                        ? updatedDevice
                        : currentDeviceItem,
                  ),
                })
              }
              onRemove={() =>
                onChange({
                  ...form,
                  linkedDevices: form.linkedDevices.filter(
                    (_device, currentIndex) => currentIndex !== index,
                  ),
                })
              }
            />
          ))}
        </div>
      )}
    </FormSection>
  )
}
