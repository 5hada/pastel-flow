import type {
    AppSettings,
    AppSettingsSnapshot
 } from "../../../shared/settings"


export type SettingsApi = {
  get(): Promise<AppSettingsSnapshot>
  update(settings: AppSettings): Promise<AppSettingsSnapshot>
}