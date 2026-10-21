import { Rpc, RpcGroup } from "effect/unstable/rpc"
import {
    ActiveDomainRpcMiddleware,
    AuthenticatedRpcMiddleware,
    DomainManagerRpcMiddleware,
} from "../auth-legacy/rpc-middleware.ts"
import { Schema } from "effect"
import {
    Preference,
    Theme,
    MarketingAppearance,
    UpdateMarketingAppearanceInput,
    DatabaseError,
    ConflictError,
} from "@urm/domain/schemas/settings"

export const PreferencesGetByContactIdRpc = Rpc.make("get_by_contact_id", {
    payload: Schema.Struct({}),
    success: Schema.Union([Preference, Schema.Null]),
    error: DatabaseError,
})

export const PreferencesSetThemeRpc = Rpc.make("set_theme", {
    payload: Schema.Struct({
        theme: Theme,
    }),
    success: Schema.Struct({
        item: Preference,
        txid: Schema.Number,
    }),
    error: Schema.Union([DatabaseError, ConflictError]),
})

export const MarketingAppearanceGetRpc = Rpc.make("marketing_appearance_get", {
    payload: Schema.Struct({}),
    success: MarketingAppearance,
    error: DatabaseError,
})

export const MarketingAppearanceSetRpc = Rpc.make("marketing_appearance_set", {
    payload: UpdateMarketingAppearanceInput,
    success: MarketingAppearance,
    error: Schema.Union([DatabaseError, ConflictError]),
})

const PublicMarketingAppearanceRpcs = RpcGroup.make(
    MarketingAppearanceGetRpc
).middleware(ActiveDomainRpcMiddleware)

const AuthenticatedPreferenceRpcs = RpcGroup.make(
    PreferencesGetByContactIdRpc,
    PreferencesSetThemeRpc
).middleware(AuthenticatedRpcMiddleware)

const DomainManagerMarketingAppearanceRpcs = RpcGroup.make(
    MarketingAppearanceSetRpc
)
    .middleware(DomainManagerRpcMiddleware)
    .middleware(ActiveDomainRpcMiddleware)
    .middleware(AuthenticatedRpcMiddleware)

export const SettingsRpcs = PublicMarketingAppearanceRpcs.merge(
    AuthenticatedPreferenceRpcs
).merge(DomainManagerMarketingAppearanceRpcs)
