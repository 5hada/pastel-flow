import type { TransformActionConfig } from '../../../../shared/actions'

export const transformOptions: Array<{
  label: string
  mode: TransformActionConfig['mode']
}> = [
  { label: 'JSON to string', mode: 'json_to_string' },
  { label: 'String to JSON', mode: 'string_to_json' },
  { label: 'Pick field', mode: 'pick_field' },
  { label: 'Join', mode: 'join' },
  { label: 'Split', mode: 'split' },
]
