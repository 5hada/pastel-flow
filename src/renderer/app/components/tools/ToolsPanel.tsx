import type {
  RegisteredToolModule,
  ToolModuleField,
  ToolModuleOutputField,
  ToolModuleRunResult,
} from '../../../../shared/tools'
import { DetailItem } from '../tasks/DetailItem'

export type ToolsPanelProps = {
  selectedToolId: string | null
  toolInputValues: Record<string, unknown>
  toolMessage: string | null
  toolModules: RegisteredToolModule[]
  toolRunResult: ToolModuleRunResult | null
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
  toolInputValues,
  toolMessage,
  toolModules,
  toolRunResult,
}: ToolsPanelProps) {
  const selectedTool =
    toolModules.find((tool) => tool.id === selectedToolId) ?? null

  return (
    <section className="mode-panel tool-panel" aria-label="도구">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Tool modules</p>
          <h2>{selectedTool?.manifest.name ?? '도구 모듈'}</h2>
        </div>
        <button type="button" onClick={() => void onRegisterToolModule()}>
          폴더 등록
        </button>
      </div>
      <section className="settings-subsection" aria-label="tool modules">
        {toolModules.length === 0 ? (
          <div className="empty-state-action">
            <p className="empty-state">등록된 도구 모듈이 없습니다.</p>
            <button type="button" onClick={() => void onRegisterToolModule()}>
              도구 폴더 선택
            </button>
          </div>
        ) : selectedTool ? (
          <div className="tool-module-detail">
                <div className="detail-actions">
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => void onCreateToolAction()}
                  >
                    Action 생성
                  </button>
                </div>
                {selectedTool.manifest.description ? (
                  <p className="muted-text">
                    {selectedTool.manifest.description}
                  </p>
                ) : null}
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
                  <DetailItem
                    label="등록 위치"
                    value={selectedTool.sourcePath}
                  />
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
                    value={selectedTool.manifest.indexing?.enabled ? '사용' : '미사용'}
                  />
                </dl>
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
                    <button type="button" onClick={() => void onRunToolModule()}>
                      실행
                    </button>
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
          </div>
        ) : (
          <div className="empty-state-action">
            <p className="empty-state">좌측 패널에서 실행할 도구를 선택하세요.</p>
            <button type="button" onClick={() => void onRegisterToolModule()}>
              도구 폴더 선택
            </button>
          </div>
        )}
      </section>
    </section>
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
        <section className="tool-output-item" key={field.key}>
          <h4>{field.ui?.label ?? field.key}</h4>
          <ToolOutputValue field={field} value={output[field.key]} />
        </section>
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
    return <img className="tool-output-image" alt={field.key} src={value} />
  }

  if (view === 'gallery' && Array.isArray(value)) {
    return (
      <div className="tool-output-gallery">
        {value.map((item, index) => (
          <img
            alt={`${field.key}-${index + 1}`}
            key={`${field.key}-${index}`}
            src={String(item)}
          />
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
    return (
      <a href={value} rel="noreferrer" target="_blank">
        {value}
      </a>
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
        <span className="toggle-switch">
        <input
          checked={value === true || value === 'true'}
          type="checkbox"
          onChange={(event) => onChange(event.target.checked)}
        />
          <span />
        </span>
      </label>
    )
  }

  if (control === 'select' && field.ui?.options?.length) {
    return (
      <label>
        {label}
        {field.required ? ' *' : ''}
        <select
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
        >
          {field.ui.options.map((option) => (
            <option key={String(option.value)} value={String(option.value)}>
              {option.label}
            </option>
          ))}
        </select>
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
        <div className="option-swatch-list">
          {field.ui.options.map((option) => (
            <label className="option-swatch" key={String(option.value)}>
              <input
                checked={String(value ?? '') === String(option.value)}
                name={`tool-${field.key}`}
                type="radio"
                value={String(option.value)}
                onChange={() => onChange(option.value)}
              />
              <span style={{ backgroundColor: option.color }}>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    )
  }

  if (control === 'color') {
    return (
      <label>
        {label}
        {field.required ? ' *' : ''}
        <span className="color-input-row">
          <input
            className="color-input"
            type="color"
            value={String(value || '#1f6f68')}
            onChange={(event) => onChange(event.target.value)}
          />
          <input
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
        <textarea
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
      <input
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
        .filter(Boolean)
  const label = field.ui?.label ?? field.key

  function updateValue(nextValues: string[]) {
    onChange(nextValues.join('\n'))
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
              <input
                value={item}
                onChange={(event) =>
                  updateValue(
                    values.map((currentItem, currentIndex) =>
                      currentIndex === index ? event.target.value : currentItem,
                    ),
                  )
                }
              />
              <button
                className="icon-button"
                type="button"
                onClick={() =>
                  updateValue(
                    values.filter((_item, currentIndex) => currentIndex !== index),
                  )
                }
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
      <button
        className="ghost-button"
        type="button"
        onClick={() => updateValue([...values, ''])}
      >
        항목 추가
      </button>
    </fieldset>
  )
}
