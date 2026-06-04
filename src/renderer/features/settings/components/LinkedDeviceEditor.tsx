import { Button, Card, Input, ListBox, Select } from '@heroui/react'
import {
  getDeviceAccessLevelLabel,
  type LinkedDevice,
} from '../../../../shared/devices'

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
    <Card className="linked-device-row">
      <label>
        기기 이름
        <Input
          value={device.name}
          onChange={(event) =>
            onChange({
              ...device,
              name: event.target.value,
            })
          }
        />
      </label>
      <label>
        기기 ID
        <Input
          value={device.id}
          onChange={(event) =>
            onChange({
              ...device,
              id: event.target.value,
            })
          }
        />
      </label>
      <label>
        허용 수준
        <Select
          selectedKey={device.accessLevel}
          onSelectionChange={(key) =>
            onChange({
              ...device,
              accessLevel: String(key) as typeof device.accessLevel,
            })
          }
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {(['blocked', 'visible', 'executable', 'trusted'] as const).map(
                (accessLevel) => (
                  <ListBox.Item
                    id={accessLevel}
                    key={accessLevel}
                    textValue={getDeviceAccessLevelLabel(accessLevel)}
                  >
                    {getDeviceAccessLevelLabel(accessLevel)}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ),
              )}
            </ListBox>
          </Select.Popover>
        </Select>
      </label>
      <Button
        className="danger-button"
        variant="danger"
        type="button"
        onPress={onRemove}
      >
        제거
      </Button>
    </Card>
  )
}
