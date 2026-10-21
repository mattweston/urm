import { Option } from "effect"
import { Url } from "foldkit/url"
import { describe, expect, test } from "vitest"
import {
    GotSysadminMessage,
    ReceivedAuthSession,
    Model,
    init,
    update,
} from "./main.ts"
import { auth_connection_id } from "./auth/session.ts"
import * as Sysadmin from "./sysadmin/submodel.ts"

const initial_model = (authenticated = true) => {
    const { model } = init(
        Url.make({
            protocol: "http:",
            host: "app.localhost",
            port: Option.some("1420"),
            pathname: "/sysadmin/sessions",
            search: Option.none(),
            hash: Option.none(),
        })
    )
    return Model.make({
        ...model,
        auth_connection_id: authenticated
            ? auth_connection_id
            : "old-connection",
        auth: {
            ...model.auth,
            status: "signed_in",
            profile: Option.some({
                id: "user_admin",
                email: "admin@example.com",
                display_name: "Admin",
                image_url: Option.none<string>(),
            }),
        },
        contacts: {
            ...model.contacts,
            domain_id: "account-domain",
            session: {
                account_id: "user_admin",
                domains: [
                    {
                        id: "account-domain",
                        slug: "workspace",
                        name: "Workspace",
                        organization_name: "Organization",
                        can_write: true,
                    },
                ],
            },
        },
        sysadmin: Option.some(Sysadmin.init("/sysadmin/sessions")[0]),
    })
}

describe("sysadmin account session loading", () => {
    test("defers a restored-session load until the current connection is authenticated", () => {
        const [pending, before_auth] = update(
            initial_model(false),
            GotSysadminMessage({
                message: {
                    _tag: "RequestedSessions",
                    as_of: 100,
                    request_id: "first",
                },
            })
        )
        expect(before_auth.map((command) => command.name)).not.toContain(
            "LoadSysadminAccountSessions"
        )
        const [, after_auth] = update(
            pending,
            ReceivedAuthSession({ profile: pending.auth.profile })
        )
        expect(after_auth.map((command) => command.name)).toContain(
            "LoadSysadminAccountSessions"
        )
        expect(after_auth.map((command) => command.name)).toContain(
            "LoadSysadminAccountTelemetry"
        )
        expect(after_auth.map((command) => command.name)).toContain(
            "LoadSysadminAccountProcess"
        )
    })

    test("a session refresh loads the current tenant scope", () => {
        const [, commands] = update(
            initial_model(),
            GotSysadminMessage({
                message: {
                    _tag: "RequestedSessions",
                    as_of: 100,
                    request_id: "first",
                },
            })
        )
        const load = commands.find(
            (command) => command.name === "LoadSysadminAccountSessions"
        )
        expect(load?.args).toEqual({
            domain_id: "account-domain",
            all_tenants: false,
            as_of: 100,
            request_id: "first",
        })
    })

    test("changing scope loads the newly selected scope", () => {
        const [scoped_model, scope_commands] = update(
            initial_model(),
            GotSysadminMessage({
                message: { _tag: "UpdatedSessionScope", all_tenants: true },
            })
        )
        expect(scope_commands.map((command) => command.name)).toContain(
            "FetchSessions"
        )
        const [, commands] = update(
            scoped_model,
            GotSysadminMessage({
                message: {
                    _tag: "RequestedSessions",
                    as_of: 200,
                    request_id: "second",
                },
            })
        )
        const load = commands.find(
            (command) => command.name === "LoadSysadminAccountSessions"
        )
        expect(load?.args).toEqual({
            domain_id: "account-domain",
            all_tenants: true,
            as_of: 200,
            request_id: "second",
        })
    })
})
