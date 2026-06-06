import type { CustomThemeColors, ThemeColorKey, ThemeMode } from './types'

export type ThemeColorGroup = 'base' | 'text' | 'accent' | 'status' | 'controls'

export type ThemeColorDefinition = {
  key: ThemeColorKey
  cssVariable: string
  defaultValue: string
  group: ThemeColorGroup
  label: string
  description: string
}

export const themeColorDefinitions: ThemeColorDefinition[] = [
  {
    key: 'appBg',
    cssVariable: '--app-bg',
    defaultValue: '#edf2f6',
    group: 'base',
    label: '앱 배경',
    description: '앱 전체 배경',
  },
  {
    key: 'surface',
    cssVariable: '--surface',
    defaultValue: '#ffffff',
    group: 'base',
    label: '표면',
    description: '기본 패널 표면',
  },
  {
    key: 'surfaceMuted',
    cssVariable: '--surface-muted',
    defaultValue: '#f6f8fb',
    group: 'base',
    label: '보조 표면',
    description: '보조 섹션 배경',
  },
  {
    key: 'surfaceRaised',
    cssVariable: '--surface-raised',
    defaultValue: '#ffffff',
    group: 'base',
    label: '상단 표면',
    description: '강조된 표면',
  },
  {
    key: 'surfaceSelected',
    cssVariable: '--surface-selected',
    defaultValue: '#e9f6f3',
    group: 'base',
    label: '선택 표면',
    description: '선택된 행 배경',
  },
  {
    key: 'border',
    cssVariable: '--border',
    defaultValue: '#d8e1ea',
    group: 'base',
    label: '경계선',
    description: '기본 구분선',
  },
  {
    key: 'borderStrong',
    cssVariable: '--border-strong',
    defaultValue: '#6f9f99',
    group: 'base',
    label: '강한 경계선',
    description: '선택/포커스 경계',
  },
  {
    key: 'text',
    cssVariable: '--text',
    defaultValue: '#17212e',
    group: 'text',
    label: '본문',
    description: '기본 텍스트',
  },
  {
    key: 'textMuted',
    cssVariable: '--text-muted',
    defaultValue: '#677486',
    group: 'text',
    label: '보조 본문',
    description: '보조 텍스트',
  },
  {
    key: 'accent',
    cssVariable: '--accent',
    defaultValue: '#226f68',
    group: 'accent',
    label: '강조',
    description: '주요 액션',
  },
  {
    key: 'accentHover',
    cssVariable: '--accent-hover',
    defaultValue: '#1a5d58',
    group: 'accent',
    label: '강조 hover',
    description: '주요 액션 hover',
  },
  {
    key: 'accentSoft',
    cssVariable: '--accent-soft',
    defaultValue: '#d9f0eb',
    group: 'accent',
    label: '부드러운 강조',
    description: '강조 배경',
  },
  {
    key: 'accentContrast',
    cssVariable: '--accent-contrast',
    defaultValue: '#ffffff',
    group: 'accent',
    label: '강조 대비',
    description: '강조 위 텍스트',
  },
  {
    key: 'danger',
    cssVariable: '--danger',
    defaultValue: '#b94a48',
    group: 'status',
    label: '위험',
    description: '삭제/오류 액션',
  },
  {
    key: 'dangerHover',
    cssVariable: '--danger-hover',
    defaultValue: '#9f2f2b',
    group: 'status',
    label: '위험 hover',
    description: '위험 액션 hover',
  },
  {
    key: 'dangerSoft',
    cssVariable: '--danger-soft',
    defaultValue: '#fff1f0',
    group: 'status',
    label: '부드러운 위험',
    description: '오류 배경',
  },
  {
    key: 'info',
    cssVariable: '--info',
    defaultValue: '#2e5f95',
    group: 'status',
    label: '정보',
    description: '정보 상태',
  },
  {
    key: 'infoSoft',
    cssVariable: '--info-soft',
    defaultValue: '#e6f0fb',
    group: 'status',
    label: '부드러운 정보',
    description: '정보 배경',
  },
  {
    key: 'warning',
    cssVariable: '--warning',
    defaultValue: '#fff0c2',
    group: 'status',
    label: '경고',
    description: '경고 배경',
  },
  {
    key: 'warningText',
    cssVariable: '--warning-text',
    defaultValue: '#6b4b0e',
    group: 'status',
    label: '경고 본문',
    description: '경고 텍스트',
  },
  {
    key: 'success',
    cssVariable: '--success',
    defaultValue: '#287a54',
    group: 'status',
    label: '성공',
    description: '성공 상태',
  },
  {
    key: 'successSoft',
    cssVariable: '--success-soft',
    defaultValue: '#e4f5eb',
    group: 'status',
    label: '부드러운 성공',
    description: '성공 배경',
  },
  {
    key: 'controlBg',
    cssVariable: '--control-bg',
    defaultValue: '#f8fafc',
    group: 'controls',
    label: '입력 배경',
    description: '입력 필드 배경',
  },
  {
    key: 'readonlyBg',
    cssVariable: '--readonly-bg',
    defaultValue: '#eef3f8',
    group: 'controls',
    label: '읽기 전용',
    description: '읽기 전용 필드',
  },
  {
    key: 'railBg',
    cssVariable: '--rail-bg',
    defaultValue: '#e7edf3',
    group: 'controls',
    label: '레일',
    description: '트랙/사이드 레일',
  },
]

export const themeColorGroups: Array<{
  id: ThemeColorGroup
  label: string
}> = [
  { id: 'base', label: 'Base' },
  { id: 'text', label: 'Text' },
  { id: 'accent', label: 'Accent' },
  { id: 'status', label: 'Status' },
  { id: 'controls', label: 'Controls' },
]

export function createDefaultCustomThemeColors(): CustomThemeColors {
  return Object.fromEntries(
    themeColorDefinitions.map((definition) => [
      definition.key,
      definition.defaultValue,
    ]),
  ) as CustomThemeColors
}

export const themePreviewColorSets: Record<
  Exclude<ThemeMode, 'custom'>,
  CustomThemeColors
> = {
  light: createDefaultCustomThemeColors(),
  system: createDefaultCustomThemeColors(),
  dark: {
    appBg: '#15161b',
    surface: '#22242b',
    surfaceMuted: '#2a2c34',
    surfaceRaised: '#2d3038',
    surfaceSelected: '#2b3f45',
    border: '#41444d',
    borderStrong: '#826df6',
    text: '#f8f8fb',
    textMuted: '#aaaeb7',
    accent: '#826df6',
    accentHover: '#9482f8',
    accentSoft: '#2f2a4f',
    accentContrast: '#ffffff',
    danger: '#db4f4a',
    dangerHover: '#e36a65',
    dangerSoft: '#4a292b',
    info: '#826df6',
    infoSoft: '#2f2a4f',
    warning: '#f0bd49',
    warningText: '#242116',
    success: '#56c982',
    successSoft: '#1f4430',
    controlBg: '#22242b',
    readonlyBg: '#353842',
    railBg: '#50525a',
  },
}
