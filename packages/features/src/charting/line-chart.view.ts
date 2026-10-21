import { type Html, inertHtml as h } from "foldkit/html"

export type Series = Readonly<{
    label: string
    color: string
    values: ReadonlyArray<number>
}>

const width = 720
const height = 220
const horizontal_padding = 24
const vertical_padding = 20
const inner_width = width - horizontal_padding * 2
const inner_height = height - vertical_padding * 2

const path_for = (values: ReadonlyArray<number>, maximum: number): string =>
    values
        .map((value, index) => {
            const denominator = Math.max(values.length - 1, 1)
            const x = horizontal_padding + (index / denominator) * inner_width
            const y =
                height -
                vertical_padding -
                (value / Math.max(maximum, 1)) * inner_height
            return `${index === 0 ? "M" : "L"}${x} ${y}`
        })
        .join(" ")

const grid = (): ReadonlyArray<Html> =>
    [0, 1, 2, 3, 4].map((index) => {
        const y = vertical_padding + (inner_height / 4) * index
        return h.line(
            [
                h.X1(`${horizontal_padding}`),
                h.Y1(`${y}`),
                h.X2(`${width - horizontal_padding}`),
                h.Y2(`${y}`),
                h.Stroke("currentColor"),
                h.Class("stroke-border/60"),
            ],
            []
        )
    })

export const line_chart_card = (
    title: string,
    description: string,
    labels: ReadonlyArray<string>,
    series: ReadonlyArray<Series>
): Html => {
    const maximum = Math.max(0, ...series.flatMap((item) => item.values))
    const summary = series
        .map(
            (item) =>
                `${item.label}: ${item.values.reduce((sum, value) => sum + value, 0)}`
        )
        .join(", ")

    return h.section(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.div(
                [h.Class("space-y-1")],
                [
                    h.h3([h.Class("font-semibold tracking-tight")], [title]),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [description]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "mt-4 h-64 w-full rounded-[var(--radius-control)] border-(length:--surface-border-width) border-border bg-background p-3"
                    ),
                ],
                [
                    h.svg(
                        [
                            h.Xmlns("http://www.w3.org/2000/svg"),
                            h.ViewBox(`0 0 ${width} ${height}`),
                            h.Class("h-full w-full"),
                            h.Fill("none"),
                            h.Role("img"),
                            h.AriaLabel(
                                summary === ""
                                    ? "No analytics trend data"
                                    : `${title}. ${summary}`
                            ),
                        ],
                        [
                            ...grid(),
                            ...series.map((item) =>
                                h.path([
                                    h.D(path_for(item.values, maximum)),
                                    h.Fill("none"),
                                    h.Stroke(item.color),
                                    h.StrokeWidth("3"),
                                    h.StrokeLinecap("round"),
                                    h.StrokeLinejoin("round"),
                                ])
                            ),
                        ]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "mt-3 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
                    ),
                ],
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-x-4 gap-y-2")],
                        series.map((item) =>
                            h.span(
                                [h.Class("inline-flex items-center gap-2")],
                                [
                                    h.span(
                                        [
                                            h.Class("size-2.5 rounded-full"),
                                            h.Style({
                                                backgroundColor: item.color,
                                            }),
                                        ],
                                        []
                                    ),
                                    item.label,
                                ]
                            )
                        )
                    ),
                    h.span(
                        [h.Class("tabular-nums")],
                        [
                            labels.length === 0
                                ? "No dates"
                                : `${labels[0]} – ${labels[labels.length - 1]}`,
                        ]
                    ),
                ]
            ),
        ]
    )
}
