import type { Html, HtmlBuilder } from "foldkit/html"

import { SelectedJustifyItems, type Message } from "./message.ts"
import type { JustifyItems, Model } from "./model.ts"
import { grid_builder_href } from "../grid-builder/route.ts"

const values: ReadonlyArray<JustifyItems> = [
    "start",
    "center",
    "end",
    "stretch",
]

const button_class =
    "min-h-11 min-w-28 rounded-[var(--radius-control)] border-(length:--control-border-width) px-4 py-2 font-mono text-xs font-semibold transition-[color,background-color,scale] active:scale-[0.96]"

export const view = <ParentMessage>(
    model: Model,
    to_parent_message: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.main(
        [h.Class("mx-auto w-full max-w-5xl space-y-8 px-6 py-10")],
        [
            h.header(
                [h.Class("max-w-2xl space-y-3")],
                [
                    h.p(
                        [h.Class("text-sm font-medium text-primary")],
                        ["Labs / Design"]
                    ),
                    h.h1(
                        [
                            h.Class(
                                "text-3xl font-bold tracking-tight text-balance"
                            ),
                        ],
                        ["Prop Grid"]
                    ),
                    h.p(
                        [h.Class("text-pretty text-muted-foreground")],
                        [
                            "Compare how justify-items positions grid items along the inline axis of each track.",
                        ]
                    ),
                ]
            ),
            h.section(
                [
                    h.Class(
                        "space-y-5 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 [box-shadow:var(--shadow-card)] sm:p-6"
                    ),
                ],
                [
                    h.div(
                        [
                            h.Class(
                                "flex flex-wrap items-baseline justify-between gap-3"
                            ),
                        ],
                        [
                            h.h2(
                                [h.Class("text-lg font-semibold")],
                                ["justify-items"]
                            ),
                            h.code(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-control)] bg-muted px-3 py-1.5 font-mono text-sm text-foreground"
                                    ),
                                ],
                                [`justify-items: ${model.justify_items};`]
                            ),
                        ]
                    ),
                    h.ul(
                        [
                            h.Class(
                                "grid min-h-72 list-none grid-cols-2 gap-3 rounded-[var(--radius-surface)] border-2 border-dashed border-border bg-muted/25 p-3 sm:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]"
                            ),
                            h.Style({ justifyItems: model.justify_items }),
                            h.AriaLabel("justify-items values"),
                        ],
                        values.map((value) => {
                            const selected = model.justify_items === value
                            return h.li(
                                [
                                    h.Class(
                                        "grid min-h-24 place-items-center rounded-[var(--radius-control)] border-2 border-dashed border-primary/35 bg-background p-3"
                                    ),
                                ],
                                [
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.AriaPressed(String(selected)),
                                            h.OnClick(
                                                to_parent_message(
                                                    SelectedJustifyItems({
                                                        justify_items: value,
                                                    })
                                                )
                                            ),
                                            h.Class(
                                                selected
                                                    ? `${button_class} border-primary bg-primary text-primary-foreground`
                                                    : `${button_class} border-border bg-background text-foreground hover:bg-accent`
                                            ),
                                        ],
                                        [value]
                                    ),
                                ]
                            )
                        })
                    ),
                    h.p(
                        [
                            h.Class(
                                "text-pretty text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Each dashed card is a grid item. Start, center, and end give each item its intrinsic width and move it within its track; stretch expands the items to fill their tracks.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href(grid_builder_href()),
                    h.Class(
                        "inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-3 text-sm font-medium text-primary hover:bg-accent"
                    ),
                ],
                ["Related: Grid Builder"]
            ),
        ]
    )
