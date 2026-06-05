import {
  Arrows3RotateRight,
  ArrowsRotateLeft,
  Ban,
  Bell,
  Circles4Square,
  ClockArrowRotateLeft,
  CurlyBrackets,
  Database,
  Display,
  Keyboard,
  ListUl,
  Magnifier,
  Palette,
  ShieldKeyhole,
  Star,
  TriangleExclamation,
} from '@gravity-ui/icons'

export const icons = {
  actions: CurlyBrackets,
  automation: Arrows3RotateRight,
  blocked: Ban,
  browser: Display,
  database: Database,
  history: ClockArrowRotateLeft,
  keyboard: Keyboard,
  list: ListUl,
  notifications: Bell,
  palette: Palette,
  refresh: ArrowsRotateLeft,
  search: Magnifier,
  security: ShieldKeyhole,
  starred: Star,
  sync: Circles4Square,
  warning: TriangleExclamation,
} as const

export type Asset = keyof typeof icons

export function getIcon(asset: Asset) {
  return asset
}
