import clsx from "clsx"
import { Array, Option } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import {
    type Telemetry,
    chartModes,
    findPackageSnapshot,
    packageIdToSpec,
    packageIds,
    periodLabels,
    periods,
    totalCommits,
    totalDownloads,
} from "../domain.ts"
import {
    SelectedChartMode,
    SelectedPackage,
    SelectedPeriod,
    type Message,
} from "../message.ts"
import type { Model } from "../model.ts"
import { formatCompact, formatFetchedAt, formatInteger } from "./format.ts"
import { radioGroupView } from "../../../_shared/radio-group/controlled.ts"

export const sidebarView = <ParentMessage>(
    model: Model,
    telemetry: Telemetry,
    maybeBanner: Option.Option<string>,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.aside(
        [h.Class("flex flex-col gap-4")],
        [
            Option.match(maybeBanner, {
                onNone: () => h.empty,
                onSome: (banner) =>
                    h.keyed("div")(
                        "TelemetryBanner",
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-warning bg-warning/10 px-3 py-2 text-sm text-warning-foreground"
                            ),
                        ],
                        [banner]
                    ),
            }),
            summaryGridView(telemetry, h),
            controlPanelView(model, toParentMessage, h),
            packagePanelView(model, telemetry, toParentMessage, h),
            contributorsView(telemetry, h),
        ]
    )
}

export const summaryGridView = <ParentMessage>(
    telemetry: Telemetry,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const summaries = [
        {
            id: "stars",
            label: "Stars",
            value: formatCompact(telemetry.repository.stars),
        },
        {
            id: "downloads",
            label: "Downloads",
            value: formatCompact(totalDownloads(telemetry)),
        },
        {
            id: "contributors",
            label: "Contributors",
            value: formatInteger(telemetry.repository.visibleContributors),
        },
        {
            id: "commits",
            label: "Commits",
            value: formatInteger(totalCommits(telemetry)),
        },
    ]

    return h.div(
        [h.Class("grid grid-cols-2 gap-3")],
        Array.map(summaries, (summary) =>
            h.div(
                [
                    h.Key(summary.id),
                    h.Class(
                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-3"
                    ),
                ],
                [
                    h.div(
                        [h.Class("text-xs font-medium text-muted-foreground")],
                        [summary.label]
                    ),
                    h.div(
                        [
                            h.Class(
                                "mt-1 text-xl font-semibold text-card-foreground"
                            ),
                        ],
                        [summary.value]
                    ),
                ]
            )
        )
    )
}

const radioGroupClassName =
    "grid grid-cols-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-muted p-1"

const radioOptionClassName = (isSelected: boolean): string =>
    clsx(
        "flex min-h-9 cursor-pointer items-center justify-center rounded px-2 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isSelected
            ? "bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
            : "text-muted-foreground hover:text-foreground"
    )

export const controlPanelView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.section(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-3"
            ),
        ],
        [
            h.h2(
                [h.Class("text-sm font-semibold text-card-foreground")],
                ["View"]
            ),
            h.div(
                [h.Class("mt-3")],
                [
                    h.div(
                        [
                            h.Class(
                                "mb-1.5 text-xs font-medium text-muted-foreground"
                            ),
                        ],
                        ["Chart mode"]
                    ),
                    radioGroupView(
                        {
                            id: "chart-mode-radio-group",
                            selectedValue: Option.some(model.chartMode),
                            onSelect: (value) =>
                                toParentMessage(
                                    SelectedChartMode({ chartMode: value })
                                ),
                            options: chartModes,
                            ariaLabel: "Chart mode",
                            orientation: "Horizontal",
                            toView: ({ group, options }) =>
                                h.div(
                                    [...group, h.Class(radioGroupClassName)],
                                    Array.map(options, (option) =>
                                        h.div(
                                            [
                                                ...option.option,
                                                h.Key(option.value),
                                                h.Class(
                                                    radioOptionClassName(
                                                        option.isSelected
                                                    )
                                                ),
                                            ],
                                            [
                                                h.span(
                                                    [...option.label],
                                                    [option.value]
                                                ),
                                            ]
                                        )
                                    )
                                ),
                        },
                        h
                    ),
                ]
            ),
            model.chartMode !== "Ecosystem"
                ? h.keyed("div")(
                      "period-control",
                      [h.Class("mt-3")],
                      [
                          h.div(
                              [
                                  h.Class(
                                      "mb-1.5 text-xs font-medium text-muted-foreground"
                                  ),
                              ],
                              ["Period"]
                          ),
                          radioGroupView(
                              {
                                  id: "period-radio-group",
                                  selectedValue: Option.some(model.period),
                                  onSelect: (value) =>
                                      toParentMessage(
                                          SelectedPeriod({ period: value })
                                      ),
                                  options: periods,
                                  ariaLabel: "Period",
                                  orientation: "Horizontal",
                                  toView: ({ group, options }) =>
                                      h.div(
                                          [
                                              ...group,
                                              h.Class(radioGroupClassName),
                                          ],
                                          Array.map(options, (option) =>
                                              h.div(
                                                  [
                                                      ...option.option,
                                                      h.Key(option.value),
                                                      h.Class(
                                                          radioOptionClassName(
                                                              option.isSelected
                                                          )
                                                      ),
                                                  ],
                                                  [periodLabels[option.value]]
                                              )
                                          )
                                      ),
                              },
                              h
                          ),
                      ]
                  )
                : h.empty,
        ]
    )
}

export const packagePanelView = <ParentMessage>(
    model: Model,
    telemetry: Telemetry,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.section(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-3"
            ),
        ],
        [
            h.h2(
                [h.Class("text-sm font-semibold text-card-foreground")],
                ["Package"]
            ),
            h.div(
                [h.Class("mt-3")],
                [
                    radioGroupView(
                        {
                            id: "package-id-radio-group",
                            selectedValue: Option.some(model.selectedPackageId),
                            onSelect: (value) =>
                                toParentMessage(
                                    SelectedPackage({ packageId: value })
                                ),
                            options: packageIds,
                            ariaLabel: "Package",
                            orientation: "Vertical",
                            toView: ({ group, options }) =>
                                h.div(
                                    [...group, h.Class("grid gap-2")],
                                    Array.map(options, (option) => {
                                        const spec = packageIdToSpec(
                                            option.value
                                        )
                                        const maybeSnapshot =
                                            findPackageSnapshot(
                                                telemetry,
                                                option.value
                                            )

                                        return h.div(
                                            [
                                                ...option.option,
                                                h.Key(option.value),
                                                h.Class(
                                                    clsx(
                                                        "cursor-pointer min-h-14 rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border px-3 py-2 text-left [box-shadow:var(--shadow-control)]",
                                                        option.isSelected
                                                            ? "border-primary bg-primary/10 text-primary"
                                                            : "border-border bg-card text-card-foreground hover:bg-accent"
                                                    )
                                                ),
                                            ],
                                            [
                                                h.div(
                                                    [
                                                        h.Class(
                                                            "text-sm font-medium"
                                                        ),
                                                    ],
                                                    [spec.displayName]
                                                ),
                                                h.div(
                                                    [
                                                        h.Class(
                                                            "mt-0.5 text-xs text-muted-foreground"
                                                        ),
                                                    ],
                                                    [
                                                        Option.match(
                                                            maybeSnapshot,
                                                            {
                                                                onNone: () =>
                                                                    spec.role,
                                                                onSome: (
                                                                    snapshot
                                                                ) =>
                                                                    `${formatCompact(snapshot.lastWeekDownloads)} last week, v${snapshot.latestVersion}`,
                                                            }
                                                        ),
                                                    ]
                                                ),
                                            ]
                                        )
                                    })
                                ),
                        },
                        h
                    ),
                ]
            ),
        ]
    )
}

export const contributorsView = <ParentMessage>(
    telemetry: Telemetry,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.section(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-3"
            ),
        ],
        [
            h.div(
                [h.Class("flex items-center justify-between gap-3")],
                [
                    h.h2(
                        [h.Class("text-sm font-semibold text-card-foreground")],
                        ["Contributors"]
                    ),
                    h.span(
                        [h.Class("text-xs text-muted-foreground")],
                        [`Updated ${formatFetchedAt(telemetry.fetchedAt)}`]
                    ),
                ]
            ),
            h.ul(
                [h.Class("mt-3 grid gap-2")],
                Array.map(telemetry.topContributors, (contributor) =>
                    h.li(
                        [
                            h.Key(contributor.login),
                            h.Class(
                                "flex items-center justify-between gap-3 text-sm"
                            ),
                        ],
                        [
                            h.span(
                                [h.Class("font-medium text-card-foreground")],
                                [contributor.login]
                            ),
                            h.span(
                                [h.Class("text-muted-foreground")],
                                [
                                    `${formatInteger(contributor.contributions)} commits`,
                                ]
                            ),
                        ]
                    )
                )
            ),
        ]
    )
}
