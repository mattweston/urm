import { Effect, Schema as S } from "effect"
import { Command } from "foldkit"

import {
    RequestedSessions,
    RequestedTelemetry,
    FailedLoadMetrics,
    FailedLoadSystem,
    SucceededLoadMetrics,
    SucceededLoadSystem,
} from "./app.message.ts"
import {
    AuditFilter,
    LogFilter,
    persistence_unavailable_error,
    SessionFilter,
    TraceFilter,
} from "./app.model.ts"

const FetchAuditEvents = Command.define("FetchAuditEvents", {
    args: { filter: AuditFilter },
    messages: [RequestedTelemetry],
    execute: () =>
        Effect.sync(() => RequestedTelemetry({ refresh: Date.now() })),
})

const FetchLogs = Command.define("FetchLogs", {
    args: { filter: LogFilter },
    messages: [RequestedTelemetry],
    execute: () =>
        Effect.sync(() => RequestedTelemetry({ refresh: Date.now() })),
})

const FetchSpans = Command.define("FetchSpans", {
    args: { filter: TraceFilter },
    messages: [RequestedTelemetry],
    execute: () =>
        Effect.sync(() => RequestedTelemetry({ refresh: Date.now() })),
})

const FetchErrors = Command.define("FetchErrors", {
    args: { domain_id: S.optional(S.String) },
    messages: [RequestedTelemetry],
    execute: () =>
        Effect.sync(() => RequestedTelemetry({ refresh: Date.now() })),
})

const FetchMetrics = Command.define("FetchMetrics", {
    messages: [SucceededLoadMetrics, FailedLoadMetrics],
    execute: Effect.succeed(
        FailedLoadMetrics({ error: persistence_unavailable_error })
    ),
})

const FetchSystem = Command.define("FetchSystem", {
    messages: [SucceededLoadSystem, FailedLoadSystem],
    execute: Effect.succeed(
        FailedLoadSystem({ error: persistence_unavailable_error })
    ),
})

const FetchSessions = Command.define("FetchSessions", {
    args: { filter: SessionFilter },
    messages: [RequestedSessions],
    execute: () =>
        Effect.sync(() =>
            RequestedSessions({
                as_of: Date.now(),
                request_id: globalThis.crypto.randomUUID(),
            })
        ),
})

export const fetchAuditEvents = (filter: AuditFilter) =>
    FetchAuditEvents({ filter })

export const fetchLogs = (filter: LogFilter) => FetchLogs({ filter })

export const fetchSpans = (filter: TraceFilter) => FetchSpans({ filter })

export const fetchErrors = (domain_id?: string) => FetchErrors({ domain_id })

export const fetchMetrics = () => FetchMetrics()

export const fetchSystem = () => FetchSystem()

export const fetchSessions = (filter: SessionFilter) =>
    FetchSessions({ filter })
