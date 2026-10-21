import type { Preference, Theme } from "@urm/domain/schemas/settings"

export interface SettingsApi {
    getOwn(): Promise<Preference | null>
    setTheme(params: {
        theme: Theme
    }): Promise<{ item: Preference; txid: number }>
}
