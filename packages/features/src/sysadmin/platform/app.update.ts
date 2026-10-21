import { Effect, Match as M, Option, Result } from "effect"
import { AsyncData, Command, Struct } from "foldkit"
import { toString as urlToString } from "foldkit/url"
import { Tooltip } from "@foldkit/ui"
import {
    SIDEBAR_TOOLTIP_HOME_KEY,
    SIDEBAR_TOOLTIP_TOGGLE_KEY,
} from "@urm/ui/foldkit/sidebar-shell.tooltips.ts"
import { urlToAppRoute, isAppScope } from "./route.ts"
import { navigateInternal, loadExternal } from "./route.command.ts"
import { ClickedLink } from "./route.message.ts"
import {
    fetchAuditEvents,
    fetchLogs,
    fetchSpans,
    fetchErrors,
    fetchMetrics,
    fetchSystem,
    fetchSessions,
} from "./app.command.ts"
import { GotSidebarTooltipMessage, type Message } from "./app.message.ts"
import { Model, SessionsAsyncData, initialModel } from "./app.model.ts"
import {
    getSidebarTooltipsState,
    setSidebarTooltipsState,
} from "./sidebar.tooltips.state.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const mapSidebarTooltipCommands = (
    key: string,
    commands: ReadonlyArray<Command.Command<Tooltip.Message>>
) =>
    commands.map(
        Command.mapEffect(
            Effect.map((message) =>
                GotSidebarTooltipMessage({ tooltipId: key, message })
            )
        )
    )

const delegateSidebarTooltip = (
    model: Model,
    key: string,
    message: Tooltip.Message
): UpdateReturn => {
    const sidebarTooltips = getSidebarTooltipsState()

    const maybeTooltip =
        key === SIDEBAR_TOOLTIP_TOGGLE_KEY
            ? sidebarTooltips.toggle
            : key === SIDEBAR_TOOLTIP_HOME_KEY
              ? sidebarTooltips.home
              : sidebarTooltips.navItems[key]

    if (maybeTooltip === undefined) {
        return [model, []]
    }

    const { model: nextTooltip, commands = [] } = Tooltip.update(
        maybeTooltip,
        message
    )

    const nextSidebarTooltips =
        key === SIDEBAR_TOOLTIP_TOGGLE_KEY
            ? { ...sidebarTooltips, toggle: nextTooltip }
            : key === SIDEBAR_TOOLTIP_HOME_KEY
              ? { ...sidebarTooltips, home: nextTooltip }
              : {
                    ...sidebarTooltips,
                    navItems: {
                        ...sidebarTooltips.navItems,
                        [key]: nextTooltip,
                    },
                }

    setSidebarTooltipsState(nextSidebarTooltips)

    return [
        Struct.evo(model, {
            sidebarTooltipsRevision: () => model.sidebarTooltipsRevision + 1,
        }),
        mapSidebarTooltipCommands(key, commands),
    ]
}

const handleClickedLink = (
    model: Model,
    request: (typeof ClickedLink.Type)["request"]
): UpdateReturn =>
    M.value(request).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            Internal: ({ url }) => {
                if (isAppScope(url.pathname)) {
                    return [model, [navigateInternal(url)]]
                }

                return [model, [loadExternal(urlToString(url))]]
            },
            External: ({ href }) => [model, [loadExternal(href)]],
        })
    )

const routeCommands = (
    route: Model["route"],
    model: Model
): ReadonlyArray<Command.Command<Message>> => {
    switch (route._tag) {
        case "Logging":
            return [
                fetchLogs({
                    ...model.logFilter,
                    domain_id: model.domainFilter,
                }),
            ]
        case "Audit":
            return [
                fetchAuditEvents({
                    ...model.filter,
                    domain_id: model.domainFilter,
                }),
            ]
        case "Tracing":
            return [fetchSpans(model.traceFilter)]
        case "Errors":
            return [fetchErrors(model.domainFilter)]
        case "Metrics":
            return [fetchMetrics()]
        case "System":
            return [fetchSystem()]
        case "Sessions":
            return [fetchSessions(model.sessionFilter)]
        default:
            return []
    }
}

const data_route_tags = [
    "Audit",
    "Logging",
    "Tracing",
    "Errors",
    "Metrics",
    "System",
    "Sessions",
]

const allDataCommands = (
    model: Model
): ReadonlyArray<Command.Command<Message>> => [
    fetchAuditEvents({ ...model.filter, domain_id: model.domainFilter }),
    fetchLogs({ ...model.logFilter, domain_id: model.domainFilter }),
    fetchSpans(model.traceFilter),
    fetchErrors(model.domainFilter),
    fetchMetrics(),
    fetchSystem(),
    fetchSessions(model.sessionFilter),
]

const domain_filtered_route_tags = ["Audit", "Logging", "Errors"]

const domainFilteredCommands = (
    model: Model
): ReadonlyArray<Command.Command<Message>> => [
    fetchAuditEvents({ ...model.filter, domain_id: model.domainFilter }),
    fetchLogs({ ...model.logFilter, domain_id: model.domainFilter }),
    fetchErrors(model.domainFilter),
]

const beginLoad = (model: Model, route_tag: string): Model => {
    const load_errors_by_route = { ...model.loadErrorsByRoute }
    delete load_errors_by_route[route_tag]

    return Struct.evo(model, {
        sessions: (sessions) =>
            route_tag === "Sessions"
                ? Option.getOrElse(
                      AsyncData.revalidateOrLoad(sessions),
                      () => sessions
                  )
                : sessions,
        pendingRoutes: (pending_routes) =>
            pending_routes.includes(route_tag)
                ? pending_routes
                : [...pending_routes, route_tag],
        loadErrorsByRoute: () => load_errors_by_route,
        isLoading: (is_loading) =>
            model.route._tag === route_tag ? true : is_loading,
        error: (current_error) =>
            model.route._tag === route_tag ? null : current_error,
    })
}

const completeLoad = (
    model: Model,
    route_tag: string,
    error: string | null
): Model => {
    const load_errors_by_route = { ...model.loadErrorsByRoute }
    if (error === null) {
        delete load_errors_by_route[route_tag]
    } else {
        load_errors_by_route[route_tag] = error
    }

    return Struct.evo(model, {
        pendingRoutes: (pending_routes) =>
            pending_routes.filter((candidate) => candidate !== route_tag),
        loadErrorsByRoute: () => load_errors_by_route,
        isLoading: (is_loading) =>
            model.route._tag === route_tag ? false : is_loading,
        error: (current_error) =>
            model.route._tag === route_tag ? error : current_error,
    })
}

export const init = (pathname: string): UpdateReturn => {
    const route = urlToAppRoute(pathname)
    const initial = initialModel(route)
    return [
        Struct.evo(initial, {
            pendingRoutes: () => data_route_tags,
            isLoading: () => data_route_tags.includes(route._tag),
        }),
        allDataCommands(initial),
    ]
}

export const update = (model: Model, message: Message): UpdateReturn => {
    switch (message._tag) {
        case "RequestedTelemetry":
            return [{ ...model, telemetry_refresh: message.refresh }, []]
        case "UpdatedTelemetryScope":
            return [
                {
                    ...model,
                    telemetry_all_tenants: message.all_tenants,
                    events: [],
                    logs: [],
                    errors: [],
                    spans: [],
                    total: 0,
                    logsTotal: 0,
                    errorsTotal: 0,
                    spansTotal: 0,
                    telemetry_scope_name: "",
                    telemetry_has_more: false,
                },
                [],
            ]
        case "SucceededLoadTelemetry": {
            if (
                message.request_id !== undefined &&
                message.request_id !== model.telemetry_request_id
            )
                return [model, []]
            const next: Model = {
                ...model,
                events: message.events,
                logs: message.logs,
                errors: message.errors,
                spans: message.spans,
                total: message.events.length,
                logsTotal: message.logs.length,
                errorsTotal: message.errors.length,
                spansTotal: message.spans.length,
                telemetry_has_more: message.has_more,
                telemetry_scope_name: message.scope_name,
                telemetry_can_view_all: message.can_view_all,
                telemetry_request_id: undefined,
            }
            return [
                ["Audit", "Logging", "Errors", "Tracing"].reduce(
                    (state, route) => completeLoad(state, route, null),
                    next
                ),
                [],
            ]
        }
        case "FailedLoadTelemetry": {
            if (
                message.request_id !== undefined &&
                message.request_id !== model.telemetry_request_id
            )
                return [model, []]
            const next: Model = {
                ...model,
                events: [],
                logs: [],
                errors: [],
                spans: [],
                total: 0,
                logsTotal: 0,
                errorsTotal: 0,
                spansTotal: 0,
                telemetry_scope_name: "",
                telemetry_has_more: false,
                telemetry_can_view_all: false,
                telemetry_request_id: undefined,
            }
            return [
                ["Audit", "Logging", "Errors", "Tracing"].reduce(
                    (state, route) => completeLoad(state, route, message.error),
                    next
                ),
                [],
            ]
        }
        case "ClickedRefresh": {
            if (
                model.route._tag === "Sessions" &&
                AsyncData.isPending(model.sessions)
            )
                return [model, []]
            const commands = routeCommands(model.route, model)

            return [
                commands.length > 0
                    ? beginLoad(model, model.route._tag)
                    : model,
                commands,
            ]
        }
        case "UpdatedFilterAction":
            return [
                Struct.evo(model, {
                    filter: () =>
                        Struct.evo(model.filter, {
                            action: () => message.value,
                        }),
                }),
                [],
            ]
        case "UpdatedFilterResult":
            return [
                Struct.evo(model, {
                    filter: () =>
                        Struct.evo(model.filter, {
                            result: () => message.value,
                        }),
                }),
                [],
            ]
        case "ClearedFilter":
            return [
                beginLoad(Struct.evo(model, { filter: () => ({}) }), "Audit"),
                [fetchAuditEvents({})],
            ]
        case "SucceededLoadAuditEvents":
            return [
                completeLoad(
                    Struct.evo(model, {
                        events: () => message.events,
                        total: () => message.total,
                    }),
                    "Audit",
                    null
                ),
                [],
            ]
        case "FailedLoadAuditEvents":
            return [completeLoad(model, "Audit", message.error), []]
        case "UpdatedLogFilterLevel":
            return [
                Struct.evo(model, {
                    logFilter: () =>
                        Struct.evo(model.logFilter, {
                            level: () => message.value,
                        }),
                }),
                [],
            ]
        case "UpdatedLogFilterSource":
            return [
                Struct.evo(model, {
                    logFilter: () =>
                        Struct.evo(model.logFilter, {
                            source: () => message.value,
                        }),
                }),
                [],
            ]
        case "ClearedLogFilter":
            return [
                beginLoad(
                    Struct.evo(model, { logFilter: () => ({}) }),
                    "Logging"
                ),
                [fetchLogs({})],
            ]
        case "SucceededLoadLogs":
            return [
                completeLoad(
                    Struct.evo(model, {
                        logs: () => message.logs,
                        logsTotal: () => message.total,
                    }),
                    "Logging",
                    null
                ),
                [],
            ]
        case "FailedLoadLogs":
            return [completeLoad(model, "Logging", message.error), []]
        case "UpdatedTraceFilterTraceId":
            return [
                Struct.evo(model, {
                    traceFilter: () =>
                        Struct.evo(model.traceFilter, {
                            trace_id: () => message.value,
                        }),
                }),
                [],
            ]
        case "ClearedTraceFilter":
            return [
                beginLoad(
                    Struct.evo(model, { traceFilter: () => ({}) }),
                    "Tracing"
                ),
                [fetchSpans({})],
            ]
        case "SucceededLoadSpans":
            return [
                completeLoad(
                    Struct.evo(model, {
                        spans: () => message.spans,
                        spansTotal: () => message.total,
                    }),
                    "Tracing",
                    null
                ),
                [],
            ]
        case "FailedLoadSpans":
            return [completeLoad(model, "Tracing", message.error), []]
        case "SucceededLoadErrors":
            return [
                completeLoad(
                    Struct.evo(model, {
                        errors: () => message.logs,
                        errorsTotal: () => message.total,
                    }),
                    "Errors",
                    null
                ),
                [],
            ]
        case "FailedLoadErrors":
            return [completeLoad(model, "Errors", message.error), []]
        case "SucceededLoadMetrics":
            if (message.scope_key !== model.process_scope_key)
                return [model, []]
            return [
                completeLoad(
                    Struct.evo(model, { metrics: () => message.metrics }),
                    "Metrics",
                    null
                ),
                [],
            ]
        case "FailedLoadMetrics":
            if (message.scope_key !== model.process_scope_key)
                return [model, []]
            return [completeLoad(model, "Metrics", message.error), []]
        case "SucceededLoadSystem":
            if (message.scope_key !== model.process_scope_key)
                return [model, []]
            return [
                completeLoad(
                    Struct.evo(model, { system: () => message.snapshot }),
                    "System",
                    null
                ),
                [],
            ]
        case "FailedLoadSystem":
            if (message.scope_key !== model.process_scope_key)
                return [model, []]
            return [completeLoad(model, "System", message.error), []]
        case "UpdatedDomainFilter": {
            const next = Struct.evo(model, {
                domainFilter: () => message.value,
            })
            let next_loading = next
            for (const route_tag of domain_filtered_route_tags) {
                next_loading = beginLoad(next_loading, route_tag)
            }

            return [next_loading, domainFilteredCommands(next)]
        }
        case "UpdatedSessionFilterStatus":
            return [{ ...model, sessionFilter: { status: message.value } }, []]
        case "RequestedSessions":
            return [
                {
                    ...model,
                    session_as_of: message.as_of,
                    session_request_id: message.request_id,
                    sessions: Option.getOrElse(
                        AsyncData.revalidateOrLoad(model.sessions),
                        () => model.sessions
                    ),
                },
                [],
            ]
        case "UpdatedSessionScope":
            return [
                beginLoad(
                    {
                        ...model,
                        sessions_all_tenants: message.all_tenants,
                        sessions: SessionsAsyncData.Loading(),
                        session_as_of: undefined,
                        session_request_id: undefined,
                        sessionsTotal: 0,
                    },
                    "Sessions"
                ),
                [fetchSessions(model.sessionFilter)],
            ]
        case "SucceededLoadSessions":
            if (
                message.as_of !== model.session_as_of ||
                (message.request_id !== undefined &&
                    message.request_id !== model.session_request_id)
            )
                return [model, []]
            return [
                completeLoad(
                    Struct.evo(model, {
                        sessions: () =>
                            SessionsAsyncData.Success({
                                data: message.sessions,
                            }),
                        session_as_of: (as_of) => message.as_of ?? as_of,
                        sessionsTotal: () => message.total,
                        sessions_has_more: () => message.has_more,
                        sessions_scope_name: () => message.scope_name,
                        sessions_can_view_all: () => message.can_view_all,
                    }),
                    "Sessions",
                    null
                ),
                [],
            ]
        case "FailedLoadSessions":
            if (
                (message.as_of !== undefined &&
                    message.as_of !== model.session_as_of) ||
                (message.request_id !== undefined &&
                    message.request_id !== model.session_request_id)
            )
                return [model, []]
            return [
                completeLoad(
                    {
                        ...model,
                        sessions: AsyncData.settle(
                            model.sessions,
                            Result.fail(message.error)
                        ),
                    },
                    "Sessions",
                    message.error
                ),
                [],
            ]
        case "ChangedUrl": {
            const route = urlToAppRoute(message.url.pathname)

            return [
                Struct.evo(model, {
                    route: () => route,
                    isLoading: () => model.pendingRoutes.includes(route._tag),
                    error: () => model.loadErrorsByRoute[route._tag] ?? null,
                }),
                [],
            ]
        }
        case "ClickedLink":
            return handleClickedLink(model, message.request)
        case "CompletedNavigateInternal":
            return [model, []]
        case "CompletedLoadExternal":
            return [model, []]
        case "ToggledAppSidebarIsCollapsed":
            return [
                Struct.evo(model, {
                    isSidebarCollapsed: () => !model.isSidebarCollapsed,
                }),
                [],
            ]
        case "ToggledAppSidebarMobileIsOpen":
            return [
                Struct.evo(model, {
                    isSidebarMobileOpen: () => !model.isSidebarMobileOpen,
                }),
                [],
            ]
        case "GotSidebarTooltipMessage":
            return delegateSidebarTooltip(
                model,
                message.tooltipId,
                message.message
            )
    }
}
