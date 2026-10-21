/**
 * # Settings RPC
 */

import { type Schema } from "effect"
import { Preference } from "@urm/domain/schemas/settings"

export {
    SettingsRpcs,
    MarketingAppearanceGetRpc,
    MarketingAppearanceSetRpc,
    PreferencesGetByContactIdRpc,
    PreferencesSetThemeRpc,
} from "@urm/contracts/settings"

export {
    SettingsRpcLive,
    SettingsRpcHandlersTagLive,
    SettingsRpcHandlersTag,
    type SettingsRpcHandlers,
} from "./handlers.js"
export {
    MarketingAppearanceRepositoryLive,
    PreferencesRepositoryLive,
} from "./repository.js"
export {
    MarketingAppearanceRepository,
    PreferencesRepository,
} from "@urm/contracts/repositories/settings"
export type PreferenceType = Schema.Schema.Type<typeof Preference>
