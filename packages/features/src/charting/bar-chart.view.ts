import { type Html, inertHtml as h } from "foldkit/html"

export type Datum = Readonly<{
    label: string
    value: number
    color: string
}>

const view_box_width = 360
const view_box_height = 170
const horizontal_padding = 18
const vertical_padding = 14
const inner_width = view_box_width - horizontal_padding * 2
const inner_height = view_box_height - vertical_padding * 2

const grid_lines = (): ReadonlyArray<Html> =>
    [0, 1, 2, 3, 4].map((index) => {
        const y = vertical_padding + (inner_height / 4) * index

        return h.line(
            [
                h.X1(`${horizontal_padding}`),
                h.Y1(`${y}`),
                h.X2(`${view_box_width - horizontal_padding}`),
                h.Y2(`${y}`),
                h.Stroke("currentColor"),
                h.Class(index === 4 ? "stroke-border" : "stroke-border/60"),
            ],
            []
        )
    })

const bar_chart = (
    data: ReadonlyArray<Datum>,
    show_axis_labels: boolean
): Html => {
    const maximum = Math.max(0, ...data.map((item) => item.value))
    const slot_width = inner_width / Math.max(data.length, 1)
    const bar_width = Math.max(12, slot_width - 16)
    const aria_label = data
        .map((item) => `${item.label}: ${item.value}`)
        .join(", ")

    return h.div(
        [h.Class("space-y-4")],
        [
            h.div(
                [
                    h.Class(
                        "h-52 w-full rounded-[var(--radius-control)] border-(length:--surface-border-width) border-border bg-background p-3"
                    ),
                ],
                [
                    h.svg(
                        [
                            h.Xmlns("http://www.w3.org/2000/svg"),
                            h.ViewBox(
                                `0 0 ${view_box_width} ${view_box_height + (show_axis_labels ? 16 : 0)}`
                            ),
                            h.Class("h-full w-full"),
                            h.Fill("none"),
                            h.Role("img"),
                            h.AriaLabel(
                                aria_label === ""
                                    ? "No data available"
                                    : aria_label
                            ),
                        ],
                        [
                            ...grid_lines(),
                            ...(show_axis_labels
                                ? data.map((item, index) =>
                                      h.text(
                                          [
                                              h.X(
                                                  `${horizontal_padding + slot_width * (index + 0.5)}`
                                              ),
                                              h.Y(`${view_box_height + 6}`),
                                              h.TextAnchor("middle"),
                                              h.Fill("currentColor"),
                                              h.Class(
                                                  "text-[9px] text-muted-foreground"
                                              ),
                                          ],
                                          [item.label]
                                      )
                                  )
                                : []),
                            ...data.map((item, index) => {
                                const height =
                                    maximum === 0
                                        ? 0
                                        : (item.value / maximum) * inner_height
                                const x =
                                    horizontal_padding +
                                    slot_width * index +
                                    (slot_width - bar_width) / 2
                                const y =
                                    view_box_height - vertical_padding - height

                                return h.rect(
                                    [
                                        h.X(`${x}`),
                                        h.Y(`${y}`),
                                        h.Width(`${bar_width}`),
                                        h.Height(`${height}`),
                                        h.Rx("4"),
                                        h.Fill(item.color),
                                    ],
                                    []
                                )
                            }),
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("grid gap-2 sm:grid-cols-2")],
                data.map((item) =>
                    h.div(
                        [h.Class("flex items-center gap-2 text-sm")],
                        [
                            h.span(
                                [
                                    h.Class("size-2.5 shrink-0 rounded-full"),
                                    h.Style({ backgroundColor: item.color }),
                                ],
                                []
                            ),
                            h.span(
                                [
                                    h.Class(
                                        "min-w-0 truncate text-muted-foreground"
                                    ),
                                ],
                                [item.label]
                            ),
                            h.span(
                                [h.Class("ml-auto font-medium tabular-nums")],
                                [`${item.value}`]
                            ),
                        ]
                    )
                )
            ),
        ]
    )
}

export const chart_card = (
    title: string,
    description: string,
    data: ReadonlyArray<Datum>,
    show_axis_labels = false
): Html =>
    h.section(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.div(
                [h.Class("flex items-start justify-between gap-4 p-5 pb-3")],
                [
                    h.div(
                        [h.Class("space-y-1")],
                        [
                            h.h3(
                                [
                                    h.Class(
                                        "font-semibold leading-none tracking-tight"
                                    ),
                                ],
                                [title]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                [description]
                            ),
                        ]
                    ),
                    h.span(
                        [h.Class("text-xl font-semibold tabular-nums")],
                        [`${data.reduce((sum, item) => sum + item.value, 0)}`]
                    ),
                ]
            ),
            h.div([h.Class("px-5 pb-5")], [bar_chart(data, show_axis_labels)]),
        ]
    )
