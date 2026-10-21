export {
    type MarketingAppearance,
    type Preference,
    type Theme,
} from "@urm/domain/schemas/settings"
export {
    PreferencesGetByContactIdRpc,
    PreferencesSetThemeRpc,
    MarketingAppearanceGetRpc,
    MarketingAppearanceSetRpc,
    SettingsRpcs,
} from "./routes.ts"
export type { SettingsApi } from "../services/settings/index.ts"
export type { PreferencesRepositoryType } from "../repositories/settings/index.ts"
