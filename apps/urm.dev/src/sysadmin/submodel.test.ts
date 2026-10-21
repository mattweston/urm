import { Option, Schema } from "effect"
import { Url } from "foldkit/url"
import { describe, expect, test } from "vitest"

import { SysadminAccountTelemetry } from "@urm/domain/schemas/sysadmin-telemetry"
import * as Sysadmin from "@urm/features/sysadmin/submodel"

import * as DesktopSysadmin from "./submodel.ts"

const url = Url.make({
    protocol: "http:",
    host: "urm.test",
    port: Option.some("1420"),
    pathname: "/sysadmin",
    search: Option.none(),
    hash: Option.none(),
})

describe("desktop Sysadmin adapter", () => {
    test("shows empty routes immediately until an account workspace is known", () => {
        const [model, commands] = DesktopSysadmin.init("/sysadmin")

        expect(model.route._tag).toBe("Home")
        expect(model.pendingRoutes).toEqual([])
        expect(model.isLoading).toBe(false)
        expect(commands).toEqual([])
    })

    test("loads every child source when an account workspace is known", () => {
        const [model, commands] = DesktopSysadmin.init(
            "/sysadmin",
            "account-domain",
            "account-one"
        )

        expect(model.pendingRoutes).toEqual([
            "Audit",
            "Logging",
            "Tracing",
            "Errors",
            "Metrics",
            "System",
            "Sessions",
        ])
        expect(commands.map((command) => command.name)).toEqual([
            "FetchAuditEvents",
            "FetchLogs",
            "FetchSpans",
            "FetchErrors",
            "LoadSysadminAccountProcess",
            "LoadSysadminAccountProcess",
            "FetchSessions",
        ])
    })

    test("reuses the parent model when moving between child routes", () => {
        const [model] = DesktopSysadmin.init("/sysadmin")
        const [next_model, commands] = DesktopSysadmin.changed_url(
            model,
            url,
            "/sysadmin/logging"
        )

        expect(next_model.route._tag).toBe("Logging")
        expect(next_model.isLoading).toBe(false)
        expect(commands).toEqual([])
    })
})

test("clears all tenant telemetry and global selection on context changes", () => {
    const [model] = DesktopSysadmin.init("/sysadmin")
    const loaded = DesktopSysadmin.telemetry_loaded(
        Schema.decodeUnknownSync(SysadminAccountTelemetry)({
            id: "snapshot",
            events: [
                {
                    id: "audit",
                    organization_id: "org-one",
                    domain_id: "domain-one",
                    actor_user_id: null,
                    action: "document.create",
                    entity_type: "document",
                    entity_id: null,
                    result: "succeeded",
                    reason_class: null,
                    trace_id: null,
                    request_id: null,
                    created_at: 1,
                    metadata: {},
                },
            ],
            logs: [],
            errors: [],
            spans: [],
            has_more: true,
            scope_name: "Tenant A",
            can_view_all: true,
        })
    )
    const [next] = DesktopSysadmin.update(model, loaded)
    expect(next.events).toHaveLength(1)
    expect(next.events[0]?.created_at).toEqual(new Date(1))
    const [account_changed] = DesktopSysadmin.account_domain_changed(
        next,
        "account-domain"
    )
    expect(account_changed.events).toEqual([])
    const cleared = DesktopSysadmin.clear_data({
        ...next,
        telemetry_all_tenants: true,
        session_request_id: "stale-request",
    })
    expect(cleared.events).toEqual([])
    expect(cleared.telemetry_scope_name).toBe("")
    expect(cleared.telemetry_all_tenants).toBe(false)
    expect(cleared.session_request_id).toBeUndefined()
    expect(cleared.metrics).toEqual([])
    expect(cleared.system).toBeNull()
})

test("loads telemetry from the account workspace and ignores stale responses", () => {
    const [initial] = DesktopSysadmin.init("/sysadmin/audit")
    const [requested, commands] = DesktopSysadmin.update(
        initial,
        Sysadmin.RequestedTelemetry({ refresh: 1 }),
        "account-domain"
    )
    expect(commands.map((command) => command.name)).toContain(
        "LoadSysadminAccountTelemetry"
    )
    expect(
        commands.find(
            (command) => command.name === "LoadSysadminAccountTelemetry"
        )?.args
    ).toMatchObject({ domain_id: "account-domain", refresh: 1 })
    const [stale] = DesktopSysadmin.update(
        requested,
        DesktopSysadmin.telemetry_failed("old request", "stale-request"),
        "account-domain"
    )
    expect(stale).toBe(requested)
    const [changed, after_change] = DesktopSysadmin.account_domain_changed(
        requested,
        "another-domain"
    )
    expect(changed.telemetry_request_id).not.toBe(
        requested.telemetry_request_id
    )
    expect(after_change.map((command) => command.name)).toContain(
        "LoadSysadminAccountTelemetry"
    )
})

test("uses the account workspace ID when its session scope resolves", () => {
    const [initial] = DesktopSysadmin.init("/sysadmin/sessions")
    const [next, commands] = DesktopSysadmin.account_domain_changed(
        initial,
        "account-domain"
    )
    expect(next.session_request_id).toBeDefined()
    expect(commands).toHaveLength(4)
    expect(commands[0]?.args).toMatchObject({
        domain_id: "account-domain",
        request_id: next.session_request_id,
    })
    expect(commands.map((command) => command.name)).toContain(
        "LoadSysadminAccountTelemetry"
    )
    const [cleared, after_logout] = DesktopSysadmin.account_domain_changed(
        next,
        undefined
    )
    expect(cleared.session_request_id).toBeUndefined()
    expect(after_logout).toEqual([])
})

test("settles the initial telemetry loading state when the account arrives", () => {
    const [initial] = DesktopSysadmin.init("/sysadmin/audit")
    const [scoped, commands] = DesktopSysadmin.account_domain_changed(
        initial,
        "account-domain",
        "account-one"
    )
    expect(scoped.telemetry_request_id).toBeDefined()
    expect(commands.map((command) => command.name)).toContain(
        "LoadSysadminAccountTelemetry"
    )

    const [settled] = DesktopSysadmin.update(
        scoped,
        DesktopSysadmin.telemetry_failed(
            "Sysadmin access denied",
            scoped.telemetry_request_id
        ),
        "account-domain",
        "account-one"
    )
    expect(settled.pendingRoutes).not.toContain("Audit")
    expect(settled.isLoading).toBe(false)
    expect(settled.error).toBe("Sysadmin access denied")
})

test("loads process data for an existing account session", () => {
    const [model, commands] = DesktopSysadmin.init(
        "/sysadmin/metrics",
        "account-domain",
        "account-one"
    )
    const process_commands = commands.filter(
        (command) => command.name === "LoadSysadminAccountProcess"
    )
    expect(model.process_scope_key).toBe("account-one:account-domain")
    expect(process_commands).toHaveLength(2)
    expect(process_commands.map((command) => command.args)).toEqual([
        {
            domain_id: "account-domain",
            source: "metrics",
            scope_key: "account-one:account-domain",
        },
        {
            domain_id: "account-domain",
            source: "system",
            scope_key: "account-one:account-domain",
        },
    ])
})
