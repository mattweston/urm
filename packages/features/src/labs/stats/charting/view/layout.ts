import { Array, Match as M, Option } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import { Button } from "@foldkit/ui"
import type { Telemetry } from "../domain.ts"
import { ClickedRefresh, ClickedRetry, type Message } from "../message.ts"
import type { Model } from "../model.ts"
import { chartPanelView } from "./chart.ts"
import { sidebarView } from "./sidebar.ts"

export const headerView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const isRefreshing = model.telemetry._tag === "TelemetryRefreshing"
    const isLoading = model.telemetry._tag === "TelemetryLoading"

    return h.header(
        [
            h.Class(
                "flex flex-col gap-3 border-b-(length:--surface-border-width) border-border pb-4 md:flex-row md:items-end md:justify-between"
            ),
        ],
        [
            h.div(
                [],
                [
                    h.p(
                        [
                            h.Class(
                                "text-xs font-semibold uppercase tracking-wider text-success"
                            ),
                        ],
                        ["Live public telemetry"]
                    ),
                    h.h1(
                        [
                            h.Class(
                                "mt-1 text-2xl font-semibold tracking-tight text-foreground"
                            ),
                        ],
                        ["Foldkit Adoption Observatory"]
                    ),
                ]
            ),
            Button.view(
                {
                    onClick: toParentMessage(ClickedRefresh()),
                    isDisabled: isRefreshing || isLoading,
                    toView: (attributes) =>
                        h.button(
                            [
                                ...attributes.button,
                                h.Class(
                                    "inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                ),
                            ],
                            [isRefreshing ? "Refreshing" : "Refresh"]
                        ),
                },
                h
            ),
        ]
    )
}

export const telemetryStateView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    M.value(model.telemetry).pipe(
        M.tagsExhaustive({
            TelemetryNotAsked: () =>
                loadingView<ParentMessage>("TelemetryNotAsked", h),
            TelemetryLoading: () =>
                loadingView<ParentMessage>("TelemetryLoading", h),
            TelemetryRefreshing: ({ data }) =>
                dashboardShellView(
                    model,
                    data,
                    Option.some("Refreshing public data"),
                    toParentMessage,
                    h
                ),
            TelemetryFailure: ({ error, maybeData }) =>
                Option.match(maybeData, {
                    onNone: () => failureView(error, toParentMessage, h),
                    onSome: (data) =>
                        dashboardShellView(
                            model,
                            data,
                            Option.some(error),
                            toParentMessage,
                            h
                        ),
                }),
            TelemetryOk: ({ data, warning }) => {
                const maybeWarning =
                    warning.length > 0
                        ? Option.some(warning)
                        : Array.match(data.warnings, {
                              onEmpty: () => Option.none<string>(),
                              onNonEmpty: (warnings) =>
                                  Option.some(Array.join(warnings, ", ")),
                          })

                return dashboardShellView(
                    model,
                    data,
                    maybeWarning,
                    toParentMessage,
                    h
                )
            },
        })
    )

export const loadingView = <ParentMessage>(
    key: string,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.keyed("section")(
        key,
        [
            h.Class(
                "grid flex-1 place-items-center rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card px-6 py-16"
            ),
            h.AriaLabel("Loading telemetry"),
        ],
        [
            h.div(
                [h.Class("text-center")],
                [
                    h.div(
                        [
                            h.Class(
                                "mx-auto h-8 w-8 rounded-full border-2 border-border border-t-primary motion-safe:animate-spin"
                            ),
                            h.AriaLabel("Loading"),
                        ],
                        []
                    ),
                    h.p(
                        [h.Class("mt-4 text-sm font-medium text-foreground")],
                        ["Fetching public telemetry"]
                    ),
                ]
            ),
        ]
    )
}

export const failureView = <ParentMessage>(
    error: string,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.keyed("section")(
        "TelemetryFailure",
        [
            h.Class(
                "grid flex-1 place-items-center rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-destructive bg-destructive/10 px-6 py-16 text-center"
            ),
            h.AriaLabel("Telemetry failed"),
        ],
        [
            h.div(
                [h.Class("max-w-lg")],
                [
                    h.h2(
                        [h.Class("text-lg font-semibold text-destructive")],
                        ["Could not fetch telemetry"]
                    ),
                    h.p(
                        [h.Class("mt-2 text-sm text-destructive-foreground")],
                        [error]
                    ),
                    Button.view(
                        {
                            onClick: toParentMessage(ClickedRetry()),
                            toView: (attributes) =>
                                h.button(
                                    [
                                        ...attributes.button,
                                        h.Class(
                                            "mt-5 inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
                                        ),
                                    ],
                                    ["Retry"]
                                ),
                        },
                        h
                    ),
                ]
            ),
        ]
    )
}

export const dashboardShellView = <ParentMessage>(
    model: Model,
    telemetry: Telemetry,
    maybeBanner: Option.Option<string>,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.keyed("section")(
        "TelemetryDashboard",
        [
            h.Class(
                "grid flex-1 gap-5 md:grid-cols-[18rem_minmax(0,1fr)] lg:grid-cols-[20rem_minmax(0,1fr)]"
            ),
        ],
        [
            sidebarView(model, telemetry, maybeBanner, toParentMessage, h),
            chartPanelView(model, telemetry, toParentMessage, h),
        ]
    )
}
