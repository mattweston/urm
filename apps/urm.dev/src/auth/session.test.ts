import { Option } from "effect"
import { Url } from "foldkit/url"
import * as Ui from "@foldkit/ui"
import { describe, expect, test } from "vitest"
import * as Contacts from "../contacts/model.ts"
import {
    module_ids,
    normalize_sidebar_order,
} from "@urm/domain/schemas/modules"
import {
    Model,
    GotContactsMessage,
    GotAuthKitMessage,
    ReceivedAccountNavigation,
    app_surface,
    init,
    update,
} from "../main.ts"

describe("PostgreSQL account session", () => {
    test("uses the PostgreSQL account session on the central account origin", () => {
        const { model: initial } = init(
            Url.make({
                protocol: "http:",
                host: "app.localhost",
                port: Option.some("1420"),
                pathname: "/",
                search: Option.none(),
                hash: Option.none(),
            })
        )
        const signed_out: Model = {
            ...initial,
            auth: { ...initial.auth, status: "signed_out" },
            contacts: {
                ...initial.contacts,
                connection_id: Contacts.boot_id,
                busy: false,
            },
        }
        expect(app_surface(signed_out)).toBe("sign_in")
        expect(
            app_surface({
                ...signed_out,
                contacts: {
                    ...signed_out.contacts,
                    session: {
                        account_id: "account-a",
                        domains: [
                            {
                                id: "postgres-domain",
                                slug: "test1",
                                name: "Test 1",
                                organization_name: "Personal",
                                can_write: true,
                            },
                        ],
                    },
                },
            })
        ).toBe("account")
    })
    test("shows account sign-in on a workspace URL without a PostgreSQL session", () => {
        const { model: initial } = init(
            Url.make({
                protocol: "http:",
                host: "app.localhost",
                port: Option.some("1420"),
                pathname: "/dashboard",
                search: Option.some("?domain=test1"),
                hash: Option.none(),
            })
        )
        expect(
            app_surface({
                ...initial,
                auth: { ...initial.auth, status: "signed_out" },
                contacts: {
                    ...initial.contacts,
                    connection_id: Contacts.boot_id,
                    busy: false,
                },
            })
        ).toBe("sign_in")
    })
    test("opens a migrated workspace after account sign-in without WorkOS", () => {
        const { model: initial } = init(
            Url.make({
                protocol: "http:",
                host: "app.localhost",
                port: Option.some("1420"),
                pathname: "/data",
                search: Option.some("?domain=test1"),
                hash: Option.none(),
            })
        )
        const opened = update(
            {
                ...initial,
                auth: { ...initial.auth, status: "signed_out" },
            },
            GotContactsMessage({
                message: Contacts.opened_domain("test1", true),
            })
        )[0]
        const loaded = update(
            opened,
            GotContactsMessage({
                message: Contacts.Message.SessionLoaded({
                    epoch: opened.contacts.epoch,
                    session: {
                        account_id: "account-a",
                        domains: [
                            {
                                id: "postgres-domain",
                                slug: "test1",
                                name: "Test 1",
                                organization_name: "Personal",
                                can_write: true,
                            },
                        ],
                    },
                    account: {
                        account_id: "account-a",
                        contact_id: null,
                        session_id: "session-a",
                        profile: {
                            id: "account-a",
                            email: "a@example.com",
                            display_name: "User A",
                            image_url: null,
                        },
                    },
                }),
            })
        )[0]
        expect(app_surface(loaded)).toBe("domain")
        expect(loaded.data.tables.domain_id).toBe("postgres-domain")
        expect(Option.isNone(loaded.active_domain_id)).toBe(true)
        expect(loaded.navigation_settings.domain_id).toBe("postgres-domain")
        const with_navigation = update(
            loaded,
            ReceivedAccountNavigation({
                account_id: "account-a",
                legacy_domain_id: "postgres-domain",
                snapshot: {
                    id: "account-a/postgres-domain",
                    domain_id: "postgres-domain",
                    sidebar_order: normalize_sidebar_order([]),
                    hidden_modules: [],
                    enabled_modules: module_ids,
                    can_manage_modules: true,
                },
            })
        )[0]
        expect(
            Option.isSome(with_navigation.navigation_settings.snapshot)
        ).toBe(true)
        const [signed_out, commands] = update(
            with_navigation,
            GotAuthKitMessage({
                message: {
                    _tag: "GotAccountMenuMessage",
                    message: Ui.Menu.Message.SelectedItem({
                        index: 0,
                        item: "Sign out",
                    }),
                },
            })
        )
        expect(signed_out.contacts.session).toBeNull()
        expect(
            commands.some((command) => command.name === "ContactsLogout")
        ).toBe(true)
        expect(
            commands.some((command) => command.name === "SignOutWithAuthKit")
        ).toBe(false)
    })
})
