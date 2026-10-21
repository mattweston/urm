import { Option, Schema } from "effect"
import { Url } from "foldkit/url"
import { describe, expect, it } from "vitest"
import { DEFAULT_SPOTIFY_PLAYLIST_ID } from "@urm/domain/schemas/settings"
import { resolveSiteTheme } from "@urm/domain/schemas/site-appearance"
import { PublicationEmailThemeRecord } from "@urm/contracts/mail"
import { DomainId } from "./domains/domain-record.ts"
import * as NavigationSettings from "@urm/features/settings/navigation"
import {
    AccountNavigation,
    AccountPreferences,
} from "@urm/contracts/account-preferences"
import {
    GotNavigationSettingsMessage,
    ReceivedAccountNavigation,
    ReceivedAccountPreferences,
    ReceivedAccountPublicationTheme,
    init,
    update,
} from "./main.ts"
import { auth_connection_id } from "./auth/session.ts"

const initial = init(
    Url.make({
        protocol: "http:",
        host: "urm.test",
        port: Option.some("1420"),
        pathname: "/settings",
        search: Option.none(),
        hash: Option.none(),
    })
).model
const model = {
    ...initial,
    contacts: {
        ...initial.contacts,
        domain_id: "domain-one",
        session: {
            account_id: "account-one",
            domains: [
                {
                    id: "domain-one",
                    slug: "test1",
                    name: "Test 1",
                    organization_name: "Test",
                    can_write: true,
                },
            ],
        },
    },
}
const snapshot = Schema.decodeUnknownSync(AccountPreferences)({
    id: "account-one",
    appearance: {
        theme: "dark",
        font: "inter",
        code_font: "theme",
        is_saved: true,
    },
    spotify: { playlist_id: DEFAULT_SPOTIFY_PLAYLIST_ID, is_saved: false },
})
const legacy_domain_id = Schema.decodeUnknownSync(DomainId)(
    "j1700000000000000000000000000001"
)
const signed_in_auth: typeof model.auth = {
    ...model.auth,
    status: "signed_in",
}
const navigation_model = {
    ...model,
    auth: signed_in_auth,
    active_domain_id: Option.some(legacy_domain_id),
    navigation_settings: NavigationSettings.init(legacy_domain_id),
}
const navigation = Schema.decodeUnknownSync(AccountNavigation)({
    id: "account-one/domain-one",
    domain_id: "domain-one",
    sidebar_order: ["Stats", "Settings"],
    hidden_modules: [],
    enabled_modules: ["Mail"],
    can_manage_modules: true,
})

describe("account preference scope", () => {
    it("ignores a late result from another account", () => {
        const [next, commands] = update(
            model,
            ReceivedAccountPreferences({
                snapshot: { ...snapshot, id: "account-two" },
            })
        )
        expect(next.appearance.savedTheme).toBe(model.appearance.savedTheme)
        expect(commands).toHaveLength(0)
    })

    it("applies a current account snapshot", () => {
        const [next] = update(model, ReceivedAccountPreferences({ snapshot }))
        expect(next.appearance.savedTheme).toBe("dark")
        expect(next.spotify_playlist_id).toBe(DEFAULT_SPOTIFY_PLAYLIST_ID)
    })

    it("maps account navigation to the current legacy shell workspace", () => {
        const [next] = update(
            navigation_model,
            ReceivedAccountNavigation({
                account_id: "account-one",
                legacy_domain_id,
                snapshot: navigation,
            })
        )
        expect(next.navigation_settings.domain_id).toBe(legacy_domain_id)
        expect(Option.isSome(next.navigation_settings.snapshot)).toBe(true)
        expect(next.navigation_settings.enabled_modules).toEqual(["Mail"])
        const [toggled] = update(
            next,
            GotNavigationSettingsMessage({
                message: NavigationSettings.ToggleModule({ id: "Mail" }),
            })
        )
        const [, save_commands] = update(
            toggled,
            GotNavigationSettingsMessage({
                message: NavigationSettings.Save({ kind: "modules" }),
            })
        )
        expect(
            save_commands.some(
                (command) => command.name === "SaveAccountNavigation"
            )
        ).toBe(true)
        const [stale] = update(
            navigation_model,
            ReceivedAccountNavigation({
                account_id: "account-two",
                legacy_domain_id,
                snapshot: navigation,
            })
        )
        expect(Option.isNone(stale.navigation_settings.snapshot)).toBe(true)
    })

    it("applies the publication theme only to the current Mail workspace", () => {
        const [with_navigation] = update(
            { ...navigation_model, auth_connection_id },
            ReceivedAccountNavigation({
                account_id: "account-one",
                legacy_domain_id,
                snapshot: navigation,
            })
        )
        const theme = Schema.decodeUnknownSync(PublicationEmailThemeRecord)({
            id: "domain-one",
            domain_id: "domain-one",
            brand_name: "One Studio",
            site_theme: resolveSiteTheme({
                theme_id: "default",
                appearance: "dark",
            }),
        })
        const [current] = update(
            with_navigation,
            ReceivedAccountPublicationTheme({
                account_id: "account-one",
                theme,
            })
        )
        expect(current.mail.newsletter.publication_theme?.brand_name).toBe(
            "One Studio"
        )
        const [stale] = update(
            with_navigation,
            ReceivedAccountPublicationTheme({
                account_id: "account-two",
                theme,
            })
        )
        expect(stale.mail.newsletter.publication_theme).toBeNull()
    })
})
