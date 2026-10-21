import { type Html, inertHtml as h } from "foldkit/html"

type ChartKind = "area" | "bars" | "line" | "timeseries"

export type ChartDemo = Readonly<{
    title: string
    description: string
    kind: ChartKind
    values: ReadonlyArray<number>
    maximum?: number
    labels?: ReadonlyArray<string>
    format_value?: (value: number) => string
}>

const demos: ReadonlyArray<ChartDemo> = [
    {
        title: "Area",
        description: "A filled trend for cumulative or volume reporting.",
        kind: "area",
        values: [18, 30, 22, 38, 26, 44, 36],
    },
    {
        title: "Bars",
        description: "Discrete values suited to period or category comparison.",
        kind: "bars",
        values: [12, 20, 9, 18, 27, 22, 30],
    },
    {
        title: "Line",
        description: "A compact sequence for changes across a short range.",
        kind: "line",
        values: [5, 9, 7, 12, 10, 15, 13, 18],
    },
    {
        title: "Timeseries",
        description: "A longer trend ready for future historical URM data.",
        kind: "timeseries",
        values: [8, 10, 11, 14, 12, 16, 18, 21, 19, 23, 24, 28],
    },
]

const width = 360
const height = 180
const padding = 18
const inner_width = width - padding * 2
const inner_height = height - padding * 2

const y_for = (demo: ChartDemo, value: number): number => {
    const minimum = Math.min(0, ...demo.values)
    const maximum = Math.max(1, demo.maximum ?? 0, ...demo.values)
    return (
        height -
        padding -
        ((value - minimum) / (maximum - minimum)) * inner_height
    )
}

const point_for = (
    demo: ChartDemo,
    value: number,
    index: number
): readonly [number, number] => {
    const denominator = Math.max(1, demo.values.length - 1)

    return [padding + (index / denominator) * inner_width, y_for(demo, value)]
}

const line_path = (demo: ChartDemo): string =>
    demo.values
        .map((value, index) => {
            const [x, y] = point_for(demo, value, index)
            return `${index === 0 ? "M" : "L"}${x} ${y}`
        })
        .join(" ")

const area_path = (demo: ChartDemo): string => {
    const line = line_path(demo)
    return `${line} L${width - padding} ${y_for(demo, 0)} L${padding} ${y_for(demo, 0)} Z`
}

const grid = (): ReadonlyArray<Html> =>
    [0, 1, 2, 3, 4].map((index) => {
        const y = padding + (inner_height / 4) * index
        return h.line(
            [
                h.X1(`${padding}`),
                h.Y1(`${y}`),
                h.X2(`${width - padding}`),
                h.Y2(`${y}`),
                h.Stroke("currentColor"),
                h.Class("stroke-border/60"),
            ],
            []
        )
    })

const bars = (demo: ChartDemo): ReadonlyArray<Html> => {
    const slot_width = inner_width / Math.max(1, demo.values.length)
    const bar_width = Math.max(12, slot_width - 14)

    return demo.values.map((value, index) => {
        const bar_height = Math.abs(y_for(demo, value) - y_for(demo, 0))
        const x = padding + slot_width * index + (slot_width - bar_width) / 2
        const y = Math.min(y_for(demo, value), y_for(demo, 0))

        return h.rect(
            [
                h.X(`${x}`),
                h.Y(`${y}`),
                h.Width(`${bar_width}`),
                h.Height(`${bar_height}`),
                h.Rx("4"),
                h.Fill("var(--chart-1)"),
            ],
            []
        )
    })
}

const trend = (demo: ChartDemo): ReadonlyArray<Html> => {
    if (demo.kind === "bars") {
        return bars(demo)
    }

    const line = line_path(demo)
    const fill =
        demo.kind === "area"
            ? [
                  h.path([
                      h.D(area_path(demo)),
                      h.Fill("var(--chart-1)"),
                      h.Class("opacity-20"),
                  ]),
              ]
            : []

    return [
        ...fill,
        h.path([
            h.D(line),
            h.Fill("none"),
            h.Stroke("var(--chart-1)"),
            h.StrokeWidth(demo.kind === "timeseries" ? "2" : "3"),
            h.StrokeLinecap("round"),
            h.StrokeLinejoin("round"),
        ]),
    ]
}

export const chart_card = (demo: ChartDemo): Html =>
    h.section(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
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
                        [demo.title]
                    ),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [demo.description]
                    ),
                ]
            ),
            h.div(
                [h.Class("p-6 pt-0")],
                [
                    h.div(
                        [
                            h.Class(
                                "h-[280px] w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-3"
                            ),
                        ],
                        [
                            h.svg(
                                [
                                    h.Xmlns("http://www.w3.org/2000/svg"),
                                    h.ViewBox(`0 0 ${width} ${height}`),
                                    h.Class("h-full w-full"),
                                    h.Role("img"),
                                    h.AriaLabel(
                                        `${demo.title} chart with illustrative values`
                                    ),
                                ],
                                [
                                    ...grid(),
                                    ...trend(demo),
                                    h.line(
                                        [
                                            h.X1(`${padding}`),
                                            h.X2(`${width - padding}`),
                                            h.Y1(`${y_for(demo, 0)}`),
                                            h.Y2(`${y_for(demo, 0)}`),
                                            h.Stroke("currentColor"),
                                        ],
                                        []
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.p(
                        [h.Class("mt-3 text-xs text-muted-foreground")],
                        [
                            `Sample values: ${demo.values
                                .map(
                                    (value, index) =>
                                        `${demo.labels?.[index] ?? index + 1}: ${demo.format_value?.(value) ?? value}`
                                )
                                .join(" · ")}`,
                        ]
                    ),
                ]
            ),
        ]
    )

export const view = (): Html =>
    h.div(
        [h.Class("flex min-h-0 flex-col gap-6")],
        [
            h.div(
                [h.Class("flex flex-wrap items-start justify-between gap-4")],
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
                                ["Chart prototypes"]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "max-w-2xl text-sm text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Illustrative chart treatments retained for future URM historical reporting.",
                                ]
                            ),
                        ]
                    ),
                    h.span(
                        [
                            h.Class(
                                "rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                            ),
                        ],
                        ["Placeholder data"]
                    ),
                ]
            ),
            h.div(
                [h.Class("grid gap-6 lg:grid-cols-2")],
                demos.map(chart_card)
            ),
        ]
    )
