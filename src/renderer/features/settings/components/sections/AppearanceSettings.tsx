import {
  Button,
  ColorArea,
  ColorField,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
  Label,
  Radio,
  RadioGroup,
  parseColor,
} from '@heroui/react'
import type { Color } from '@heroui/react'
import { useEffect, useState } from 'react'
import type {
  AppSettings,
  CustomThemeColors,
  ThemeColorKey,
  ThemeMode,
} from '../../../../../shared/settings'
import {
  createDefaultCustomThemeColors,
  themeColorDefinitions,
  themeColorGroups,
  type ThemeColorDefinition,
} from '../../../../../shared/settings/themeTokens'
import {
  FormFieldset,
  SelectField,
  TextAreaField,
  TextInputField,
} from '../../../../shared/components/HeroForm'
import { getThemeModeLabel } from '../../../../shared/utils/viewLabels'
import { ThemePreview } from './ThemePreview'

export type AppearanceSettingsProps = {
  form: AppSettings
  onChange(value: AppSettings): void
}

const selectableThemeModes: ThemeMode[] = ['system', 'light', 'dark', 'custom']

export function AppearanceSettings({ form, onChange }: AppearanceSettingsProps) {
  return (
    <div className="appearance-settings-layout">
      <div className="appearance-theme-grid">
        <FormFieldset className="theme-mode-fieldset" legend="테마">
          <RadioGroup
            className="segmented-control"
            name="themeMode"
            orientation="horizontal"
            value={form.themeMode}
            onChange={(themeMode) =>
              onChange({
                ...form,
                themeMode: themeMode as ThemeMode,
              })
            }
          >
            {selectableThemeModes.map((themeMode) => (
              <Radio key={themeMode} value={themeMode}>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                <Radio.Content>
                  <Label>{getThemeModeLabel(themeMode)}</Label>
                </Radio.Content>
              </Radio>
            ))}
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

function ThemeTokenEditor({
  form,
  onChange,
}: {
  form: AppSettings
  onChange(value: AppSettings): void
}) {
  return (
    <section className="theme-token-editor" aria-label="사용자 지정 테마">
      {themeColorGroups.map((group) => {
        const definitions = themeColorDefinitions.filter(
          (definition) => definition.group === group.id,
        )

        return (
          <FormFieldset
            className="theme-token-group"
            key={group.id}
            legend={group.label}
          >
            <div className="theme-color-grid">
              {definitions.map((definition) => (
                <ThemeColorPicker
                  definition={definition}
                  key={definition.key}
                  value={form.customThemeColors[definition.key]}
                  onChange={(value) =>
                    onChange({
                      ...form,
                      customThemeColors: getNextCustomThemeColors(
                        form.customThemeColors,
                        definition.key,
                        value,
                      ),
                    })
                  }
                />
              ))}
            </div>
          </FormFieldset>
        )
      })}
    </section>
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
  const safeValue = value ?? definition.defaultValue
  const [draftColor, setDraftColor] = useState(() =>
    getParsedColor(safeValue, definition.defaultValue),
  )

  useEffect(() => {
    setDraftColor(getParsedColor(safeValue, definition.defaultValue))
  }, [definition.defaultValue, safeValue])

  return (
    <div className="theme-token-row">
      <span>
        <strong>{definition.label}</strong>
        <small>{definition.cssVariable}</small>
      </span>
      <ColorPicker
        aria-label={definition.label}
        value={draftColor}
        onChange={setDraftColor}
      >
        <ColorPicker.Trigger>
          <Button type="button" variant="outline">
            <ColorSwatch color={draftColor} />
          </Button>
        </ColorPicker.Trigger>
        <ColorPicker.Popover className="theme-color-popover">
          <ColorArea
            colorSpace="hsb"
            xChannel="saturation"
            yChannel="brightness"
          >
            <ColorArea.Thumb />
          </ColorArea>
          <ColorSlider channel="hue" colorSpace="hsb">
            <ColorSlider.Track>
              <ColorSlider.Thumb />
            </ColorSlider.Track>
          </ColorSlider>
          <ColorField
            value={draftColor}
            onChange={(nextColor) => {
              if (nextColor) {
                setDraftColor(nextColor)
              }
            }}
          >
            <Label>{definition.label}</Label>
            <ColorField.Group>
              <ColorField.Input />
            </ColorField.Group>
          </ColorField>
          <Button type="button" onPress={() => onChange(formatColor(draftColor))}>
            적용
          </Button>
        </ColorPicker.Popover>
      </ColorPicker>
    </div>
  )
}

function getParsedColor(value: string, fallbackValue: string): Color {
  try {
    return parseColor(value)
  } catch {
    return parseColor(fallbackValue)
  }
}

function formatColor(color: Color): string {
  return color.toString('hex')
}

function getNextCustomThemeColors(
  currentColors: Partial<CustomThemeColors>,
  key: ThemeColorKey,
  value: string,
): CustomThemeColors {
  return {
    ...createDefaultCustomThemeColors(),
    ...currentColors,
    [key]: value,
  }
}
