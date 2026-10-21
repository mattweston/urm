import { type Html, type HtmlBuilder } from "foldkit/html"

type Stat = Readonly<{
    title: string
    value: string
    delta: string
}>

type Sale = Readonly<{
    initials: string
    name: string
    email: string
    amount: string
}>

const stats: ReadonlyArray<Stat> = [
    {
        title: "Total Revenue",
        value: "$45,231.89",
        delta: "+20.1% from last month",
    },
    {
        title: "Subscriptions",
        value: "+2350",
        delta: "+180.1% from last month",
    },
    {
        title: "Sales",
        value: "+12,234",
        delta: "+19% from last month",
    },
    {
        title: "Active Now",
        value: "+573",
        delta: "+201 since last hour",
    },
]

const recent_sales: ReadonlyArray<Sale> = [
    {
        initials: "OM",
        name: "Olivia Martin",
        email: "olivia.martin@example.com",
        amount: "+$1,999.00",
    },
    {
        initials: "JL",
        name: "Jackson Lee",
        email: "jackson.lee@example.com",
        amount: "+$39.00",
    },
    {
        initials: "IN",
        name: "Isabella Nguyen",
        email: "isabella.nguyen@example.com",
        amount: "+$299.00",
    },
    {
        initials: "WK",
        name: "William Kim",
        email: "william.kim@example.com",
        amount: "+$99.00",
    },
    {
        initials: "SD",
        name: "Sofia Davis",
        email: "sofia.davis@example.com",
        amount: "+$39.00",
    },
]

const monthly_sales: ReadonlyArray<number> = [
    1200, 2300, 1800, 3000, 4200, 3900, 2500, 4700, 3600, 5100, 4600, 5800,
]

const months: ReadonlyArray<string> = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
]

const statIcon = <Message>(index: number, h: HtmlBuilder<Message>): Html =>
    h.div(
        [
            h.Class(
                index === 0
                    ? "size-8 rounded-full bg-warning/15"
                    : index === 1
                      ? "size-8 rounded-full bg-sky-500/15"
                      : index === 2
                        ? "size-8 rounded-full bg-violet-500/15"
                        : "size-8 rounded-full bg-success/15"
            ),
        ],
        []
    )

const statsGrid = <Message>(h: HtmlBuilder<Message>): Html =>
    h.div(
        [h.Class("grid gap-4 md:grid-cols-2 xl:grid-cols-4")],
        stats.map((stat, index) =>
            h.section(
                [
                    h.Class(
                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
                    ),
                ],
                [
                    h.div(
                        [
                            h.Class(
                                "flex flex-row items-center justify-between space-y-0 p-6 pb-2"
                            ),
                        ],
                        [
                            h.h3(
                                [h.Class("text-sm font-medium")],
                                [stat.title]
                            ),
                            statIcon(index, h),
                        ]
                    ),
                    h.div(
                        [h.Class("p-6 pt-0")],
                        [
                            h.div(
                                [h.Class("text-2xl font-bold")],
                                [stat.value]
                            ),
                            h.p(
                                [h.Class("text-xs text-muted-foreground")],
                                [stat.delta]
                            ),
                        ]
                    ),
                ]
            )
        )
    )

const overviewView = <Message>(h: HtmlBuilder<Message>): Html => {
    const max = Math.max(...monthly_sales)

    return h.div(
        [h.Class("flex h-[350px] w-full items-end gap-2 overflow-hidden")],
        monthly_sales.map((value, index) =>
            h.div(
                [
                    h.Class(
                        "flex h-full flex-1 flex-col items-center justify-end gap-2"
                    ),
                ],
                [
                    h.div(
                        [h.Class("flex h-full w-full items-end")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "w-full rounded-t-md bg-primary/70 transition-colors hover:bg-primary"
                                    ),
                                    h.Style({
                                        height: `${(value / max) * 100}%`,
                                    }),
                                ],
                                []
                            ),
                        ]
                    ),
                    h.span(
                        [h.Class("text-[11px] text-muted-foreground")],
                        [months[index] ?? ""]
                    ),
                ]
            )
        )
    )
}

const recentSalesView = <Message>(h: HtmlBuilder<Message>): Html =>
    h.div(
        [h.Class("space-y-8")],
        recent_sales.map((sale) =>
            h.div(
                [h.Class("flex items-center")],
                [
                    h.div(
                        [
                            h.Class(
                                "flex size-9 shrink-0 items-center justify-center rounded-full border-(length:--surface-border-width) border-border bg-muted text-xs font-medium"
                            ),
                        ],
                        [sale.initials]
                    ),
                    h.div(
                        [h.Class("ml-4 min-w-0 space-y-1")],
                        [
                            h.p(
                                [
                                    h.Class(
                                        "truncate text-sm font-medium leading-none"
                                    ),
                                ],
                                [sale.name]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "truncate text-sm text-muted-foreground"
                                    ),
                                ],
                                [sale.email]
                            ),
                        ]
                    ),
                    h.div([h.Class("ml-auto pl-3 font-medium")], [sale.amount]),
                ]
            )
        )
    )

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
    h.div(
        [
            h.Class(
                "grid gap-6 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4 text-foreground md:p-6"
            ),
        ],
        [
            h.div(
                [h.Class("flex flex-wrap items-center justify-between gap-4")],
                [
                    h.div(
                        [h.Class("space-y-1")],
                        [
                            h.h2(
                                [
                                    h.Class(
                                        "text-2xl font-semibold tracking-tight"
                                    ),
                                ],
                                ["Dashboard"]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                ["Analytics, sales, and activity at a glance."]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("flex items-center gap-2")],
                        [
                            h.a(
                                [
                                    h.Href("#dashboard-layout-demo"),
                                    h.Class(
                                        "inline-flex h-10 items-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-4 text-sm font-medium text-foreground [box-shadow:var(--shadow-control)]"
                                    ),
                                ],
                                ["Stats"]
                            ),
                            h.button(
                                [
                                    h.Type("button"),
                                    h.Class(
                                        "inline-flex h-10 items-center rounded-[var(--radius-control)] border-(length:--control-border-width) border-border bg-primary px-4 text-sm font-medium text-primary-foreground [box-shadow:var(--shadow-primary)]"
                                    ),
                                ],
                                ["Download"]
                            ),
                        ]
                    ),
                ]
            ),
            statsGrid(h),
            h.div(
                [h.Class("grid gap-4 lg:grid-cols-7")],
                [
                    h.section(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-surface)] lg:col-span-4"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("flex flex-col space-y-1.5 p-6")],
                                [
                                    h.h3(
                                        [
                                            h.Class(
                                                "text-lg font-semibold leading-none tracking-tight"
                                            ),
                                        ],
                                        ["Overview"]
                                    ),
                                ]
                            ),
                            h.div([h.Class("p-6 pt-0")], [overviewView(h)]),
                        ]
                    ),
                    h.section(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-surface)] lg:col-span-3"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("flex flex-col space-y-1.5 p-6")],
                                [
                                    h.h3(
                                        [
                                            h.Class(
                                                "text-lg font-semibold leading-none tracking-tight"
                                            ),
                                        ],
                                        ["Recent Sales"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "text-sm text-muted-foreground"
                                            ),
                                        ],
                                        ["You made 265 sales this month."]
                                    ),
                                ]
                            ),
                            h.div([h.Class("p-6 pt-0")], [recentSalesView(h)]),
                        ]
                    ),
                ]
            ),
        ]
    )
