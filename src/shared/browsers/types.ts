export type BrowserExecutablePaths = Partial<Record<BrowserKind, string>>

export type BrowserProfilePreset = {
  id: string
  name: string
  browserKind: BrowserKind
  profilePath: string
}


export type BrowserKind = 'chrome' | 'edge' | 'chromium'

export type RestorePolicy = 'browser_profile' | 'initial_urls_only'

export type BrowserRunMode =
  | 'dedicated_profile'
  | 'extension_controlled'
  | 'default_browser_deeplink'

export type BrowserProfileSource = 'action_profile' | 'existing_profile'

export type BrowserTabGroupColor =
  | 'grey'
  | 'blue'
  | 'red'
  | 'yellow'
  | 'green'
  | 'pink'
  | 'purple'
  | 'cyan'
  | 'orange'

export type BrowserTabGroupSnapshot = {
  id: number
  windowId: number
  title?: string
  color: BrowserTabGroupColor
  collapsed: boolean
}

export type BrowserTabSnapshot = {
  id?: number
  windowId: number
  index: number
  url: string
  title?: string
  groupId?: number
  active: boolean
  pinned: boolean
}

export type BrowserTabGroupStateSnapshot = {
  capturedAt: string
  tabs: BrowserTabSnapshot[]
  groups: BrowserTabGroupSnapshot[]
}

export type BrowserTabGroupConfig = {
  browserGroupId: string
  profileId: string
  initialUrls: string[]
  browserKind: BrowserKind
  restorePolicy: RestorePolicy
  runMode: BrowserRunMode
  profileSource: BrowserProfileSource
  existingProfilePath?: string
  dynamicTemplateUpdates: boolean
  tabGroupSnapshot?: BrowserTabGroupStateSnapshot
}
