import { Effect, Schema } from "effect"
import { Remote } from "foldkit-remote"
import { Surface } from "foldkit-surface"
import { defineMessageUnion } from "foldkit/message"
import {
    AccountNavigationEntity,
    AccountNavigationQuery,
    AccountPreferencesEntity,
    AccountPreferencesQuery,
    SaveAccountAppearance,
    SaveAccountSpotify,
    SaveAccountSidebar,
    SaveAccountModules,
} from "@urm/contracts/account-preferences"
import { ModuleId, SidebarPreference } from "@urm/domain/schemas/modules"
import { AppFont, SpotifyPlaylistId, Theme } from "@urm/domain/schemas/settings"
import { ContactsApi, AccountRequestError } from "../contacts/api.ts"

const Cache = Surface.application({
    Model: Schema.Struct({ remote: Remote.Model }),
    Message: defineMessageUnion({ ...Remote.messages }),
    initial: { remote: Remote.initial },
    update: (model: { readonly remote: typeof Remote.Model.Type }) => ({
        model,
    }),
})
const Preferences = Remote.make({
    model: Cache.model.remote,
    entities: [AccountPreferencesEntity, AccountNavigationEntity],
    queries: [AccountPreferencesQuery, AccountNavigationQuery],
    mutations: [
        SaveAccountAppearance,
        SaveAccountSpotify,
        SaveAccountSidebar,
        SaveAccountModules,
    ],
})
const missing = () =>
    new AccountRequestError({
        status: 404,
        message: "Preferences could not be loaded. Refresh and try again.",
    })

export const load_preferences = Effect.fn("Preferences.load")(function* (
    domain_id: string,
    account_id: string
) {
    const api = yield* ContactsApi
    const query = Preferences.query(
        AccountPreferencesQuery,
        { domain_id },
        {
            select: AccountPreferencesEntity.select({
                id: true,
                appearance: true,
                spotify: true,
            }),
            first: 1,
        }
    )
    const loaded = yield* Preferences.prefetch(
        { remote: Remote.initial },
        query
    ).pipe(Effect.provide(api.remote(domain_id)))
    const result = query.read(loaded)
    if (result._tag !== "Ready" || result.value.items[0]?.id !== account_id)
        return yield* Effect.fail(missing())
    return result.value.items[0]
})

export const save_appearance = Effect.fn("Preferences.saveAppearance")(
    function* (
        domain_id: string,
        account_id: string,
        value: {
            theme: typeof Theme.Type
            font: typeof AppFont.Type
            code_font: typeof AppFont.Type
        }
    ) {
        const api = yield* ContactsApi
        const result = yield* Remote.mutate(
            SaveAccountAppearance,
            { domain_id, account_id, ...value },
            crypto.randomUUID()
        ).pipe(Effect.provide(api.remote(domain_id)))
        return result.output
    }
)

export const save_spotify = Effect.fn("Preferences.saveSpotify")(function* (
    domain_id: string,
    account_id: string,
    playlist_id: typeof SpotifyPlaylistId.Type
) {
    const api = yield* ContactsApi
    const result = yield* Remote.mutate(
        SaveAccountSpotify,
        { domain_id, account_id, playlist_id },
        crypto.randomUUID()
    ).pipe(Effect.provide(api.remote(domain_id)))
    return result.output
})

export const load_navigation = Effect.fn("Preferences.loadNavigation")(
    function* (domain_id: string, account_id: string) {
        const api = yield* ContactsApi
        const query = Preferences.query(
            AccountNavigationQuery,
            { domain_id },
            {
                select: AccountNavigationEntity.select({
                    id: true,
                    domain_id: true,
                    sidebar_order: true,
                    hidden_modules: true,
                    enabled_modules: true,
                    can_manage_modules: true,
                }),
                first: 1,
            }
        )
        const loaded = yield* Preferences.prefetch(
            { remote: Remote.initial },
            query
        ).pipe(Effect.provide(api.remote(domain_id)))
        const result = query.read(loaded)
        if (
            result._tag !== "Ready" ||
            result.value.items[0]?.id !== `${account_id}/${domain_id}`
        )
            return yield* Effect.fail(missing())
        return result.value.items[0]
    }
)
export const save_sidebar = Effect.fn("Preferences.saveSidebar")(function* (
    domain_id: string,
    account_id: string,
    value: typeof SidebarPreference.Type
) {
    const api = yield* ContactsApi
    const result = yield* Remote.mutate(
        SaveAccountSidebar,
        { domain_id, account_id, ...value },
        crypto.randomUUID()
    ).pipe(Effect.provide(api.remote(domain_id)))
    return result.output
})
export const save_modules = Effect.fn("Preferences.saveModules")(function* (
    domain_id: string,
    account_id: string,
    enabled_modules: ReadonlyArray<typeof ModuleId.Type>
) {
    const api = yield* ContactsApi
    const result = yield* Remote.mutate(
        SaveAccountModules,
        { domain_id, account_id, enabled_modules },
        crypto.randomUUID()
    ).pipe(Effect.provide(api.remote(domain_id)))
    return result.output
})
