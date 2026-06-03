import { Button, Card, Checkbox, Input, Label, ListBox, Radio, RadioGroup, Select, TextArea } from '@heroui/react'
import type {
  RegisteredToolModule,
  ToolModuleField,
  ToolModuleOutputField,
  ToolModuleRunResult,
} from '../../../shared/tools'

export type ToolsPanelProps = {
  selectedToolId: string | null
  toolInputValues: Record<string, unknown>
  toolMessage: string | null
  toolModules: RegisteredToolModule[]
  toolRunResult: ToolModuleRunResult | null
  showToolMetadata: boolean
  onCreateToolAction(): Promise<void>
  onRegisterToolModule(): Promise<void>
  onRunToolModule(): Promise<void>
  onToolInputChange(key: string, value: unknown): void
}

export function ToolsPanel({
  onCreateToolAction,
  onRegisterToolModule,
  onRunToolModule,
  onToolInputChange,
  selectedToolId,
  showToolMetadata,
  toolInputValues,
  toolMessage,
  toolModules,
  toolRunResult,
}: ToolsPanelProps) {
  const selectedTool =
    toolModules.find((tool) => tool.id === selectedToolId) ?? null

  return (
    <Card className="mode-panel tool-panel" aria-label="도구">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Tool modules</p>
          <h2>{selectedTool?.manifest.name ?? '도구 모듈'}</h2>
        </div>
        {toolModules.length > 0 ? (
          <Button
            variant="secondary"
            type="button"
            onClick={() => void onCreateToolAction()}
          >
            Action 생성
          </Button>
        ) : null}
      </div>
      <Card className="settings-subsection" aria-label="tool modules">
        {toolModules.length === 0 ? (
          <Card className="empty-state-action">
            <p className="empty-state">등록된 도구 모듈이 없습니다.</p>
            <Button
              variant="primary"
              type="button"
              onClick={() => void onRegisterToolModule()}
            >
              도구 폴더 선택
            </Button>
          </Card>
        ) : selectedTool ? (
          <div className="tool-module-detail">
                {selectedTool.manifest.description ? (
                  <p className="muted-text">
                    {selectedTool.manifest.description}
                  </p>
                ) : null}
                <div className="tool-runner">
                  {selectedTool.manifest.inputs.length > 0 ? (
                    selectedTool.manifest.inputs.map((field) => (
                      <ToolInputField
                        field={field}
                        key={field.key}
                        value={toolInputValues[field.key]}
                        onChange={(value) => onToolInputChange(field.key, value)}
                      />
                    ))
                  ) : (
                    <p className="empty-state">입력 없이 실행할 수 있습니다.</p>
                  )}
                  <div className="form-actions">
                    <Button
                      variant="primary"
                      type="button"
                      onClick={() => void onRunToolModule()}
                    >
                      실행
                    </Button>
                  </div>
                </div>
                {toolMessage ? (
                  <p className="panel-success">{toolMessage}</p>
                ) : null}
                {toolRunResult ? (
                  <ToolOutputRenderer
                    output={toolRunResult.output}
                    outputs={selectedTool.manifest.outputs}
                  />
                ) : null}
                {showToolMetadata ? (
                  <section className="tool-metadata-panel" aria-label="도구 기타 정보">
                    <dl className="detail-list">
                      <DetailItem
                        label="입력"
                        value={`${selectedTool.manifest.inputs.length}개`}
                      />
                      <DetailItem
                        label="출력"
                        value={`${selectedTool.manifest.outputs.length}개`}
                      />
                      <DetailItem
                        label="권한"
                        value={
                          selectedTool.manifest.permissions.length > 0
                            ? selectedTool.manifest.permissions.join(', ')
                            : '없음'
                        }
                      />
                      <DetailItem label="등록 위치" value={selectedTool.sourcePath} />
                      <DetailItem
                        label="Assets"
                        value={`${selectedTool.manifest.assets.length}개`}
                      />
                      <DetailItem
                        label="Data sources"
                        value={`${selectedTool.manifest.dataSources.length}개`}
                      />
                      <DetailItem
                        label="Datasets"
                        value={`${selectedTool.manifest.datasets.length}개`}
                      />
                      <DetailItem
                        label="Indexing"
                        value={
                          selectedTool.manifest.indexing?.enabled ? '사용' : '미사용'
                        }
                      />
                    </dl>
                  </section>
                ) : null}
          </div>
        ) : (
          <Card className="empty-state-action">
            <p className="empty-state">좌측 패널에서 실행할 도구를 선택하세요.</p>
            <Button
              variant="primary"
              type="button"
              onClick={() => void onRegisterToolModule()}
            >
              도구 폴더 선택
            </Button>
          </Card>
        )}
      </Card>
    </Card>
  )
}

type ToolOutputRendererProps = {
  output: Record<string, unknown>
  outputs: ToolModuleOutputField[]
}

function ToolOutputRenderer({ output, outputs }: ToolOutputRendererProps) {
  if (outputs.length === 0) {
    return (
      <pre className="tool-output">{JSON.stringify(output, null, 2)}</pre>
    )
  }

  return (
    <div className="tool-output-list">
      {outputs.map((field) => (
        <Card className="tool-output-item" key={field.key}>
          <h4>{field.ui?.label ?? field.key}</h4>
          <ToolOutputValue field={field} value={output[field.key]} />
        </Card>
      ))}
    </div>
  )
}

function ToolOutputValue({
  field,
  value,
}: {
  field: ToolModuleOutputField
  value: unknown
}) {
  const view = field.ui?.view

  if (value === undefined || value === null || value === '') {
    return <p className="empty-state">{field.ui?.emptyText ?? '결과 없음'}</p>
  }

  if (view === 'image' && typeof value === 'string') {
    return isSafeDisplayUrl(value) ? (
      <img className="tool-output-image" alt={field.key} src={value} />
    ) : (
      <p className="empty-state">표시할 수 없는 이미지 URL입니다.</p>
    )
  }

  if (view === 'gallery' && Array.isArray(value)) {
    return (
      <div className="tool-output-gallery">
        {value.map((item, index) => (
          isSafeDisplayUrl(String(item)) ? (
            <img
              alt={`${field.key}-${index + 1}`}
              key={`${field.key}-${index}`}
              src={String(item)}
            />
          ) : null
        ))}
      </div>
    )
  }

  if (view === 'palette' && Array.isArray(value)) {
    return (
      <div className="option-swatch-list">
        {value.map((item, index) => (
          <span
            className="palette-chip"
            key={`${field.key}-${index}`}
            style={{ backgroundColor: String(item) }}
          >
            {String(item)}
          </span>
        ))}
      </div>
    )
  }

  if (view === 'link' && typeof value === 'string') {
    return isSafeLinkUrl(value) ? (
      <a href={value} rel="noreferrer" target="_blank">
        {value}
      </a>
    ) : (
      <p className="empty-state">열 수 없는 링크입니다.</p>
    )
  }

  if (
    view === 'list' ||
    view === 'links' ||
    view === 'files' ||
    Array.isArray(value)
  ) {
    return (
      <ul className="tool-output-list-values">
        {(Array.isArray(value) ? value : [value]).map((item, index) => (
          <li key={`${field.key}-${index}`}>{String(item)}</li>
        ))}
      </ul>
    )
  }

  if (view === 'table' && Array.isArray(value)) {
    return (
      <pre className="tool-output">{JSON.stringify(value, null, 2)}</pre>
    )
  }

  if (view === 'code' || typeof value === 'object') {
    return (
      <pre className="tool-output">{JSON.stringify(value, null, 2)}</pre>
    )
  }

  return <p className="tool-output-text">{String(value)}</p>
}

type ToolInputFieldProps = {
  field: ToolModuleField
  value: unknown
  onChange(value: unknown): void
}

function ToolInputField({ field, onChange, value }: ToolInputFieldProps) {
  const control = field.ui?.control
  const label = field.ui?.label ?? field.key

  if (control === 'toggle' || control === 'checkbox' || field.type === 'boolean') {
    return (
      <label className="tool-field toggle-field">
        <span>
          {label}
          {field.required ? ' *' : ''}
        </span>
        <Checkbox
          className="toggle-switch"
          isSelected={value === true || value === 'true'}
          onChange={onChange}
        >
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
        </Checkbox>
      </label>
    )
  }

  if (control === 'select' && field.ui?.options?.length) {
    return (
      <label>
        {label}
        {field.required ? ' *' : ''}
        <Select
          selectedKey={String(value ?? '')}
          onSelectionChange={(key) => onChange(String(key))}
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {field.ui.options.map((option) => (
                <ListBox.Item
                  id={String(option.value)}
                  key={String(option.value)}
                  textValue={option.label}
                >
                  {option.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </label>
    )
  }

  if (control === 'radio' && field.ui?.options?.length) {
    return (
      <fieldset className="settings-fieldset">
        <legend>
          {label}
          {field.required ? ' *' : ''}
        </legend>
        <RadioGroup
          className="option-swatch-list"
          name={`tool-${field.key}`}
          value={String(value ?? '')}
          onChange={onChange}
        >
          {field.ui.options.map((option) => (
            <Radio className="option-swatch" key={String(option.value)} value={String(option.value)}>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              <Radio.Content>
                <Label>
                  <span style={{ backgroundColor: option.color }}>{option.label}</span>
                </Label>
              </Radio.Content>
            </Radio>
          ))}
        </RadioGroup>
      </fieldset>
    )
  }

  if (control === 'color') {
    return (
      <label>
        {label}
        {field.required ? ' *' : ''}
        <span className="color-input-row">
          <Input
            className="color-input"
            type="color"
            value={String(value || '#1f6f68')}
            onChange={(event) => onChange(event.target.value)}
          />
          <Input
            value={String(value ?? '')}
            onChange={(event) => onChange(event.target.value)}
          />
        </span>
      </label>
    )
  }

  if (control === 'list' || field.type === 'string[]' || field.type === 'number[]') {
    return (
      <ToolListInputField field={field} value={value} onChange={onChange} />
    )
  }

  if (
    control === 'json' ||
    control === 'textarea' ||
    field.type === 'json' ||
    field.ui?.rows
  ) {
    return (
      <label>
        {label}
        {field.required ? ' *' : ''}
        <TextArea
          placeholder={field.ui?.placeholder}
          rows={field.ui?.rows}
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
        />
        {field.ui?.helpText ? (
          <small className="field-help">{field.ui.helpText}</small>
        ) : null}
      </label>
    )
  }

  return (
    <label>
      {label}
      {field.required ? ' *' : ''}
      <Input
        max={field.ui?.max}
        min={field.ui?.min}
        placeholder={field.ui?.placeholder}
        step={field.ui?.step}
        type={field.type === 'number' || control === 'number' ? 'number' : 'text'}
        value={String(value ?? '')}
        onChange={(event) => onChange(event.target.value)}
      />
      {field.ui?.helpText ? (
        <small className="field-help">{field.ui.helpText}</small>
      ) : null}
    </label>
  )
}

function ToolListInputField({ field, onChange, value }: ToolInputFieldProps) {
  const values = Array.isArray(value)
    ? value.map(String)
    : String(value ?? '')
        .split('\n')
  const label = field.ui?.label ?? field.key

  function updateValue(nextValues: string[]) {
    onChange(nextValues)
  }

  return (
    <fieldset className="settings-fieldset">
      <legend>
        {label}
        {field.required ? ' *' : ''}
      </legend>
      <div className="tool-list-editor">
        {values.length === 0 ? (
          <p className="empty-state">항목이 없습니다.</p>
        ) : (
          values.map((item, index) => (
            <div className="tool-list-row" key={`${field.key}-${index}`}>
              <Input
                value={item}
                onChange={(event) =>
                  updateValue(
                    values.map((currentItem, currentIndex) =>
                      currentIndex === index ? event.target.value : currentItem,
                    ),
                  )
                }
              />
              <Button
                className="icon-button"
                isIconOnly
                variant="ghost"
                type="button"
                onClick={() =>
                  updateValue(
                    values.filter((_item, currentIndex) => currentIndex !== index),
                  )
                }
              >
                ×
              </Button>
            </div>
          ))
        )}
      </div>
      <Button
        className="ghost-button"
        variant="ghost"
        type="button"
        onClick={() => updateValue([...values, ''])}
      >
        항목 추가
      </Button>
    </fieldset>
  )
}

function isSafeDisplayUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' ||
      url.protocol === 'http:' ||
      url.protocol === 'data:' ||
      url.protocol === 'blob:'
    )
  } catch {
    return false
  }
}

function isSafeLinkUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <Card className="detail-item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </Card>
  )
}
