import { AsyncData, Submodel } from "foldkit"
import { Option } from "effect"
import { type Document, type HtmlBuilder } from "foldkit/html"
import {
    sidebarShellMobileView,
    sidebarShellView,
} from "@urm/ui/foldkit/sidebar-shell.view.ts"
import * as AppIcon from "@urm/ui/foldkit/icons/view.ts"
import { getSidebarTooltipsState } from "./sidebar.tooltips.state.ts"
import {
    ClickedRefresh,
    UpdatedFilterAction,
    UpdatedFilterResult,
    ClearedFilter,
    UpdatedLogFilterLevel,
    UpdatedLogFilterSource,
    ClearedLogFilter,
    UpdatedTraceFilterTraceId,
    ClearedTraceFilter,
    UpdatedSessionFilterStatus,
    UpdatedSessionScope,
    UpdatedTelemetryScope,
    ToggledAppSidebarIsCollapsed,
    ToggledAppSidebarMobileIsOpen,
    GotSidebarTooltipMessage,
} from "./app.message.ts"
import { persistence_unavailable_error } from "./app.model.ts"
import type {
    LogLevel,
    Model,
    SessionStatus,
    SessionItem,
} from "./app.model.ts"
import {
    auditHref,
    loggingHref,
    tracingHref,
    metricsHref,
    errorsHref,
    sessionsHref,
    systemHref,
} from "./route.ts"
import { type Html } from "foldkit/html"
import { Message } from "./app.message.ts"
import { sessions_chart_view } from "./sessions-chart.view.ts"

const loginHref = (): string => "/"

const badge_view = (
    label: string,
    color_class: string,
    h: HtmlBuilder<Message>
): Html =>
    h.span(
        [
            h.Class(
                `inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-control)] border px-2 py-0.5 text-xs font-medium ${color_class}`
            ),
        ],
        [
            h.span(
                [
                    h.AriaHidden(true),
                    h.Class("size-1.5 shrink-0 rounded-full bg-current"),
                ],
                []
            ),
            label,
        ]
    )

const neutral_badge_class = "border-border bg-muted text-muted-foreground"
const success_badge_class = "border-success/30 bg-success/10 text-success"
const warning_badge_class = "border-warning/30 bg-warning/10 text-warning"
const error_badge_class =
    "border-destructive/30 bg-destructive/10 text-destructive"
const info_badge_class = "border-primary/30 bg-primary/10 text-primary"

const audit_action_class = (action: string): string => {
    const operation = action
        .split(/[.:/_-]/)
        .at(-1)
        ?.toLowerCase()
    switch (operation) {
        case "create":
        case "created":
        case "add":
        case "insert":
            return success_badge_class
        case "update":
        case "updated":
        case "rename":
        case "patch":
            return info_badge_class
        case "delete":
        case "deleted":
        case "remove":
        case "revoke":
            return error_badge_class
        default:
            return neutral_badge_class
    }
}

const audit_result_class = (result: string): string => {
    switch (result) {
        case "success":
            return success_badge_class
        case "failure":
            return error_badge_class
        default:
            return neutral_badge_class
    }
}

const stableToggledAppSidebarIsCollapsed = ToggledAppSidebarIsCollapsed()
const stableToggledAppSidebarMobileIsOpen = ToggledAppSidebarMobileIsOpen()

const toSidebarTooltipMessage = (
    key: string,
    message: import("@foldkit/ui/tooltip").Message
) => GotSidebarTooltipMessage({ tooltipId: key, message })

type NavItem = Readonly<{
    label: string
    routeTag: string
    href: string
    icon: (props?: Readonly<{ class?: string }>) => import("foldkit/html").Html
}>

const NAV_ITEMS: ReadonlyArray<NavItem> = [
    {
        label: "Audit",
        routeTag: "Audit",
        href: auditHref(),
        icon: AppIcon.IconLayoutDashboard,
    },
    {
        label: "Logging",
        routeTag: "Logging",
        href: loggingHref(),
        icon: AppIcon.IconTerminal,
    },
    {
        label: "Tracing",
        routeTag: "Tracing",
        href: tracingHref(),
        icon: AppIcon.IconLayout,
    },
    {
        label: "Metrics",
        routeTag: "Metrics",
        href: metricsHref(),
        icon: AppIcon.IconChartColumnDecreasing,
    },
    {
        label: "Errors",
        routeTag: "Errors",
        href: errorsHref(),
        icon: AppIcon.IconAlertTriangle,
    },
    {
        label: "Sessions",
        routeTag: "Sessions",
        href: sessionsHref(),
        icon: AppIcon.IconUsers,
    },
    {
        label: "System",
        routeTag: "System",
        href: systemHref(),
        icon: AppIcon.IconSettings,
    },
]

const sidebarRouteTag = (route: Model["route"]): string => {
    switch (route._tag) {
        case "Home":
            return "Sysadmin"
        case "Audit":
            return "Audit"
        case "Logging":
            return "Logging"
        case "Tracing":
            return "Tracing"
        case "Metrics":
            return "Metrics"
        case "Errors":
            return "Errors"
        case "Sessions":
            return "Sessions"
        case "System":
            return "System"
        default:
            return "Audit"
    }
}

const sidebarView = (
    currentRouteTag: string,
    isCollapsed: boolean,
    h: HtmlBuilder<Message>
) =>
    sidebarShellView<Message>(
        {
            currentRoute: currentRouteTag,
            title: "Sysadmin",
            subtitle: "URM",
            homeHref: auditHref(),
            homeIcon: AppIcon.IconLayoutDashboard,
            toggleIconCollapsed: AppIcon.IconSidebarOpen,
            toggleIconExpanded: AppIcon.IconPanelLeft,
            navItems: NAV_ITEMS,
            sidebarTooltips: getSidebarTooltipsState(),
            isCollapsed,
            onToggle: stableToggledAppSidebarIsCollapsed,
            toSidebarTooltipMessage,
        },
        h
    )

const sidebarMobileView = (
    currentRouteTag: string,
    isOpen: boolean,
    h: HtmlBuilder<Message>
) =>
    sidebarShellMobileView<Message>(
        {
            currentRoute: currentRouteTag,
            title: "Sysadmin",
            subtitle: "URM",
            homeHref: auditHref(),
            homeIcon: AppIcon.IconLayoutDashboard,
            navItems: NAV_ITEMS,
            isOpen,
            onToggle: stableToggledAppSidebarMobileIsOpen,
        },
        h
    )

const domainFilterBar = (model: Model, h: HtmlBuilder<Message>): Html => {
    if (!["Audit", "Logging", "Errors", "Tracing"].includes(model.route._tag))
        return h.empty
    return h.div(
        [h.Class("mb-4 flex flex-col gap-2 text-sm text-muted-foreground")],
        [
            h.p(
                [],
                [
                    model.telemetry_scope_name === ""
                        ? "Loading tenant scope…"
                        : `Scope: ${model.telemetry_scope_name}.`,
                    " Filters apply to the most recent 100 records per source.",
                    model.telemetry_has_more
                        ? " Additional records are available."
                        : "",
                ]
            ),
            ...(model.telemetry_can_view_all
                ? [
                      h.label(
                          [h.Class("flex items-center gap-2")],
                          [
                              h.input([
                                  h.Type("checkbox"),
                                  ...(model.telemetry_all_tenants
                                      ? [h.Checked(true)]
                                      : []),
                                  h.OnClick(
                                      UpdatedTelemetryScope({
                                          all_tenants:
                                              !model.telemetry_all_tenants,
                                      })
                                  ),
                              ]),
                              "All tenants (platform sysadmin)",
                          ]
                      ),
                  ]
                : []),
            ...(model.route._tag === "Tracing"
                ? [
                      h.p(
                          [],
                          [
                              "Mutation spans show operation boundaries; duration is unavailable in the transactional runtime.",
                          ]
                      ),
                  ]
                : []),
        ]
    )
}

const sysadminView = (model: Model, h: HtmlBuilder<Message>): Html => {
    const content = routeContent(model, h)

    return h.main(
        [h.Class("min-h-screen bg-background p-4 text-foreground md:p-8")],
        [
            h.div(
                [h.Class("mx-auto max-w-6xl")],
                [domainFilterBar(model, h), content]
            ),
        ]
    )
}

export const submodelView = Submodel.defineView<Model, Message>(sysadminView)

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
    const currentRouteTag = sidebarRouteTag(model.route)
    const title = pageTitle(model.route)

    return {
        title,
        body: h.div(
            [h.Class("min-h-screen bg-background text-foreground")],
            [
                sidebarMobileView(
                    currentRouteTag,
                    model.isSidebarMobileOpen,
                    h
                ),
                h.div(
                    [h.Class("flex h-[calc(100dvh-4rem)] overflow-hidden")],
                    [
                        sidebarView(
                            currentRouteTag,
                            model.isSidebarCollapsed,
                            h
                        ),
                        h.main(
                            [
                                h.Class(
                                    "relative z-0 flex-1 h-full min-h-0 overflow-auto bg-background"
                                ),
                            ],
                            [sysadminView(model, h)]
                        ),
                    ]
                ),
            ]
        ),
    }
}

const pageTitle = (route: Model["route"]): string => {
    switch (route._tag) {
        case "Audit":
            return "Audit Log"
        case "Logging":
            return "Logging"
        case "Tracing":
            return "Tracing"
        case "Metrics":
            return "Metrics"
        case "Errors":
            return "Errors"
        case "Sessions":
            return "Sessions"
        case "System":
            return "System"
        default:
            return "Sysadmin"
    }
}

const routeContent = (model: Model, h: HtmlBuilder<Message>) => {
    switch (model.route._tag) {
        case "Home":
            return sysadminLandingView()
        case "Audit":
            return auditView(model, h)
        case "Logging":
            return loggingView(model, h)
        case "Tracing":
            return tracingView(model, h)
        case "Metrics":
            return metricsView(model, h)
        case "Errors":
            return errorsView(model, h)
        case "Sessions":
            return sessionsView(model, h)
        case "System":
            return systemView(model, h)
        default:
            return placeholderView(
                "Not Found",
                `The path "${model.route.path}" was not found.`,
                h
            )
    }

    function sysadminLandingView() {
        return h.div(
            [h.Class("max-w-2xl space-y-3")],
            [
                h.h1(
                    [
                        h.Class(
                            "text-2xl font-semibold tracking-tight text-foreground"
                        ),
                    ],
                    ["Sysadmin"]
                ),
                h.p(
                    [h.Class("text-muted-foreground")],
                    ["Operational observability tools will live here."]
                ),
            ]
        )
    }
}

const authorizationErrorView = (
    error: string,
    h: HtmlBuilder<Message>
): Html => {
    if (error.includes(persistence_unavailable_error)) {
        return h.div(
            [
                h.Class(
                    "mb-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-muted/50 p-4 text-foreground"
                ),
            ],
            [
                h.h2([h.Class("font-semibold")], ["Data source pending"]),
                h.p([h.Class("mt-1 text-sm text-muted-foreground")], [error]),
            ]
        )
    }

    if (error.includes("Authentication required")) {
        return h.div(
            [
                h.Class(
                    "mb-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-primary/40 bg-primary/10 p-4 text-foreground"
                ),
            ],
            [
                h.h2(
                    [h.Class("font-semibold text-primary")],
                    ["Sign in required"]
                ),
                h.p(
                    [h.Class("mt-1 text-sm text-muted-foreground")],
                    [
                        "Sign in with an account that has Sysadmin access, then refresh this page.",
                    ]
                ),
                h.a(
                    [
                        h.Href(loginHref()),
                        h.Class(
                            "mt-3 inline-block text-sm font-medium text-primary underline"
                        ),
                    ],
                    ["Sign in"]
                ),
            ]
        )
    }

    if (
        error.includes("Not permitted") ||
        error.toLowerCase().includes("sysadmin access denied") ||
        error.toLowerCase().includes("sysadmin access required")
    ) {
        return h.div(
            [
                h.Class(
                    "mb-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-destructive/40 bg-destructive/10 p-4 text-foreground"
                ),
            ],
            [
                h.h2(
                    [h.Class("font-semibold text-destructive")],
                    ["Sysadmin access required"]
                ),
                h.p(
                    [h.Class("mt-1 text-sm text-muted-foreground")],
                    [
                        "This account needs an active tenant sysadmin role, or a platform_sysadmin role for global access.",
                    ]
                ),
            ]
        )
    }

    return h.div(
        [
            h.Class(
                "mb-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-destructive/40 bg-destructive/10 p-4"
            ),
        ],
        [
            h.h2(
                [h.Class("font-semibold text-destructive")],
                ["Unable to load Sysadmin data"]
            ),
            h.p(
                [h.Class("mt-1 text-sm text-muted-foreground")],
                [
                    "Try refreshing the page. If the problem persists, check the server logs.",
                ]
            ),
        ]
    )
}

const auditView = (model: Model, h: HtmlBuilder<Message>) =>
    h.div(
        [],
        [
            h.h1([h.Class("text-2xl font-bold mb-4")], ["Audit Log"]),
            filterBar(model, h),
            model.error !== null
                ? authorizationErrorView(model.error, h)
                : null,
            model.events.length === 0 && !model.isLoading
                ? h.p([], ["No audit events found."])
                : tableShell(auditTable(model, h), h),
        ]
    )

const filterBar = (model: Model, h: HtmlBuilder<Message>) =>
    h.div(
        [h.Class("flex gap-2 mb-4 items-center")],
        [
            h.input([
                h.Class(
                    "p-1 border-(length:--field-border-width) border-border rounded-[var(--radius-control)]"
                ),
                h.Placeholder("Filter by action..."),
                h.OnInput((value: string) => UpdatedFilterAction({ value })),
            ]),
            h.input([
                h.Class(
                    "p-1 border-(length:--field-border-width) border-border rounded-[var(--radius-control)]"
                ),
                h.Placeholder("Filter by result..."),
                h.OnInput((value: string) => UpdatedFilterResult({ value })),
            ]),
            h.button(
                [
                    h.Class(
                        "px-3 py-1.5 rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border text-sm cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                    ),
                    h.OnClick(ClickedRefresh()),
                ],
                ["Refresh"]
            ),
            h.button(
                [
                    h.Class(
                        "px-3 py-1.5 rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border text-sm cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                    ),
                    h.OnClick(ClearedFilter()),
                ],
                ["Clear"]
            ),
            model.isLoading ? h.span([], ["Loading..."]) : null,
        ]
    )

/* The sysadmin tables carry only row rules, so under a themed shell they read as
   unframed text. The frame lives on a wrapper rather than the table itself:
   border-collapse and border-radius do not combine, so the radius has to be
   clipped by a parent. */
const tableShell = (table: Html, h: HtmlBuilder<Message>) =>
    h.div(
        [
            h.Class(
                "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [table]
    )

const auditTable = (model: Model, h: HtmlBuilder<Message>) =>
    h.table(
        [h.Class("w-full border-collapse text-sm")],
        [
            h.thead(
                [],
                [
                    h.tr(
                        [],
                        [
                            h.th(
                                [
                                    h.Class(
                                        "p-2 text-left border-b-2 border-border font-bold"
                                    ),
                                ],
                                ["Time"]
                            ),
                            h.th(
                                [
                                    h.Class(
                                        "p-2 text-left border-b-2 border-border font-bold"
                                    ),
                                ],
                                ["Action"]
                            ),
                            h.th(
                                [
                                    h.Class(
                                        "p-2 text-left border-b-2 border-border font-bold"
                                    ),
                                ],
                                ["Entity"]
                            ),
                            h.th(
                                [
                                    h.Class(
                                        "p-2 text-left border-b-2 border-border font-bold"
                                    ),
                                ],
                                ["Entity ID"]
                            ),
                            h.th(
                                [
                                    h.Class(
                                        "p-2 text-left border-b-2 border-border font-bold"
                                    ),
                                ],
                                ["Result"]
                            ),
                            h.th(
                                [
                                    h.Class(
                                        "p-2 text-left border-b-2 border-border font-bold"
                                    ),
                                ],
                                ["Reason"]
                            ),
                            h.th(
                                [
                                    h.Class(
                                        "p-2 text-left border-b-2 border-border font-bold"
                                    ),
                                ],
                                ["User"]
                            ),
                            h.th(
                                [
                                    h.Class(
                                        "p-2 text-left border-b-2 border-border font-bold"
                                    ),
                                ],
                                ["Actor"]
                            ),
                        ]
                    ),
                ]
            ),
            h.tbody(
                [],
                model.events.map((event) =>
                    h.tr(
                        [
                            h.Class(
                                "border-b-(length:--surface-border-width) border-border"
                            ),
                        ],
                        [
                            h.td(
                                [
                                    h.Class(
                                        "p-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-48"
                                    ),
                                ],
                                [formatDate(event.created_at)]
                            ),
                            h.td(
                                [
                                    h.Class(
                                        "p-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-48"
                                    ),
                                ],
                                [
                                    badge_view(
                                        event.action,
                                        audit_action_class(event.action),
                                        h
                                    ),
                                ]
                            ),
                            h.td(
                                [
                                    h.Class(
                                        "p-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-48"
                                    ),
                                ],
                                [event.entity_type]
                            ),
                            h.td(
                                [
                                    h.Class(
                                        "p-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-48"
                                    ),
                                ],
                                [event.entity_id ?? "-"]
                            ),
                            h.td(
                                [h.Class("p-2 whitespace-nowrap")],
                                [
                                    badge_view(
                                        event.result,
                                        audit_result_class(event.result),
                                        h
                                    ),
                                ]
                            ),
                            h.td(
                                [
                                    h.Class(
                                        "p-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-48"
                                    ),
                                ],
                                [event.reason_class ?? "-"]
                            ),
                            h.td(
                                [
                                    h.Class(
                                        "p-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-48"
                                    ),
                                ],
                                [event.user_id ?? "-"]
                            ),
                            h.td(
                                [
                                    h.Class(
                                        "p-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-48"
                                    ),
                                ],
                                [event.actor_user_id ?? "-"]
                            ),
                        ]
                    )
                )
            ),
        ]
    )

const loggingView = (model: Model, h: HtmlBuilder<Message>) =>
    h.div(
        [],
        [
            h.h1([h.Class("text-2xl font-bold mb-4")], ["Logs"]),
            logFilterBar(model, h),
            model.error !== null
                ? authorizationErrorView(model.error, h)
                : null,
            model.logs.length === 0 && !model.isLoading
                ? h.p([], ["No logs found."])
                : tableShell(logTable(model, h), h),
        ]
    )

const logFilterBar = (model: Model, h: HtmlBuilder<Message>) =>
    h.div(
        [h.Class("flex gap-2 mb-4 items-center")],
        [
            h.select(
                [
                    h.Class(
                        "p-1 border-(length:--field-border-width) border-border rounded-[var(--radius-control)]"
                    ),
                    h.OnInput((value: string) =>
                        UpdatedLogFilterLevel({
                            value: log_level_from_value(value),
                        })
                    ),
                ],
                [
                    h.option([h.Value("")], ["All levels"]),
                    h.option([h.Value("debug")], ["debug"]),
                    h.option([h.Value("info")], ["info"]),
                    h.option([h.Value("warning")], ["warning"]),
                    h.option([h.Value("error")], ["error"]),
                ]
            ),
            h.input([
                h.Class(
                    "p-1 border-(length:--field-border-width) border-border rounded-[var(--radius-control)]"
                ),
                h.Placeholder("Filter by source..."),
                h.OnInput((value: string) => UpdatedLogFilterSource({ value })),
            ]),
            h.button(
                [
                    h.Class(
                        "px-3 py-1.5 rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border text-sm cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                    ),
                    h.OnClick(ClickedRefresh()),
                ],
                ["Refresh"]
            ),
            h.button(
                [
                    h.Class(
                        "px-3 py-1.5 rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border text-sm cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                    ),
                    h.OnClick(ClearedLogFilter()),
                ],
                ["Clear"]
            ),
            model.isLoading ? h.span([], ["Loading..."]) : null,
        ]
    )

const log_level_from_value = (value: string): LogLevel | undefined => {
    switch (value) {
        case "debug":
        case "info":
        case "warning":
        case "error":
            return value
        default:
            return undefined
    }
}

const logLevelClass = (level: import("./app.model.ts").LogLevel): string => {
    switch (level) {
        case "error":
            return error_badge_class
        case "warning":
            return warning_badge_class
        case "info":
            return info_badge_class
        case "debug":
            return neutral_badge_class
        default:
            return ""
    }
}

const logTable = (model: Model, h: HtmlBuilder<Message>) =>
    h.table(
        [h.Class("w-full border-collapse text-sm")],
        [
            h.thead(
                [],
                [
                    h.tr(
                        [],
                        [
                            h.th(
                                [
                                    h.Class(
                                        "p-2 text-left border-b-2 border-border font-bold"
                                    ),
                                ],
                                ["Time"]
                            ),
                            h.th(
                                [
                                    h.Class(
                                        "p-2 text-left border-b-2 border-border font-bold"
                                    ),
                                ],
                                ["Level"]
                            ),
                            h.th(
                                [
                                    h.Class(
                                        "p-2 text-left border-b-2 border-border font-bold"
                                    ),
                                ],
                                ["Source"]
                            ),
                            h.th(
                                [
                                    h.Class(
                                        "p-2 text-left border-b-2 border-border font-bold"
                                    ),
                                ],
                                ["Message"]
                            ),
                            h.th(
                                [
                                    h.Class(
                                        "p-2 text-left border-b-2 border-border font-bold"
                                    ),
                                ],
                                ["Trace"]
                            ),
                            h.th(
                                [
                                    h.Class(
                                        "p-2 text-left border-b-2 border-border font-bold"
                                    ),
                                ],
                                ["User"]
                            ),
                            h.th(
                                [
                                    h.Class(
                                        "p-2 text-left border-b-2 border-border font-bold"
                                    ),
                                ],
                                ["Session"]
                            ),
                        ]
                    ),
                ]
            ),
            h.tbody(
                [],
                model.logs.map((log) =>
                    h.tr(
                        [
                            h.Class(
                                "border-b-(length:--surface-border-width) border-border"
                            ),
                        ],
                        [
                            h.td(
                                [
                                    h.Class(
                                        "p-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-48"
                                    ),
                                ],
                                [formatDate(log.created_at)]
                            ),
                            h.td(
                                [h.Class("p-2 whitespace-nowrap")],
                                [
                                    badge_view(
                                        log.level,
                                        logLevelClass(log.level),
                                        h
                                    ),
                                ]
                            ),
                            h.td(
                                [
                                    h.Class(
                                        "p-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-48"
                                    ),
                                ],
                                [log.source ?? "-"]
                            ),
                            h.td(
                                [
                                    h.Class(
                                        "p-2 overflow-hidden text-ellipsis max-w-lg"
                                    ),
                                ],
                                [log.message]
                            ),
                            h.td(
                                [
                                    h.Class(
                                        "p-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-48"
                                    ),
                                ],
                                [log.trace_id ?? "-"]
                            ),
                            h.td(
                                [
                                    h.Class(
                                        "p-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-48"
                                    ),
                                ],
                                [log.user_id ?? "-"]
                            ),
                            h.td(
                                [
                                    h.Class(
                                        "p-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-48"
                                    ),
                                ],
                                [log.session_id ?? "-"]
                            ),
                        ]
                    )
                )
            ),
        ]
    )

type SpanItem = import("./app.model.ts").SpanItem

type TraceGroup = Readonly<{
    trace_id: string
    spans: ReadonlyArray<SpanItem>
}>

type SpanNode = Readonly<{
    span: SpanItem
    depth: number
}>

const groupSpansByTrace = (
    spans: ReadonlyArray<SpanItem>
): ReadonlyArray<TraceGroup> => {
    const groups = new Map<string, Array<SpanItem>>()

    for (const span of spans) {
        const existing = groups.get(span.trace_id)
        if (existing !== undefined) {
            existing.push(span)
        } else {
            groups.set(span.trace_id, [span])
        }
    }

    return [...groups.entries()].map(([trace_id, traceSpans]) => ({
        trace_id,
        spans: traceSpans,
    }))
}

const byStartTime = (a: SpanItem, b: SpanItem): number =>
    a.started_at.getTime() - b.started_at.getTime()

const spanTree = (spans: ReadonlyArray<SpanItem>): ReadonlyArray<SpanNode> => {
    const ids = new Set(spans.map((span) => span.span_id))
    const children = new Map<string, Array<SpanItem>>()
    const roots: Array<SpanItem> = []

    for (const span of spans) {
        if (span.parent_span_id !== undefined && ids.has(span.parent_span_id)) {
            const existing = children.get(span.parent_span_id)
            if (existing !== undefined) {
                existing.push(span)
            } else {
                children.set(span.parent_span_id, [span])
            }
        } else {
            roots.push(span)
        }
    }

    const nodes: Array<SpanNode> = []

    const visit = (span: SpanItem, depth: number): void => {
        nodes.push({ span, depth })
        for (const child of (children.get(span.span_id) ?? []).sort(
            byStartTime
        )) {
            visit(child, depth + 1)
        }
    }

    for (const root of roots.sort(byStartTime)) {
        visit(root, 0)
    }

    return nodes
}

const formatDuration = (durationMs: number | undefined): string => {
    if (durationMs === undefined) {
        return "-"
    }
    if (durationMs >= 1000) {
        return `${(durationMs / 1000).toFixed(2)} s`
    }
    return `${durationMs.toFixed(1)} ms`
}

const spanStatusClass = (
    status: import("./app.model.ts").SpanStatus
): string => {
    switch (status) {
        case "error":
            return error_badge_class
        case "ok":
            return success_badge_class
        case "started":
            return info_badge_class
        default:
            return ""
    }
}

const SPAN_DEPTH_CLASSES: ReadonlyArray<string> = [
    "",
    "pl-4",
    "pl-8",
    "pl-12",
    "pl-16",
    "pl-20",
]

const spanDepthClass = (depth: number): string =>
    SPAN_DEPTH_CLASSES[Math.min(depth, SPAN_DEPTH_CLASSES.length - 1)] ?? ""

const tracingView = (model: Model, h: HtmlBuilder<Message>) =>
    h.div(
        [],
        [
            h.h1([h.Class("text-2xl font-bold mb-4")], ["Tracing"]),
            traceFilterBar(model, h),
            model.error !== null
                ? authorizationErrorView(model.error, h)
                : null,
            model.spans.length === 0 && !model.isLoading
                ? h.p([], ["No spans recorded."])
                : h.div(
                      [h.Class("space-y-6")],
                      groupSpansByTrace(model.spans).map((item) =>
                          traceGroupView(item, h)
                      )
                  ),
        ]
    )

const traceFilterBar = (model: Model, h: HtmlBuilder<Message>) =>
    h.div(
        [h.Class("flex gap-2 mb-4 items-center")],
        [
            h.input([
                h.Class(
                    "p-1 border-(length:--field-border-width) border-border rounded-[var(--radius-control)]"
                ),
                h.Placeholder("Filter by trace id..."),
                h.OnInput((value: string) =>
                    UpdatedTraceFilterTraceId({ value })
                ),
            ]),
            h.button(
                [
                    h.Class(
                        "px-3 py-1.5 rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border text-sm cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                    ),
                    h.OnClick(ClickedRefresh()),
                ],
                ["Refresh"]
            ),
            h.button(
                [
                    h.Class(
                        "px-3 py-1.5 rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border text-sm cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                    ),
                    h.OnClick(ClearedTraceFilter()),
                ],
                ["Clear"]
            ),
            model.isLoading ? h.span([], ["Loading..."]) : null,
            h.span(
                [h.Class("text-muted-foreground text-sm")],
                [`${model.spansTotal} spans`]
            ),
        ]
    )

const traceGroupView = (group: TraceGroup, h: HtmlBuilder<Message>) => {
    const nodes = spanTree(group.spans)
    const root = nodes[0]

    return h.div(
        [
            h.Class(
                "border-(length:--surface-border-width) border-border overflow-hidden rounded-[var(--radius-surface)] bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "flex gap-3 items-baseline p-2 border-b-(length:--surface-border-width) border-border bg-muted/50"
                    ),
                ],
                [
                    h.span(
                        [h.Class("font-mono text-xs text-muted-foreground")],
                        [group.trace_id]
                    ),
                    h.span(
                        [h.Class("text-sm font-semibold")],
                        [root !== undefined ? root.span.name : "-"]
                    ),
                    h.span(
                        [h.Class("text-muted-foreground text-xs")],
                        [
                            `${group.spans.length} span${group.spans.length === 1 ? "" : "s"}`,
                        ]
                    ),
                ]
            ),
            tableShell(spanTable(nodes, h), h),
        ]
    )
}

const spanTable = (nodes: ReadonlyArray<SpanNode>, h: HtmlBuilder<Message>) =>
    h.table(
        [h.Class("w-full border-collapse text-sm")],
        [
            h.thead(
                [],
                [
                    h.tr(
                        [],
                        [
                            h.th(
                                [
                                    h.Class(
                                        "p-2 text-left border-b-(length:--surface-border-width) border-border font-bold"
                                    ),
                                ],
                                ["Name"]
                            ),
                            h.th(
                                [
                                    h.Class(
                                        "p-2 text-left border-b-(length:--surface-border-width) border-border font-bold"
                                    ),
                                ],
                                ["Kind"]
                            ),
                            h.th(
                                [
                                    h.Class(
                                        "p-2 text-left border-b-(length:--surface-border-width) border-border font-bold"
                                    ),
                                ],
                                ["Status"]
                            ),
                            h.th(
                                [
                                    h.Class(
                                        "p-2 text-left border-b-(length:--surface-border-width) border-border font-bold"
                                    ),
                                ],
                                ["Started"]
                            ),
                            h.th(
                                [
                                    h.Class(
                                        "p-2 text-left border-b-(length:--surface-border-width) border-border font-bold"
                                    ),
                                ],
                                ["Duration"]
                            ),
                        ]
                    ),
                ]
            ),
            h.tbody(
                [],
                nodes.map((node) =>
                    h.tr(
                        [
                            h.Class(
                                "border-b-(length:--surface-border-width) border-border"
                            ),
                        ],
                        [
                            h.td(
                                [
                                    h.Class(
                                        "p-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-96 " +
                                            spanDepthClass(node.depth)
                                    ),
                                ],
                                [node.span.name]
                            ),
                            h.td(
                                [h.Class("p-2 whitespace-nowrap")],
                                [node.span.kind]
                            ),
                            h.td(
                                [h.Class("p-2 whitespace-nowrap")],
                                [
                                    badge_view(
                                        node.span.status,
                                        spanStatusClass(node.span.status),
                                        h
                                    ),
                                ]
                            ),
                            h.td(
                                [h.Class("p-2 whitespace-nowrap")],
                                [formatDate(node.span.started_at)]
                            ),
                            h.td(
                                [h.Class("p-2 whitespace-nowrap")],
                                [formatDuration(node.span.duration_ms)]
                            ),
                        ]
                    )
                )
            ),
        ]
    )

const placeholderView = (
    title: string,
    description: string,
    h: HtmlBuilder<Message>
) =>
    h.div(
        [],
        [
            h.h1([h.Class("text-2xl font-bold mb-4")], [title]),
            h.p([h.Class("text-muted-foreground")], [description]),
        ]
    )

const refreshBar = (model: Model, h: HtmlBuilder<Message>) =>
    h.div(
        [h.Class("flex gap-2 mb-4 items-center")],
        [
            h.button(
                [
                    h.Class(
                        "px-3 py-1.5 rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border text-sm cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                    ),
                    h.OnClick(ClickedRefresh()),
                ],
                ["Refresh"]
            ),
            model.isLoading ? h.span([], ["Loading..."]) : null,
        ]
    )

const headerCell = (label: string, h: HtmlBuilder<Message>) =>
    h.th([h.Class("p-2 text-left border-b-2 border-border font-bold")], [label])

const logCause = (log: import("./app.model.ts").LogItem): string | null => {
    const cause = log.metadata?.cause
    return typeof cause === "string" ? cause : null
}

const errorsView = (model: Model, h: HtmlBuilder<Message>) =>
    h.div(
        [],
        [
            h.h1([h.Class("text-2xl font-bold mb-4")], ["Errors"]),
            refreshBar(model, h),
            model.error !== null
                ? authorizationErrorView(model.error, h)
                : null,
            model.errors.length === 0 && !model.isLoading
                ? h.p([], ["No errors found."])
                : tableShell(errorsTable(model, h), h),
        ]
    )

const errorsTable = (model: Model, h: HtmlBuilder<Message>) =>
    h.table(
        [h.Class("w-full border-collapse text-sm")],
        [
            h.thead(
                [],
                [
                    h.tr(
                        [],
                        [
                            headerCell("Time", h),
                            headerCell("Message", h),
                            headerCell("Source", h),
                            headerCell("Trace", h),
                        ]
                    ),
                ]
            ),
            h.tbody(
                [],
                model.errors.flatMap((log) => {
                    const cause = logCause(log)
                    const row = h.tr(
                        [
                            h.Class(
                                cause === null
                                    ? "border-b-(length:--surface-border-width) border-border"
                                    : ""
                            ),
                        ],
                        [
                            h.td(
                                [
                                    h.Class(
                                        "p-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-48"
                                    ),
                                ],
                                [formatDate(log.created_at)]
                            ),
                            h.td(
                                [
                                    h.Class(
                                        "p-2 overflow-hidden text-ellipsis max-w-lg text-destructive"
                                    ),
                                ],
                                [log.message]
                            ),
                            h.td(
                                [
                                    h.Class(
                                        "p-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-48"
                                    ),
                                ],
                                [log.source ?? "-"]
                            ),
                            h.td(
                                [
                                    h.Class(
                                        "p-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-48"
                                    ),
                                ],
                                [log.trace_id ?? "-"]
                            ),
                        ]
                    )

                    if (cause === null) {
                        return [row]
                    }

                    return [
                        row,
                        h.tr(
                            [
                                h.Class(
                                    "border-b-(length:--surface-border-width) border-border"
                                ),
                            ],
                            [
                                h.td(
                                    [h.Class("p-2 pt-0"), h.Colspan(4)],
                                    [
                                        h.pre(
                                            [
                                                h.Class(
                                                    "overflow-x-auto whitespace-pre-wrap break-words rounded bg-muted p-2 text-xs text-muted-foreground"
                                                ),
                                            ],
                                            [cause]
                                        ),
                                    ]
                                ),
                            ]
                        ),
                    ]
                })
            ),
        ]
    )

const metricsView = (model: Model, h: HtmlBuilder<Message>) =>
    h.div(
        [],
        [
            h.h1([h.Class("text-2xl font-bold mb-4")], ["Metrics"]),
            refreshBar(model, h),
            model.error !== null
                ? authorizationErrorView(model.error, h)
                : null,
            model.metrics.length === 0 && !model.isLoading
                ? h.p([], ["No metrics recorded yet."])
                : tableShell(metricsTable(model, h), h),
        ]
    )

const formatMetricAttributes = (
    attributes: Readonly<Record<string, string>> | undefined
): string => {
    if (attributes === undefined) {
        return "-"
    }
    const entries = Object.entries(attributes)
    return entries.length === 0
        ? "-"
        : entries.map(([key, value]) => `${key}=${value}`).join(", ")
}

const formatMetricState = (
    state: Readonly<Record<string, unknown>>
): string => {
    try {
        return JSON.stringify(state)
    } catch {
        return String(state)
    }
}

const metricsTable = (model: Model, h: HtmlBuilder<Message>) =>
    h.table(
        [h.Class("w-full border-collapse text-sm")],
        [
            h.thead(
                [],
                [
                    h.tr(
                        [],
                        [
                            headerCell("Name", h),
                            headerCell("Type", h),
                            headerCell("Attributes", h),
                            headerCell("State", h),
                        ]
                    ),
                ]
            ),
            h.tbody(
                [],
                model.metrics.map((metric) =>
                    h.keyed("tr")(
                        metric.id,
                        [
                            h.Class(
                                "border-b-(length:--surface-border-width) border-border"
                            ),
                        ],
                        [
                            h.td(
                                [
                                    h.Class(
                                        "p-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-64 font-mono"
                                    ),
                                ],
                                [metric.id]
                            ),
                            h.td(
                                [h.Class("p-2 whitespace-nowrap")],
                                [metric.type]
                            ),
                            h.td(
                                [
                                    h.Class(
                                        "p-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-48"
                                    ),
                                ],
                                [formatMetricAttributes(metric.attributes)]
                            ),
                            h.td(
                                [
                                    h.Class(
                                        "p-2 overflow-hidden text-ellipsis max-w-lg font-mono"
                                    ),
                                ],
                                [formatMetricState(metric.state)]
                            ),
                        ]
                    )
                )
            ),
        ]
    )

const formatBytes = (bytes: number): string => {
    if (bytes < 1024) {
        return `${bytes} B`
    }
    const units = ["KiB", "MiB", "GiB", "TiB"]
    let value = bytes
    let unit = "B"
    for (const next of units) {
        if (value < 1024) {
            break
        }
        value = value / 1024
        unit = next
    }
    return `${value.toFixed(1)} ${unit}`
}

const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    return days > 0
        ? `${days}d ${hours}h ${minutes}m`
        : hours > 0
          ? `${hours}h ${minutes}m ${secs}s`
          : `${minutes}m ${secs}s`
}

const systemStat = (label: string, value: string, h: HtmlBuilder<Message>) =>
    h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border p-3 bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.p(
                [
                    h.Class(
                        "text-xs uppercase tracking-wide text-muted-foreground"
                    ),
                ],
                [label]
            ),
            h.p([h.Class("mt-1 font-mono text-sm")], [value]),
        ]
    )

const systemView = (model: Model, h: HtmlBuilder<Message>) =>
    h.div(
        [],
        [
            h.h1([h.Class("text-2xl font-bold mb-4")], ["System"]),
            refreshBar(model, h),
            model.error !== null
                ? authorizationErrorView(model.error, h)
                : null,
            model.system === null
                ? model.isLoading || model.error !== null
                    ? null
                    : h.p([], ["No snapshot available."])
                : systemGrid(model.system, h),
        ]
    )

const systemGrid = (
    system: NonNullable<Model["system"]>,
    h: HtmlBuilder<Message>
) =>
    h.div(
        [h.Class("grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4")],
        [
            systemStat(
                "Process",
                `pid ${system.pid} · node ${system.node_version}`,
                h
            ),
            systemStat("Uptime", formatUptime(system.uptime_seconds), h),
            systemStat("RSS", formatBytes(system.rss_bytes), h),
            systemStat(
                "Heap",
                `${formatBytes(system.heap_used_bytes)} / ${formatBytes(system.heap_total_bytes)}`,
                h
            ),
            systemStat("External", formatBytes(system.external_bytes), h),
            systemStat(
                "CPU time",
                `user ${(system.cpu_user_micros / 1_000_000).toFixed(1)}s · sys ${(system.cpu_system_micros / 1_000_000).toFixed(1)}s`,
                h
            ),
            systemStat(
                "Load average",
                `${system.loadavg_1m.toFixed(2)} / ${system.loadavg_5m.toFixed(2)} / ${system.loadavg_15m.toFixed(2)}`,
                h
            ),
            systemStat(
                "Host memory",
                `${formatBytes(system.total_memory_bytes - system.free_memory_bytes)} / ${formatBytes(system.total_memory_bytes)}`,
                h
            ),
            systemStat("CPUs", String(system.cpu_count), h),
            systemStat("Platform", `${system.platform} ${system.arch}`, h),
        ]
    )

const sessionStatusClass = (
    status: import("./app.model.ts").SessionStatus
): string => {
    switch (status) {
        case "active":
            return success_badge_class
        case "expired":
            return warning_badge_class
        case "revoked":
            return error_badge_class
        default:
            return neutral_badge_class
    }
}

const sessionUserLabel = (
    session: import("./app.model.ts").SessionItem
): string => session.user_name ?? session.user_email ?? session.user_id

const sessionFilterBar = (model: Model, h: HtmlBuilder<Message>) =>
    h.div(
        [h.Class("flex gap-2 mb-4 items-center")],
        [
            h.select(
                [
                    h.Class(
                        "p-1 border-(length:--field-border-width) border-border rounded-[var(--radius-control)]"
                    ),
                    h.Value(model.sessionFilter.status ?? ""),
                    h.OnInput((value: string) =>
                        UpdatedSessionFilterStatus({
                            value: session_status_from_value(value),
                        })
                    ),
                ],
                [
                    h.option([h.Value("")], ["All statuses"]),
                    h.option([h.Value("active")], ["active"]),
                    h.option([h.Value("expired")], ["expired"]),
                    h.option([h.Value("revoked")], ["revoked"]),
                    h.option([h.Value("unknown")], ["unknown"]),
                ]
            ),
            h.button(
                [
                    h.Class(
                        "px-3 py-1.5 rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border text-sm cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                    ),
                    h.OnClick(ClickedRefresh()),
                    ...(AsyncData.isPending(model.sessions)
                        ? [h.Disabled(true)]
                        : []),
                ],
                ["Refresh"]
            ),
            AsyncData.isPending(model.sessions)
                ? h.span(
                      [h.Role("status")],
                      [
                          AsyncData.isRefreshing(model.sessions)
                              ? "Refreshing…"
                              : "Loading sessions…",
                      ]
                  )
                : null,
        ]
    )

const session_status_from_value = (
    value: string
): SessionStatus | undefined => {
    switch (value) {
        case "active":
        case "expired":
        case "revoked":
        case "unknown":
            return value
        default:
            return undefined
    }
}

const sessionsView = (model: Model, h: HtmlBuilder<Message>) => {
    const sessions = AsyncData.getOrElse(model.sessions, () => []).filter(
        (session) =>
            model.sessionFilter.status === undefined ||
            session.status === model.sessionFilter.status
    )
    return h.div(
        [],
        [
            h.h1([h.Class("text-2xl font-bold mb-4")], ["Sessions"]),
            h.p(
                [h.Class("mb-4 text-sm text-muted-foreground")],
                [
                    model.sessions_scope_name === ""
                        ? "Sign-in sessions for active tenant members."
                        : `Scope: ${model.sessions_scope_name}.`,
                    model.sessions_has_more
                        ? " Showing a recent sample; additional sessions are available."
                        : "",
                    " Status reflects the PostgreSQL account session. Last seen records app activity.",
                ]
            ),
            ...(model.sessions_can_view_all
                ? [
                      h.label(
                          [h.Class("mb-4 flex items-center gap-2")],
                          [
                              h.input([
                                  h.Type("checkbox"),
                                  ...(model.sessions_all_tenants
                                      ? [h.Checked(true)]
                                      : []),
                                  h.OnClick(
                                      UpdatedSessionScope({
                                          all_tenants:
                                              !model.sessions_all_tenants,
                                      })
                                  ),
                              ]),
                              "All tenants (platform sysadmin)",
                          ]
                      ),
                  ]
                : []),
            sessionFilterBar(model, h),
            Option.match(AsyncData.getError(model.sessions), {
                onNone: () => null,
                onSome: (error) =>
                    h.p(
                        [
                            h.Role("alert"),
                            h.Class("mb-4 text-sm text-destructive"),
                        ],
                        [error]
                    ),
            }),
            sessions.length > 0
                ? sessions_chart_view(
                      sessions,
                      model.sessions_has_more,
                      model.session_as_of
                  )
                : null,
            sessions.length === 0 &&
            !model.isLoading &&
            Option.isNone(AsyncData.getError(model.sessions))
                ? h.p([], ["No sessions found."])
                : tableShell(sessionsTable(sessions, h), h),
        ]
    )
}

const sessionsTable = (
    sessions: ReadonlyArray<SessionItem>,
    h: HtmlBuilder<Message>
) =>
    h.table(
        [h.Class("w-full border-collapse text-sm")],
        [
            h.thead(
                [],
                [
                    h.tr(
                        [],
                        [
                            headerCell("User", h),
                            headerCell("Status", h),
                            headerCell("Created", h),
                            headerCell("Last Seen", h),
                            headerCell("Last Verified", h),
                            headerCell("Expires", h),
                        ]
                    ),
                ]
            ),
            h.tbody(
                [],
                sessions.map((session) =>
                    h.tr(
                        [
                            h.Class(
                                "border-b-(length:--surface-border-width) border-border"
                            ),
                        ],
                        [
                            h.td(
                                [
                                    h.Class(
                                        "p-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-48"
                                    ),
                                ],
                                [sessionUserLabel(session)]
                            ),
                            h.td(
                                [h.Class("p-2 whitespace-nowrap")],
                                [
                                    badge_view(
                                        session.status,
                                        sessionStatusClass(session.status),
                                        h
                                    ),
                                ]
                            ),
                            h.td(
                                [h.Class("p-2 whitespace-nowrap")],
                                [formatDate(session.created_at)]
                            ),
                            h.td(
                                [h.Class("p-2 whitespace-nowrap")],
                                [
                                    session.last_seen_at !== undefined
                                        ? formatDate(session.last_seen_at)
                                        : "-",
                                ]
                            ),
                            h.td(
                                [h.Class("p-2 whitespace-nowrap")],
                                [
                                    session.verified_at === undefined
                                        ? "Never"
                                        : formatDate(session.verified_at),
                                ]
                            ),
                            h.td(
                                [h.Class("p-2 whitespace-nowrap")],
                                [
                                    session.expires_at === undefined
                                        ? "Unknown"
                                        : formatDate(session.expires_at),
                                ]
                            ),
                        ]
                    )
                )
            ),
        ]
    )

const formatDate = (date: Date): string => date.toLocaleString()
