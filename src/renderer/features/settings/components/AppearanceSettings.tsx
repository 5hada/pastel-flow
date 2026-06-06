import {
  ColorArea,
  ColorField,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
  ColorSwatchPicker,
  Button,
  Label,
  parseColor,
  Radio,
  RadioGroup,
} from '@heroui/react'
import type { Color } from '@heroui/react'
import type { CSSProperties } from 'react'
import type { AppSettings, ThemeMode } from '../../../../shared/settings'
import {
  themeColorDefinitions,
  themeColorGroups,
  themePreviewColorSets,
  type ThemeColorDefinition,
} from '../../../../shared/settings/themeTokens'
import {
  FormFieldset,
  SelectField,
  TextAreaField,
  TextInputField,
} from '../../../shared/components/HeroForm'
import { getThemeModeLabel } from '../../../shared/utils/viewLabels'

export type AppearanceSettingsProps = {
  form: AppSettings
  onChange(value: AppSettings): void
}

export function AppearanceSettings({ form, onChange }: AppearanceSettingsProps) {
  return (
    <div className="appearance-settings-layout">
      <div className="appearance-theme-grid">
        <FormFieldset className="theme-mode-fieldset" legend="테마">
          <RadioGroup
            className="segmented-control"
            name="themeMode"
            value={form.themeMode}
            onChange={(themeMode) =>
              onChange({
                ...form,
                themeMode: themeMode as ThemeMode,
              })
            }
          >
            {(['system', 'light', 'dark', 'custom'] as ThemeMode[]).map(
              (themeMode) => (
                <Radio key={themeMode} value={themeMode}>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  <Radio.Content>
                    <Label>{getThemeModeLabel(themeMode)}</Label>
                  </Radio.Content>
                </Radio>
              ),
            )}
          </RadioGroup>
        </FormFieldset>

        <ThemePreview form={form} />
      </div>

      {form.themeMode === 'custom' ? (
        <ThemeTokenEditor form={form} onChange={onChange} />
      ) : null}

      <div className="appearance-display-grid">
        <SelectField
          label="작업 목록 표시 형식"
          options={[
            { value: 'grid', label: '그리드' },
            { value: 'list', label: '목록' },
          ]}
          selectedKey={form.workflowListDisplayMode}
          onChange={(workflowListDisplayMode) =>
            onChange({
              ...form,
              workflowListDisplayMode,
            })
          }
        />

        <TextInputField
          label="실행 그리드 열 수"
          max={8}
          min={2}
          name="workflow-grid-column-count"
          type="number"
          value={String(form.workflowGridColumnCount)}
          onChange={(value) =>
            onChange({
              ...form,
              workflowGridColumnCount: Number(value),
            })
          }
        />

        <TextAreaField
          className="appearance-hierarchy-field"
          label="Workflow 실행 화면 계층 구조"
          name="workflow-hierarchy"
          rows={4}
          value={form.workflowHierarchy.join('\n')}
          onChange={(value) =>
            onChange({
              ...form,
              workflowHierarchy: value
                .split(/\r?\n/)
                .map((item) => item.trim())
                .filter(Boolean),
            })
          }
        />
      </div>
    </div>
  )
}

function ThemePreview({ form }: { form: AppSettings }) {
  return (
    <div
      className="theme-preview"
      data-preview-theme={form.themeMode}
      style={getThemePreviewStyle(form)}
    >
      <div className="theme-preview-shell">
        <aside className="theme-preview-rail">
          <span />
          <strong>PF</strong>
          <i />
        </aside>
        <main className="theme-preview-main">
          <div className="theme-preview-topbar">
            <span>{getThemeModeLabel(form.themeMode)}</span>
            <Button type="button">Primary</Button>
          </div>
          <section className="theme-preview-panel">
            <div className="theme-preview-selected-row">
              <strong>Selected workflow</strong>
              <small>Muted metadata</small>
            </div>
            <div className="theme-preview-controls">
              <span>Input value</span>
              <em>Readonly</em>
            </div>
            <div className="theme-preview-statuses">
              <span className="is-info">Info</span>
              <span className="is-success">Success</span>
              <span className="is-warning">Warning</span>
              <span className="is-danger">Danger</span>
            </div>
          <div className="theme-preview-actions">
              <Button type="button">Accent</Button>
              <Button type="button">Danger</Button>
          </div>
          </section>
        </main>
      </div>
    </div>
  )
}

function ThemeTokenEditor({ form, onChange }: AppearanceSettingsProps) {
  return (
    <div className="theme-token-editor">
      {themeColorGroups.map((group) => (
        <section className="theme-token-group" key={group.id}>
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">{group.label}</p>
              <h3>{group.label} tokens</h3>
            </div>
          </div>
          <div className="theme-color-grid">
            {themeColorDefinitions
              .filter((definition) => definition.group === group.id)
              .map((definition) => (
                <ThemeColorPicker
                  definition={definition}
                  key={definition.key}
                  value={form.customThemeColors[definition.key]}
                  onChange={(value) =>
                    onChange({
                      ...form,
                      customThemeColors: {
                        ...form.customThemeColors,
                        [definition.key]: value,
                      },
                    })
                  }
                />
              ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function ThemeColorPicker({
  definition,
  value,
  onChange,
}: {
  definition: ThemeColorDefinition
  value: string
  onChange(value: string): void
}) {
  const color = parseColor(value)

  function updateColor(nextColor: Color) {
    onChange(nextColor.toString('hex'))
  }

  return (
    <div className="theme-token-row">
      <ColorPicker value={color} onChange={updateColor}>
        <ColorPicker.Trigger>
          <ColorSwatch color={color} size="lg" />
          <span>
            <strong>{definition.label}</strong>
            <small>{definition.description}</small>
          </span>
        </ColorPicker.Trigger>
        <ColorPicker.Popover className="theme-color-popover">
          <ColorSwatchPicker className="theme-color-presets" size="xs">
            {themeColorDefinitions.map((preset) => (
              <ColorSwatchPicker.Item
                color={preset.defaultValue}
                key={preset.key}
              >
                <ColorSwatchPicker.Swatch />
              </ColorSwatchPicker.Item>
            ))}
          </ColorSwatchPicker>
          <ColorArea
            aria-label={`${definition.label} 색상 영역`}
            colorSpace="hsb"
            xChannel="saturation"
            yChannel="brightness"
          >
            <ColorArea.Thumb />
          </ColorArea>
          <ColorSlider
            aria-label={`${definition.label} hue`}
            channel="hue"
            colorSpace="hsb"
          >
            <ColorSlider.Track>
              <ColorSlider.Thumb />
            </ColorSlider.Track>
          </ColorSlider>
          <ColorField aria-label={`${definition.label} hex`}>
            <ColorField.Group>
              <ColorField.Prefix>
                <ColorSwatch color={color} size="xs" />
              </ColorField.Prefix>
              <ColorField.Input />
            </ColorField.Group>
          </ColorField>
        </ColorPicker.Popover>
      </ColorPicker>
      <code>{definition.cssVariable}</code>
    </div>
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
      colors[definition.key],
    ]),
  ) as CSSProperties
}
