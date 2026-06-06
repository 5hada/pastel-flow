import { Card } from '@heroui/react'
import type { ToolModuleOutputField } from '../../../../shared/tools'

type ToolOutputRendererProps = {
  output: Record<string, unknown>
  outputs: ToolModuleOutputField[]
}

export function ToolOutputRenderer({ output, outputs }: ToolOutputRendererProps) {
  if (outputs.length === 0) {
    return <pre className="tool-output">{JSON.stringify(output, null, 2)}</pre>
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
        {value.map((item, index) =>
          isSafeDisplayUrl(String(item)) ? (
            <img
              alt={`${field.key}-${index + 1}`}
              key={`${field.key}-${index}`}
              src={String(item)}
            />
          ) : null,
        )}
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
    return <pre className="tool-output">{JSON.stringify(value, null, 2)}</pre>
  }

  if (view === 'code' || typeof value === 'object') {
    return <pre className="tool-output">{JSON.stringify(value, null, 2)}</pre>
  }

  return <p className="tool-output-text">{String(value)}</p>
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
