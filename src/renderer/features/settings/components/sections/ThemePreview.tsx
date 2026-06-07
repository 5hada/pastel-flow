import {
  Button,
  Card,
  Checkbox,
  Chip,
  Input,
  Label,
  Surface,
  Switch,
  TextField,
} from '@heroui/react'
import type { CSSProperties } from 'react'
import type { AppSettings } from '../../../../../shared/settings'
import {
  themeColorDefinitions,
  themePreviewColorSets,
} from '../../../../../shared/settings/themeTokens'

export function ThemePreview({ form }: { form: AppSettings }) {
  return (
    <Card
      aria-label="테마 미리보기"
      className="theme-preview"
      style={getThemePreviewStyle(form)}
    >
      <Card.Header>
        <Card.Title>Preview</Card.Title>
        <Card.Description>HeroUI token surface</Card.Description>
      </Card.Header>
      <Card.Content>
        <Surface className="theme-preview-shell">
          <Surface className="theme-preview-rail">
            <Button size="sm" type="button">
              PF
            </Button>
            <Button isDisabled size="sm" type="button" variant="ghost">
              A
            </Button>
            <Button isDisabled size="sm" type="button" variant="ghost">
              T
            </Button>
            <Switch isDisabled isSelected>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch>
          </Surface>

          <Surface className="theme-preview-main">
            <div className="theme-preview-tabs" aria-label="미리보기 탭">
              <Button size="sm" type="button" variant="secondary">
                Workflow
              </Button>
              <Button isDisabled size="sm" type="button" variant="ghost">
                Todo
              </Button>
              <Button isDisabled size="sm" type="button" variant="ghost">
                Tool
              </Button>
            </div>
            <Card variant="secondary">
              <Card.Content className="theme-preview-panel">
                <TextField value="선택된 항목" isReadOnly>
                  <Label>항목 이름</Label>
                  <Input />
                </TextField>

                <div className="theme-preview-controls">
                  <Checkbox isDisabled isSelected>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    <Checkbox.Content>
                      <Label>완료됨</Label>
                    </Checkbox.Content>
                  </Checkbox>
                  <Switch isDisabled isSelected>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    <Switch.Content>
                      <Label>활성</Label>
                    </Switch.Content>
                  </Switch>
                </div>

                <div className="theme-preview-statuses">
                  <Chip color="success">
                    <Chip.Label>Success</Chip.Label>
                  </Chip>
                  <Chip color="warning">
                    <Chip.Label>Warning</Chip.Label>
                  </Chip>
                  <Chip color="danger">
                    <Chip.Label>Danger</Chip.Label>
                  </Chip>
                </div>
              </Card.Content>
            </Card>
          </Surface>
        </Surface>
      </Card.Content>
      <Card.Footer className="theme-preview-actions">
        <Button type="button" variant="outline">
          취소
        </Button>
        <Button type="button">저장</Button>
      </Card.Footer>
    </Card>
  )
}

function getThemePreviewStyle(form: AppSettings): CSSProperties {
  const colors =
    form.themeMode === 'custom'
      ? form.customThemeColors
      : themePreviewColorSets[form.themeMode]

  return Object.fromEntries(
    themeColorDefinitions.map((definition) => [
      definition.cssVariable,
      colors[definition.key] ?? definition.defaultValue,
    ]),
  ) as CSSProperties
}
