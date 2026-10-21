import { sql } from "drizzle-orm"
import { Context, Effect, Layer, Schema } from "effect"
import { require_account_domain, type AccountPrincipal } from "@urm/auth"
import { Sql, query_rows } from "@urm/database/sql"
import {
    AccountNavigation,
    AccountPreferences,
} from "@urm/contracts/account-preferences"
import {
    ModuleId,
    SidebarPreference,
    module_settings_version,
    normalize_enabled_modules,
    normalize_sidebar_order,
} from "@urm/domain/schemas/modules"
import {
    AppFont,
    DEFAULT_SPOTIFY_PLAYLIST_ID,
    SpotifyPlaylistId,
    Theme,
} from "@urm/domain/schemas/settings"

export interface PreferencesPrincipal extends AccountPrincipal {
    readonly domain_id: string
}

const AppearanceRow = AccountPreferences.fields.appearance
const SpotifyRow = AccountPreferences.fields.spotify
const DomainModules = Schema.Struct({
    enabled_modules: Schema.NullOr(Schema.Array(ModuleId)),
    module_settings_version: Schema.NullOr(Schema.Number),
})

const load = Effect.fn("AccountPreferences.load")(function* (
    principal: PreferencesPrincipal
) {
    yield* require_account_domain(principal, principal.domain_id, false, null)
    const account_id = principal.account_id
    const appearance = yield* query_rows(
        AppearanceRow,
        sql`SELECT theme,font,code_font,true AS is_saved FROM appearance_preferences WHERE profile_key=${account_id}`
    )
    const spotify = yield* query_rows(
        SpotifyRow,
        sql`SELECT playlist_id,true AS is_saved FROM spotify_preferences WHERE profile_key=${account_id}`
    )
    return {
        id: account_id,
        appearance: appearance[0] ?? {
            theme: "light",
            font: "theme",
            code_font: "theme",
            is_saved: false,
        },
        spotify: spotify[0] ?? {
            playlist_id: DEFAULT_SPOTIFY_PLAYLIST_ID,
            is_saved: false,
        },
    }
})

const save_appearance = Effect.fn("AccountPreferences.saveAppearance")(
    function* (
        principal: PreferencesPrincipal,
        value: {
            theme: typeof Theme.Type
            font: typeof AppFont.Type
            code_font: typeof AppFont.Type
        }
    ) {
        yield* require_account_domain(
            principal,
            principal.domain_id,
            false,
            null
        )
        const db = yield* Sql
        yield* db.query(
            sql`INSERT INTO appearance_preferences (profile_key,theme,font,code_font,updated_at)
                VALUES (${principal.account_id},${value.theme},${value.font},${value.code_font},${Date.now()})
                ON CONFLICT (profile_key) DO UPDATE SET theme=EXCLUDED.theme,font=EXCLUDED.font,code_font=EXCLUDED.code_font,updated_at=EXCLUDED.updated_at`
        )
        return value
    }
)
const save_spotify = Effect.fn("AccountPreferences.saveSpotify")(function* (
    principal: PreferencesPrincipal,
    playlist_id: typeof SpotifyPlaylistId.Type
) {
    yield* require_account_domain(principal, principal.domain_id, false, null)
    const db = yield* Sql
    yield* db.query(
        sql`INSERT INTO spotify_preferences (profile_key,playlist_id,updated_at)
                VALUES (${principal.account_id},${playlist_id},${Date.now()})
                ON CONFLICT (profile_key) DO UPDATE SET playlist_id=EXCLUDED.playlist_id,updated_at=EXCLUDED.updated_at`
    )
    return { playlist_id }
})

const load_navigation = Effect.fn("AccountPreferences.loadNavigation")(
    function* (principal: PreferencesPrincipal) {
        yield* require_account_domain(
            principal,
            principal.domain_id,
            false,
            null
        )
        const domains = yield* query_rows(
            DomainModules,
            sql`SELECT enabled_modules::text[] AS enabled_modules,module_settings_version FROM domains WHERE id=${principal.domain_id}`
        )
        const domain = domains[0]
        if (!domain) return yield* Effect.die("Authorized domain missing")
        const preferences = yield* query_rows(
            SidebarPreference,
            sql`SELECT sidebar_order,hidden_modules FROM sidebar_preferences WHERE user_id=${principal.account_id} AND domain_id=${principal.domain_id}`
        )
        const preference = preferences[0]
        const can_manage_modules = yield* require_account_domain(
            principal,
            principal.domain_id,
            true,
            null
        ).pipe(
            Effect.as(true),
            Effect.catch(() => Effect.succeed(false))
        )
        return yield* Schema.decodeUnknownEffect(AccountNavigation)({
            id: `${principal.account_id}/${principal.domain_id}`,
            domain_id: principal.domain_id,
            sidebar_order: normalize_sidebar_order(
                preference?.sidebar_order ?? []
            ),
            hidden_modules: preference?.hidden_modules ?? [],
            enabled_modules: normalize_enabled_modules(
                domain.enabled_modules ?? undefined,
                domain.module_settings_version ?? undefined
            ),
            can_manage_modules,
        })
    }
)

const save_sidebar = Effect.fn("AccountPreferences.saveSidebar")(function* (
    principal: PreferencesPrincipal,
    value: typeof SidebarPreference.Type
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            yield* require_account_domain(
                principal,
                principal.domain_id,
                false,
                null
            )
            const sidebar_order = normalize_sidebar_order(value.sidebar_order)
            const hidden_modules = [...new Set(value.hidden_modules)].filter(
                (id) => id !== "Settings"
            )
            const tx = yield* Sql
            yield* tx.query(
                sql`INSERT INTO sidebar_preferences (user_id,domain_id,sidebar_order,hidden_modules,updated_at)
                        VALUES (${principal.account_id},${principal.domain_id},ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(sidebar_order)}::jsonb)),ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(hidden_modules)}::jsonb)),${Date.now()})
                        ON CONFLICT (user_id,domain_id) DO UPDATE SET sidebar_order=EXCLUDED.sidebar_order,hidden_modules=EXCLUDED.hidden_modules,updated_at=EXCLUDED.updated_at`
            )
            return yield* load_navigation(principal)
        })
    )
})

const save_modules = Effect.fn("AccountPreferences.saveModules")(function* (
    principal: PreferencesPrincipal,
    enabled_modules: ReadonlyArray<typeof ModuleId.Type>
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            yield* require_account_domain(
                principal,
                principal.domain_id,
                true,
                null
            )
            const tx = yield* Sql
            yield* tx.query(
                sql`UPDATE domains SET enabled_modules=ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify([...new Set(enabled_modules)])}::jsonb)::module_id),module_settings_version=${module_settings_version},updated_at=${Date.now()} WHERE id=${principal.domain_id}`
            )
            return yield* load_navigation(principal)
        })
    )
})

const make = Effect.gen(function* () {
    const db = yield* Sql
    return {
        load: (principal: PreferencesPrincipal) =>
            load(principal).pipe(Effect.provideService(Sql, db)),
        save_appearance: (
            principal: PreferencesPrincipal,
            value: {
                theme: typeof Theme.Type
                font: typeof AppFont.Type
                code_font: typeof AppFont.Type
            }
        ) =>
            save_appearance(principal, value).pipe(
                Effect.provideService(Sql, db)
            ),
        save_spotify: (
            principal: PreferencesPrincipal,
            playlist_id: typeof SpotifyPlaylistId.Type
        ) =>
            save_spotify(principal, playlist_id).pipe(
                Effect.provideService(Sql, db)
            ),
        load_navigation: (principal: PreferencesPrincipal) =>
            load_navigation(principal).pipe(Effect.provideService(Sql, db)),
        save_sidebar: (
            principal: PreferencesPrincipal,
            value: typeof SidebarPreference.Type
        ) =>
            save_sidebar(principal, value).pipe(Effect.provideService(Sql, db)),
        save_modules: (
            principal: PreferencesPrincipal,
            enabled_modules: ReadonlyArray<typeof ModuleId.Type>
        ) =>
            save_modules(principal, enabled_modules).pipe(
                Effect.provideService(Sql, db)
            ),
    }
})
export class AccountPreferencesRepository extends Context.Service<
    AccountPreferencesRepository,
    Effect.Success<typeof make>
>()("@urm/rpc/AccountPreferencesRepository") {}
export const AccountPreferencesRepositoryLive = Layer.effect(
    AccountPreferencesRepository,
    make
)
