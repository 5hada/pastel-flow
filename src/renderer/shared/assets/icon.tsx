import type { ReactNode } from 'react'
import {
  Arrows3RotateRight,
  ArrowsRotateLeft,
  ArrowRotateRight,
  Ban,
  Bell,
  Circles4Square,
  ClockArrowRotateLeft,
  CurlyBrackets,
  Database,
  Display,
  Folder,
  FolderOpen,
  Gear,
  Hammer,
  Keyboard,
  ListUl,
  LocationArrow,
  Magnifier,
  Palette,
  Pencil,
  Play,
  Plus,
  Route,
  ShieldKeyhole,
  Star,
  TriangleExclamation,
  Xmark,
} from '@gravity-ui/icons'
import type { SettingsCategory } from '../state/taskFormState'


export const commonIcons = {
  actions: <LocationArrow/>,
  add: <Plus/>,
  blocked: <Ban/>,
  close: <Xmark/>,
  data: <Database/>,
  device: <Display/>,
  edit: <Pencil/>,
  folderClose: <Folder/>,
  folderOpen: <FolderOpen/>,
  scheduled: <ClockArrowRotateLeft/>,
  list: <ListUl/>,
  refresh:< ArrowsRotateLeft/>,
  run: <Play/>,
  running: <Arrows3RotateRight/>,
  search: <Magnifier/>,
  secret: <ShieldKeyhole/>,
  settings: <Gear/>,
  starred: <Star/>,
  tools: <Hammer/>,
  todos: <ListUl/>,
  urlGroups: <ListUl/>,
  warning: <TriangleExclamation/>,
  workflows: <Route/>,
  reload: <ArrowRotateRight/>,
} as const satisfies Record<string, ReactNode>

export const settingsIcons = {
  appearance: <Palette/>,
  browser:< Magnifier/>,
  data: <Database/>,
  developer: <CurlyBrackets/>,
  devices: <Display/>,
  events: <Bell/>,
  general: <Circles4Square/>,
  secrets: <ShieldKeyhole/>,
  shortcuts: <Keyboard/>,
  sync: <ArrowsRotateLeft/>,
} as const satisfies Record<SettingsCategory, ReactNode>

export type CommonIconName = keyof typeof commonIcons
export type SettingsIconName = keyof typeof settingsIcons

export function getCommonIcon(name: CommonIconName): ReactNode {
  return commonIcons[name]
}

export function getSettingsIcon(category: SettingsCategory): ReactNode {
  return settingsIcons[category]
}
