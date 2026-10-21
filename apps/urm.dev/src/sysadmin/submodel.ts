import { Effect, Option, Schema as S } from "effect"
import { Command, Navigation, Submodel } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { Url } from "foldkit/url"

import type { SysadminAccountTelemetry } from "@urm/domain/schemas/sysadmin-telemetry"
import * as Sysadmin from "@urm/features/sysadmin/submodel"
import {
    load_process as load_account_process,
    load_sessions as load_account_sessions,
    load_telemetry as load_account_telemetry,
} from "./api.ts"
import { ContactsApi } from "../contacts/api.ts"

export const Model = Sysadmin.Model
export type Model = Sysadmin.ModelType
export const Message = Sysadmin.Message
export type Message = Sysadmin.MessageType

type Commands = ReadonlyArray<Command.Command<Message, never, ContactsApi>>
export type UpdateReturn = readonly [Model, Commands]

const NavigateArgs = S.Struct({ href: S.String })

const NavigateDesktopSysadmin = Command.define("NavigateDesktopSysadmin", {
    args: { href: S.String },
    messages: [Sysadmin.CompletedNavigateInternal],
    execute: ({ href }) =>
        Navigation.pushUrl(href).pipe(
            Effect.as(Sysadmin.CompletedNavigateInternal())
        ),
})

const source_for_command = (
    name: string
): Option.Option<"metrics" | "system"> => {
    switch (name) {
        case "FetchMetrics":
            return Option.some("metrics")
        case "FetchSystem":
            return Option.some("system")
        default:
            return Option.none()
    }
}

const LoadSysadminAccountProcess = Command.define(
    "LoadSysadminAccountProcess",
    {
        args: {
            domain_id: S.optional(S.String),
            source: S.Literals(["metrics", "system"]),
            scope_key: S.optional(S.String),
        },
        messages: [
            Sysadmin.SucceededLoadMetrics,
            Sysadmin.FailedLoadMetrics,
            Sysadmin.SucceededLoadSystem,
            Sysadmin.FailedLoadSystem,
        ],
        execute: ({ domain_id, source, scope_key }) => {
            if (domain_id === undefined)
                return Effect.succeed(
                    source === "metrics"
                        ? Sysadmin.FailedLoadMetrics({
                              error: "Select a workspace to view process metrics",
                              scope_key,
                          })
                        : Sysadmin.FailedLoadSystem({
                              error: "Select a workspace to view system data",
                              scope_key,
                          })
                )
            return load_account_process(domain_id, Date.now()).pipe(
                Effect.map((snapshot) =>
                    source === "metrics"
                        ? Sysadmin.SucceededLoadMetrics({
                              metrics: snapshot.metrics,
                              scope_key,
                          })
                        : Sysadmin.SucceededLoadSystem({
                              snapshot: snapshot.system,
                              scope_key,
                          })
                ),
                Effect.catch((error) =>
                    Effect.succeed(
                        source === "metrics"
                            ? Sysadmin.FailedLoadMetrics({
                                  error: globalThis.String(error),
                                  scope_key,
                              })
                            : Sysadmin.FailedLoadSystem({
                                  error: globalThis.String(error),
                                  scope_key,
                              })
                    )
                )
            )
        },
    }
)

const desktop_href = (href: string): string =>
    href.startsWith("/sysadmin") ? href.replace(/\/$/, "") : href

const translate_command = (
    command: Command.Command<Message>,
    account_domain_id?: string,
    process_scope_key?: string
): Commands => {
    const source = source_for_command(command.name)
    if (Option.isSome(source)) {
        if (account_domain_id === undefined) return []
        return [
            LoadSysadminAccountProcess({
                domain_id: account_domain_id,
                source: source.value,
                scope_key: process_scope_key,
            }),
        ]
    }

    if (command.name === "NavigateInternal") {
        return Option.match(S.decodeUnknownOption(NavigateArgs)(command.args), {
            onNone: () => [],
            onSome: ({ href }) => [
                NavigateDesktopSysadmin({ href: desktop_href(href) }),
            ],
        })
    }

    if (
        account_domain_id === undefined &&
        [
            "FetchAuditEvents",
            "FetchLogs",
            "FetchSpans",
            "FetchErrors",
            "FetchSessions",
        ].includes(command.name)
    )
        return []

    return [command]
}

const translate_commands = (
    commands: ReadonlyArray<Command.Command<Message>>,
    account_domain_id?: string,
    process_scope_key?: string
): Commands =>
    commands.flatMap((command) =>
        translate_command(command, account_domain_id, process_scope_key)
    )

const scope_key = (domain_id?: string, account_id?: string) =>
    domain_id === undefined || account_id === undefined
        ? undefined
        : `${account_id}:${domain_id}`

const data_route_tags = [
    "Audit",
    "Logging",
    "Tracing",
    "Errors",
    "Metrics",
    "System",
    "Sessions",
]

const settle_without_domain = (model: Model): Model => ({
    ...model,
    sessions: Sysadmin.SessionsAsyncData.Idle(),
    pendingRoutes: [],
    isLoading: false,
    error: null,
    telemetry_request_id: undefined,
    session_request_id: undefined,
    session_as_of: undefined,
})

export const init = (
    pathname: string,
    account_domain_id?: string,
    account_id?: string
): UpdateReturn => {
    const [model, commands] = Sysadmin.init(pathname)
    const process_scope_key = scope_key(account_domain_id, account_id)
    return [
        account_domain_id === undefined
            ? settle_without_domain({ ...model, process_scope_key })
            : { ...model, process_scope_key },
        translate_commands(commands, account_domain_id, process_scope_key),
    ]
}

export const changed_url = (
    model: Model,
    url: Url,
    pathname: string,
    account_domain_id?: string,
    account_id?: string
): UpdateReturn => {
    const [next_model, commands] = Sysadmin.update(
        model,
        Sysadmin.ChangedUrl({
            url: { ...url, pathname, hash: Option.none() },
        })
    )
    return [
        account_domain_id === undefined
            ? settle_without_domain(next_model)
            : next_model,
        translate_commands(
            commands,
            account_domain_id,
            scope_key(account_domain_id, account_id)
        ),
    ]
}

export const update = (
    model: Model,
    message: Message,
    account_domain_id?: string,
    account_id?: string
): UpdateReturn => {
    const [next_model, commands] = Sysadmin.update(model, message)
    const translated = translate_commands(
        commands,
        account_domain_id,
        scope_key(account_domain_id, account_id)
    )
    const inputs_changed =
        message._tag === "RequestedTelemetry" ||
        next_model.telemetry_refresh !== model.telemetry_refresh ||
        next_model.telemetry_all_tenants !== model.telemetry_all_tenants ||
        next_model.filter.action !== model.filter.action ||
        next_model.filter.result !== model.filter.result ||
        next_model.logFilter.level !== model.logFilter.level ||
        next_model.logFilter.source !== model.logFilter.source ||
        next_model.traceFilter.trace_id !== model.traceFilter.trace_id
    if (account_domain_id === undefined)
        return [settle_without_domain(next_model), translated]
    if (!inputs_changed) return [next_model, translated]
    const [requested, request_commands] = request_telemetry(
        next_model,
        account_domain_id
    )
    return [requested, [...translated, ...request_commands]]
}

export const view = Submodel.defineView<Model, Message>(
    (model: Model, h: HtmlBuilder<Message>): Html => Sysadmin.view(model, h)
)

export const telemetry_loaded = (
    snapshot: SysadminAccountTelemetry,
    request_id?: string
) => {
    const log_item = (log: SysadminAccountTelemetry["logs"][number]) => ({
        ...log,
        user_id: log.actor_user_id ?? undefined,
        trace_id: log.trace_id ?? undefined,
        span_id: log.span_id ?? undefined,
        session_id: log.session_id ?? undefined,
        domain_id: log.domain_id ?? undefined,
        request_id: log.request_id ?? undefined,
        created_at: new Date(log.created_at),
    })
    return Sysadmin.SucceededLoadTelemetry({
        request_id,
        events: snapshot.events.map((event) => ({
            ...event,
            entity_id: event.entity_id ?? undefined,
            reason_class: event.reason_class ?? undefined,
            actor_user_id: event.actor_user_id ?? undefined,
            request_id: event.request_id ?? undefined,
            created_at: new Date(event.created_at),
        })),
        logs: snapshot.logs.map(log_item),
        errors: snapshot.errors.map(log_item),
        spans: snapshot.spans.map((span) => ({
            ...span,
            parent_span_id: span.parent_span_id ?? undefined,
            started_at: new Date(span.started_at),
            created_at: new Date(span.created_at),
            ended_at:
                span.ended_at === null ? undefined : new Date(span.ended_at),
        })),
        has_more: snapshot.has_more,
        scope_name: snapshot.scope_name,
        can_view_all: snapshot.can_view_all,
    })
}

export const telemetry_failed = (error: string, request_id?: string) =>
    Sysadmin.FailedLoadTelemetry({ error, request_id })

const clear_sessions = (model: Model): Model => ({
    ...model,
    sessions: Sysadmin.SessionsAsyncData.Idle(),
    session_as_of: undefined,
    session_request_id: undefined,
    sessionsTotal: 0,
    sessions_has_more: false,
    sessions_scope_name: "",
    sessions_can_view_all: false,
    sessions_all_tenants: false,
})

export const clear_data = (model: Model): Model => ({
    ...clear_sessions(model),
    metrics: [],
    system: null,
    events: [],
    logs: [],
    errors: [],
    spans: [],
    total: 0,
    logsTotal: 0,
    errorsTotal: 0,
    spansTotal: 0,
    telemetry_has_more: false,
    telemetry_scope_name: "",
    telemetry_can_view_all: false,
    telemetry_all_tenants: false,
    telemetry_request_id: undefined,
})

const LoadSysadminAccountTelemetry = Command.define(
    "LoadSysadminAccountTelemetry",
    {
        args: {
            domain_id: S.String,
            all_tenants: S.Boolean,
            refresh: S.Number,
            action: S.optional(S.String),
            result: S.optional(S.String),
            level: S.optional(S.String),
            source: S.optional(S.String),
            trace_id: S.optional(S.String),
            request_id: S.String,
        },
        messages: [
            Sysadmin.SucceededLoadTelemetry,
            Sysadmin.FailedLoadTelemetry,
        ],
        execute: (args) =>
            load_account_telemetry({
                domain_id: args.domain_id,
                all_tenants: args.all_tenants,
                refresh: args.refresh,
                action: args.action,
                result: args.result,
                level: args.level,
                source: args.source,
                trace_id: args.trace_id,
            }).pipe(
                Effect.map((snapshot) =>
                    telemetry_loaded(snapshot, args.request_id)
                ),
                Effect.catch((error) =>
                    Effect.succeed(
                        telemetry_failed(
                            globalThis.String(error),
                            args.request_id
                        )
                    )
                )
            ),
    }
)

const request_telemetry = (model: Model, domain_id: string): UpdateReturn => {
    const request_id = globalThis.crypto.randomUUID()
    return [
        { ...model, telemetry_request_id: request_id },
        [
            LoadSysadminAccountTelemetry({
                domain_id,
                all_tenants: model.telemetry_all_tenants,
                refresh: model.telemetry_refresh,
                action: model.filter.action,
                result: model.filter.result,
                level: model.logFilter.level,
                source: model.logFilter.source,
                trace_id: model.traceFilter.trace_id,
                request_id,
            }),
        ],
    ]
}

const LoadSysadminAccountSessions = Command.define(
    "LoadSysadminAccountSessions",
    {
        args: {
            domain_id: S.optional(S.String),
            all_tenants: S.Boolean,
            as_of: S.Number,
            request_id: S.String,
        },
        messages: [Sysadmin.SucceededLoadSessions, Sysadmin.FailedLoadSessions],
        execute: (args) =>
            Effect.gen(function* () {
                if (args.domain_id === undefined)
                    return yield* Effect.fail(
                        "Select a workspace to view sessions"
                    )
                const snapshot = yield* load_account_sessions(
                    args.domain_id,
                    args.all_tenants,
                    args.as_of
                )
                return Sysadmin.SucceededLoadSessions({
                    request_id: args.request_id,
                    sessions: snapshot.sessions.map((session) => ({
                        ...session,
                        created_at: new Date(session.created_at),
                        last_seen_at: new Date(session.last_seen_at),
                        expires_at: new Date(session.expires_at),
                        revoked_at:
                            session.revoked_at === undefined
                                ? undefined
                                : new Date(session.revoked_at),
                    })),
                    total: snapshot.sessions.length,
                    as_of: snapshot.as_of,
                    has_more: snapshot.has_more,
                    scope_name: snapshot.scope_name,
                    can_view_all: snapshot.can_view_all,
                })
            }).pipe(
                Effect.catch((error) =>
                    Effect.succeed(
                        Sysadmin.FailedLoadSessions({
                            error: globalThis.String(error),
                            as_of: args.as_of,
                            request_id: args.request_id,
                        })
                    )
                )
            ),
    }
)

export const load_sessions = (
    domain_id: string | undefined,
    all_tenants: boolean,
    as_of: number,
    request_id: string
) => LoadSysadminAccountSessions({ domain_id, all_tenants, as_of, request_id })

export const account_domain_changed = (
    model: Model,
    domain_id: string | undefined,
    account_id?: string
): UpdateReturn => {
    const cleared = {
        ...clear_data(model),
        process_scope_key: scope_key(domain_id, account_id),
    }
    if (domain_id === undefined || domain_id === "")
        return [settle_without_domain(cleared), []]
    const loading = {
        ...cleared,
        pendingRoutes: data_route_tags,
        isLoading: data_route_tags.includes(cleared.route._tag),
        loadErrorsByRoute: {},
        error: null,
    }
    const as_of = Date.now()
    const request_id = globalThis.crypto.randomUUID()
    const [next] = Sysadmin.update(
        loading,
        Sysadmin.RequestedSessions({ as_of, request_id })
    )
    const telemetry_request = request_telemetry(
        {
            ...next,
            telemetry_refresh:
                next.telemetry_refresh === 0
                    ? Date.now()
                    : next.telemetry_refresh,
        },
        domain_id
    )
    return [
        telemetry_request[0],
        [
            LoadSysadminAccountSessions({
                domain_id,
                all_tenants: next.sessions_all_tenants,
                as_of,
                request_id,
            }),
            ...telemetry_request[1],
            LoadSysadminAccountProcess({
                domain_id,
                source: "metrics",
                scope_key: cleared.process_scope_key,
            }),
            LoadSysadminAccountProcess({
                domain_id,
                source: "system",
                scope_key: cleared.process_scope_key,
            }),
        ],
    ]
}
