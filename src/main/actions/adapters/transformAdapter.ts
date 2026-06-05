import type { TransformActionConfig } from '../../../shared/actions'
import type { ActionAdapter } from './actionAdapter'

export type TransformRunConfig = TransformActionConfig & {
  input?: Record<string, unknown>
}

export const transformAdapter: ActionAdapter<TransformRunConfig, Record<string, unknown>> = {
  type: 'transform_action',
  validateConfig(config) {
    const normalizedConfig = normalizeTransformConfig(config)
    if (
      normalizedConfig.mode === 'pick_field' &&
      !normalizedConfig.path?.trim()
    ) {
      throw new Error('pick_field Transform에는 path가 필요합니다.')
    }
  },
  async run({ action }) {
    const config = normalizeTransformConfig(action.config)
    const input = isRecord(action.config.input) ? action.config.input : {}
    const output = runTransform(config, input)

    return {
      state: {
        status: 'succeeded',
        output,
        lastMessage: 'Transform Action 실행을 완료했습니다.',
      },
      message: 'Transform Action 실행을 완료했습니다.',
    }
  },
}

function runTransform(
  config: TransformActionConfig,
  input: Record<string, unknown>,
): Record<string, unknown> {
  switch (config.mode) {
    case 'string_to_json':
      return { value: JSON.parse(String(input.text ?? '')) }
    case 'pick_field':
      return { value: pickDotPath(input.source, config.path ?? '') }
    case 'join':
      return {
        text: normalizeStringArray(input.items).join(config.separator ?? '\n'),
      }
    case 'split':
      return {
        items: String(input.text ?? '')
          .split(config.separator ?? '\n')
          .map((item) => item.trim())
          .filter(Boolean),
      }
    case 'json_to_string':
      return { text: JSON.stringify(input.value ?? null, null, 2) }
  }
}

function normalizeTransformConfig(
  config: Partial<TransformRunConfig>,
): TransformRunConfig {
  const mode = isTransformMode(config.mode) ? config.mode : 'json_to_string'

  return {
    mode,
    path: typeof config.path === 'string' ? config.path : undefined,
    separator:
      typeof config.separator === 'string' ? config.separator : undefined,
    input: isRecord(config.input) ? config.input : undefined,
  }
}

function pickDotPath(value: unknown, path: string): unknown {
  return path
    .split('.')
    .filter(Boolean)
    .reduce<unknown>((currentValue, segment) => {
      if (Array.isArray(currentValue)) {
        return currentValue[Number(segment)]
      }

      if (isRecord(currentValue)) {
        return currentValue[segment]
      }

      return undefined
    }, value)
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(String)
    : String(value ?? '')
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
}

function isTransformMode(value: unknown): value is TransformActionConfig['mode'] {
  return (
    value === 'json_to_string' ||
    value === 'string_to_json' ||
    value === 'pick_field' ||
    value === 'join' ||
    value === 'split'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
