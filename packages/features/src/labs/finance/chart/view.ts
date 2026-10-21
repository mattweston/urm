import type { Html, HtmlBuilder } from "foldkit/html"
import { chart_card } from "../../charts/view.ts"
import { format_money, monthly_data, totals } from "./data.ts"

export const view = <Message>(h: HtmlBuilder<Message>): Html => {
    const maximum = Math.max(
        ...monthly_data.map((month) => Math.max(month.income, month.expenses))
    )
    const labels = monthly_data.map((month) => month.month)
    const charts = [
        { title: "Income", values: monthly_data.map((month) => month.income) },
        {
            title: "Expenses",
            values: monthly_data.map((month) => month.expenses),
        },
        {
            title: "Net result",
            values: monthly_data.map((month) => month.income - month.expenses),
        },
    ]
    return h.div(
        [
            h.Class(
                "mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8"
            ),
        ],
        [
            h.div(
                [h.Class("space-y-2")],
                [
                    h.h1(
                        [h.Class("text-2xl font-semibold tracking-tight")],
                        ["Finance chart demo"]
                    ),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        ["January–June 2026 · GBP · Fictional demo data"]
                    ),
                ]
            ),
            h.dl(
                [h.Class("grid gap-4 sm:grid-cols-3")],
                [
                    { label: "Total income", value: totals.income },
                    { label: "Total expenses", value: totals.expenses },
                    { label: "Net result", value: totals.net },
                ].map((metric) =>
                    h.div(
                        [h.Class("rounded-lg border bg-card p-5")],
                        [
                            h.dt(
                                [h.Class("text-sm text-muted-foreground")],
                                [metric.label]
                            ),
                            h.dd(
                                [
                                    h.Class(
                                        "mt-2 text-2xl font-semibold tabular-nums"
                                    ),
                                ],
                                [format_money(metric.value)]
                            ),
                        ]
                    )
                )
            ),
            h.section(
                [h.Class("space-y-4")],
                [
                    h.h2(
                        [h.Class("text-lg font-semibold")],
                        ["Monthly performance"]
                    ),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [
                            "Income and expenses use the same scale. Net result is income minus expenses; February shows a loss. The solid horizontal line marks zero.",
                        ]
                    ),
                    h.div(
                        [h.Class("grid gap-4 lg:grid-cols-3")],
                        charts.map((chart) =>
                            chart_card({
                                ...chart,
                                kind: "bars",
                                description:
                                    chart.title === "Net result"
                                        ? "Monthly surplus or loss."
                                        : "Monthly total, in GBP.",
                                maximum,
                                labels,
                                format_value: format_money,
                            })
                        )
                    ),
                ]
            ),
            h.div(
                [h.Class("overflow-x-auto rounded-lg border")],
                [
                    h.table(
                        [h.Class("w-full text-sm")],
                        [
                            h.caption(
                                [h.Class("p-4 text-left font-semibold")],
                                ["Monthly figures · demo data in GBP"]
                            ),
                            h.thead(
                                [],
                                [
                                    h.tr(
                                        [],
                                        [
                                            "Month",
                                            "Income",
                                            "Expenses",
                                            "Net result",
                                        ].map((label) =>
                                            h.th(
                                                [
                                                    h.Scope("col"),
                                                    h.Class(
                                                        "border-b p-3 text-left font-medium"
                                                    ),
                                                ],
                                                [label]
                                            )
                                        )
                                    ),
                                ]
                            ),
                            h.tbody(
                                [],
                                monthly_data.map((month) =>
                                    h.tr(
                                        [],
                                        [
                                            h.th(
                                                [
                                                    h.Scope("row"),
                                                    h.Class(
                                                        "border-b p-3 text-left font-medium"
                                                    ),
                                                ],
                                                [month.month]
                                            ),
                                            ...[
                                                month.income,
                                                month.expenses,
                                                month.income - month.expenses,
                                            ].map((value) =>
                                                h.td(
                                                    [
                                                        h.Class(
                                                            "border-b p-3 tabular-nums"
                                                        ),
                                                    ],
                                                    [format_money(value)]
                                                )
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
    )
}
