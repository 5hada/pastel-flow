import { Button } from '@heroui/react'
import {
  getDeviceAccessLevelLabel,
  type LinkedDevice,
} from '../../../../shared/devices'
import {
  SelectField,
  TextInputField,
} from '../../../shared/components/HeroForm'

export type LinkedDeviceEditorProps = {
  device: LinkedDevice
  onChange(device: LinkedDevice): void
  onRemove(): void
}

export function LinkedDeviceEditor({
  device,
  onChange,
  onRemove,
}: LinkedDeviceEditorProps) {
  return (
    <div className="linked-device-row">
      <TextInputField
        label="기기 이름"
        name={`linked-device-${device.id}-name`}
        value={device.name}
        onChange={(value) =>
            onChange({
              ...device,
              name: value,
            })
        }
      />
      <TextInputField
        label="기기 ID"
        name={`linked-device-${device.id}-id`}
        value={device.id}
        onChange={(value) =>
            onChange({
              ...device,
              id: value,
            })
        }
      />
      <SelectField
        label="허용 수준"
        selectedKey={device.accessLevel}
        options={(['blocked', 'visible', 'executable', 'trusted'] as const).map(
          (accessLevel) => ({
            value: accessLevel,
            label: getDeviceAccessLevelLabel(accessLevel),
          }),
        )}
        onChange={(accessLevel) =>
            onChange({
              ...device,
              accessLevel,
            })
        }
      />
      <Button
        className="danger-button"
        variant="danger"
        type="button"
        onPress={onRemove}
      >
        제거
      </Button>
    </div>
  )
}
