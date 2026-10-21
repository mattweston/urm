import type { Html, HtmlBuilder } from "foldkit/html"
import { Submodel } from "foldkit"

import { chart_card, type Datum } from "../../charting/bar-chart.view.ts"
import type { Message } from "./stats.message.ts"
import type { Model, StatsDelivery } from "./stats.model.ts"

const day_ms = 24 * 60 * 60 * 1_000
const number_formatter = new Intl.NumberFormat()
const day_formatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
})

const statuses: ReadonlyArray<StatsDelivery["status"]> = [
    "pending",
    "accepted",
    "queued",
    "sent",
    "delivered",
    "bounced",
    "complained",
    "failed",
    "skipped",
]

const count_where = (
    deliveries: ReadonlyArray<StatsDelivery>,
    predicate: (delivery: StatsDelivery) => boolean
): number => deliveries.filter(predicate).length

const after = (deliveries: ReadonlyArray<StatsDelivery>, start: number) =>
    deliveries.filter(({ createdAt }) => createdAt >= start)

const accepted_count = (deliveries: ReadonlyArray<StatsDelivery>): number =>
    count_where(
        deliveries,
        ({ status }) =>
            status === "accepted" || status === "sent" || status === "delivered"
    )

const failure_count = (deliveries: ReadonlyArray<StatsDelivery>): number =>
    count_where(
        deliveries,
        ({ status }) =>
            status === "failed" ||
            status === "bounced" ||
            status === "complained"
    )

const provider_accepted_count = (
    deliveries: ReadonlyArray<StatsDelivery>
): number =>
    accepted_count(deliveries) +
    count_where(deliveries, ({ status }) => status === "queued")

const month_start = (now: number): number => {
    const date = new Date(now)

    return new Date(date.getFullYear(), date.getMonth(), 1).getTime()
}

const calendar_day_start = (now: number): number => {
    const date = new Date(now)

    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    ).getTime()
}

const datum = (label: string, value: number, color: string): Datum => ({
    label,
    value,
    color,
})

const metric_card = (
    label: string,
    value: string,
    description: string,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.p(
                [h.Class("text-xs font-medium text-muted-foreground")],
                [label]
            ),
            h.p([h.Class("mt-2 text-2xl font-semibold tabular-nums")], [value]),
            h.p(
                [h.Class("mt-1 text-xs leading-relaxed text-muted-foreground")],
                [description]
            ),
        ]
    )

const stats_content = (model: Model, h: HtmlBuilder<Message>): Html => {
    const last_30_days = after(model.deliveries, model.observedAt - 30 * day_ms)
    const last_7_days = after(model.deliveries, model.observedAt - 7 * day_ms)
    const this_month = after(model.deliveries, month_start(model.observedAt))
    const status_data = [
        datum("Accepted", accepted_count(last_30_days), "var(--chart-3)"),
        datum(
            "Queued",
            count_where(
                last_30_days,
                ({ status }) => status === "queued" || status === "pending"
            ),
            "var(--chart-1)"
        ),
        datum("Failed", failure_count(last_30_days), "var(--destructive)"),
        datum(
            "Skipped",
            count_where(last_30_days, ({ status }) => status === "skipped"),
            "var(--chart-5)"
        ),
    ]
    const purpose_data = [
        datum(
            "Transactional",
            count_where(
                last_30_days,
                ({ purpose, isTest }) => purpose === "transactional" && !isTest
            ),
            "var(--chart-1)"
        ),
        datum(
            "Template test",
            count_where(last_30_days, ({ isTest }) => isTest),
            "var(--chart-2)"
        ),
        datum(
            "Newsletter",
            count_where(
                last_30_days,
                ({ purpose }) => purpose === "newsletter"
            ),
            "var(--chart-4)"
        ),
    ]
    const today_start = calendar_day_start(model.observedAt)
    const daily_data = globalThis.Array.from({ length: 7 }, (_, index) => {
        const start = today_start - (6 - index) * day_ms
        const end = start + day_ms

        return datum(
            day_formatter.format(new Date(start)),
            count_where(
                model.deliveries,
                ({ createdAt }) => createdAt >= start && createdAt < end
            ),
            "var(--chart-1)"
        )
    })

    return h.div(
        [h.Class("grid gap-5")],
        [
            h.div(
                [h.Class("grid gap-3 sm:grid-cols-2 xl:grid-cols-4")],
                [
                    metric_card(
                        "Last 30 days",
                        number_formatter.format(last_30_days.length),
                        "All recorded send attempts.",
                        h
                    ),
                    metric_card(
                        "Sent or delivered",
                        number_formatter.format(accepted_count(last_30_days)),
                        "Accepted, sent, or delivered statuses over 30 days.",
                        h
                    ),
                    metric_card(
                        "Failed or bounced",
                        number_formatter.format(failure_count(last_30_days)),
                        "Includes complaints when lifecycle events are available.",
                        h
                    ),
                    metric_card(
                        "Accepted this month",
                        `${number_formatter.format(provider_accepted_count(this_month))} / 3,000`,
                        "Domain-only estimate; Cloudflare's included quota is account-wide.",
                        h
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "grid gap-5 md:grid-cols-[18rem_minmax(0,1fr)] lg:grid-cols-[20rem_minmax(0,1fr)]"
                    ),
                ],
                [
                    h.aside(
                        [h.Class("flex flex-col gap-4")],
                        [
                            h.section(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4"
                                    ),
                                ],
                                [
                                    h.h2(
                                        [h.Class("text-sm font-semibold")],
                                        ["Reporting window"]
                                    ),
                                    h.dl(
                                        [h.Class("mt-4 grid gap-3 text-sm")],
                                        [
                                            ["Last 7 days", last_7_days.length],
                                            [
                                                "Last 30 days",
                                                last_30_days.length,
                                            ],
                                            ["This month", this_month.length],
                                            [
                                                "Records inspected",
                                                model.deliveries.length,
                                            ],
                                        ].flatMap(([label, value]) => [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "flex items-center justify-between gap-3"
                                                    ),
                                                ],
                                                [
                                                    h.dt(
                                                        [
                                                            h.Class(
                                                                "text-muted-foreground"
                                                            ),
                                                        ],
                                                        [`${label}`]
                                                    ),
                                                    h.dd(
                                                        [
                                                            h.Class(
                                                                "font-medium tabular-nums"
                                                            ),
                                                        ],
                                                        [
                                                            number_formatter.format(
                                                                Number(value)
                                                            ),
                                                        ]
                                                    ),
                                                ]
                                            ),
                                        ])
                                    ),
                                ]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-control)] border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Provider acceptance is not confirmation that a message reached an inbox. Delivery, bounce, and complaint accuracy will improve when lifecycle events are connected.",
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("grid min-w-0 gap-5 lg:grid-cols-2")],
                        [
                            h.h2(
                                [h.Class("sr-only lg:col-span-2")],
                                ["Mail delivery charts"]
                            ),
                            chart_card(
                                "Attempts by day",
                                "Recorded send attempts over the last seven days.",
                                daily_data,
                                true
                            ),
                            chart_card(
                                "Provider status",
                                "Thirty-day operational outcomes, grouped for readability.",
                                status_data
                            ),
                            chart_card(
                                "Mail type",
                                "Transactional and newsletter attempts over 30 days.",
                                purpose_data
                            ),
                            h.section(
                                [
                                    h.Class(
                                        "overflow-auto rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card [box-shadow:var(--shadow-surface)]"
                                    ),
                                ],
                                [
                                    h.div(
                                        [h.Class("p-5 pb-3")],
                                        [
                                            h.h2(
                                                [h.Class("font-semibold")],
                                                ["Exact status counts"]
                                            ),
                                            h.p(
                                                [
                                                    h.Class(
                                                        "mt-1 text-sm text-muted-foreground"
                                                    ),
                                                ],
                                                [
                                                    "The latest status stored for each 30-day attempt.",
                                                ]
                                            ),
                                        ]
                                    ),
                                    h.table(
                                        [h.Class("w-full min-w-64 text-sm")],
                                        [
                                            h.caption(
                                                [h.Class("sr-only")],
                                                [
                                                    "Exact mail status counts for the last 30 days",
                                                ]
                                            ),
                                            h.thead(
                                                [],
                                                [
                                                    h.tr(
                                                        [
                                                            h.Class(
                                                                "border-y border-border bg-muted/40"
                                                            ),
                                                        ],
                                                        [
                                                            h.th(
                                                                [
                                                                    h.Scope(
                                                                        "col"
                                                                    ),
                                                                    h.Class(
                                                                        "px-5 py-2 text-left font-medium"
                                                                    ),
                                                                ],
                                                                ["Status"]
                                                            ),
                                                            h.th(
                                                                [
                                                                    h.Scope(
                                                                        "col"
                                                                    ),
                                                                    h.Class(
                                                                        "px-5 py-2 text-right font-medium"
                                                                    ),
                                                                ],
                                                                ["Count"]
                                                            ),
                                                        ]
                                                    ),
                                                ]
                                            ),
                                            h.tbody(
                                                [],
                                                statuses.map((status) =>
                                                    h.tr(
                                                        [
                                                            h.Class(
                                                                "border-b border-border last:border-0"
                                                            ),
                                                        ],
                                                        [
                                                            h.th(
                                                                [
                                                                    h.Scope(
                                                                        "row"
                                                                    ),
                                                                    h.Class(
                                                                        "px-5 py-2 text-left font-normal capitalize"
                                                                    ),
                                                                ],
                                                                [status]
                                                            ),
                                                            h.td(
                                                                [
                                                                    h.Class(
                                                                        "px-5 py-2 text-right font-medium tabular-nums"
                                                                    ),
                                                                ],
                                                                [
                                                                    number_formatter.format(
                                                                        count_where(
                                                                            last_30_days,
                                                                            (
                                                                                delivery
                                                                            ) =>
                                                                                delivery.status ===
                                                                                status
                                                                        )
                                                                    ),
                                                                ]
                                                            ),
                                                        ]
                                                    )
                                                )
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

const stats_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.div(
        [h.Class("mx-auto grid w-full max-w-7xl gap-5")],
        [
            h.header(
                [
                    h.Class(
                        "border-b-(length:--surface-border-width) border-border pb-4"
                    ),
                ],
                [
                    h.p(
                        [
                            h.Class(
                                "text-xs font-semibold uppercase tracking-wider text-success"
                            ),
                        ],
                        ["Mail operations"]
                    ),
                    h.h1(
                        [h.Class("mt-1 text-2xl font-semibold tracking-tight")],
                        ["Delivery stats"]
                    ),
                    h.p(
                        [
                            h.Class(
                                "mt-2 max-w-2xl text-sm text-muted-foreground"
                            ),
                        ],
                        [
                            "Transactional and newsletter activity recorded for this domain.",
                        ]
                    ),
                ]
            ),
            model.error !== null
                ? h.p(
                      [
                          h.Role("alert"),
                          h.Class(
                              "rounded-[var(--radius-control)] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                          ),
                      ],
                      [model.error]
                  )
                : model.loading
                  ? h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        ["Loading mail statistics…"]
                    )
                  : stats_content(model, h),
        ]
    )

export const view = Submodel.defineView<Model, Message>(stats_view)
