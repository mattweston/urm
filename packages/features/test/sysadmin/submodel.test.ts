import { Option } from "effect"
import { Url } from "foldkit/url"
import { describe, expect, it } from "vitest"

import {
    RequestedSessions,
    SucceededLoadSessions,
    SucceededLoadMetrics,
    UpdatedDomainFilter,
} from "../../src/sysadmin/platform/app.message.ts"
import { init, update } from "../../src/sysadmin/platform/app.update.ts"
import { ChangedUrl } from "../../src/sysadmin/platform/route.message.ts"

const urlForPath = (pathname: string) =>
    Url.make({
        protocol: "https:",
        host: "admin.example.test",
        pathname,
        search: Option.none(),
        port: Option.none(),
        hash: Option.none(),
    })

describe("sysadmin data loading", () => {
    it("starts every route dataset when Sysadmin starts", () => {
        const [model, commands] = init("/sysadmin/audit/")

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
            "FetchMetrics",
            "FetchSystem",
            "FetchSessions",
        ])
    })

    it("does not start another request when changing Sysadmin routes", () => {
        const [model] = init("/sysadmin/audit/")
        const [metrics_loaded] = update(
            model,
            SucceededLoadMetrics({ metrics: [] })
        )
        const [next_model, commands] = update(
            metrics_loaded,
            ChangedUrl({ url: urlForPath("/sysadmin/metrics/") })
        )

        expect(next_model.route._tag).toBe("Metrics")
        expect(next_model.isLoading).toBe(false)
        expect(commands).toHaveLength(0)
    })

    it("refreshes every domain-filtered dataset when the domain changes", () => {
        const [model] = init("/sysadmin/audit/")
        const [, commands] = update(
            model,
            UpdatedDomainFilter({ value: "domain-1" })
        )

        expect(commands.map((command) => command.name)).toEqual([
            "FetchAuditEvents",
            "FetchLogs",
            "FetchErrors",
        ])
    })

    it("ignores a session response from an older refresh", () => {
        const [initial] = init("/sysadmin/sessions/")
        const [first] = update(
            initial,
            RequestedSessions({ as_of: 10, request_id: "first" })
        )
        const [second] = update(
            first,
            RequestedSessions({ as_of: 10, request_id: "second" })
        )
        const [stale] = update(
            second,
            SucceededLoadSessions({
                as_of: 10,
                request_id: "first",
                sessions: [],
                total: 0,
                has_more: false,
                scope_name: "Old tenant",
                can_view_all: false,
            })
        )
        expect(stale).toBe(second)
        expect(stale.sessions_scope_name).toBe("")
    })

    it("ignores process metrics from a previous account scope", () => {
        const [initial] = init("/sysadmin/metrics/")
        const scoped = { ...initial, process_scope_key: "new-account:domain" }
        const [stale] = update(
            scoped,
            SucceededLoadMetrics({
                metrics: [],
                scope_key: "old-account:domain",
            })
        )
        expect(stale).toBe(scoped)
    })
})
