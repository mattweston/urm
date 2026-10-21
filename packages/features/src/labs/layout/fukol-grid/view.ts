import type { Html, HtmlBuilder } from "foldkit/html"

const items: ReadonlyArray<string> = [
    "Alpha",
    "Bravo",
    "Charlie",
    "Delta",
    "Echo",
    "Foxtrot",
    "Golf",
    "Hotel",
]

const grid_class_name = "[--gap:0.5rem] -m-(--gap) flex flex-wrap list-none p-0"

const item_class_name =
    "m-(--gap) flex-[1_0_9rem] rounded-[var(--radius-surface)] bg-muted p-4 text-center text-sm font-medium text-foreground ring-1 ring-border"

export const fukol_grid = <Message>(
    grid_items: ReadonlyArray<string>,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [h.Class("overflow-hidden")],
        [
            h.ul(
                [h.Class(grid_class_name), h.AriaLabel("Fukol grid")],
                grid_items.map((item) =>
                    h.keyed("li")(item, [h.Class(item_class_name)], [item])
                )
            ),
        ]
    )

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
    h.section(
        [h.Class("mx-auto w-full max-w-5xl px-6 py-10")],
        [
            h.h1(
                [h.Class("text-2xl font-semibold tracking-tight")],
                ["Fukol Grid"]
            ),
            h.p(
                [h.Class("mt-2 max-w-2xl text-sm text-muted-foreground")],
                [
                    "A breakpoint-free flexbox grid. Every item targets a nine-rem basis, grows to fill its row, and wraps instead of shrinking below that basis.",
                ]
            ),
            h.div(
                [
                    h.Class(
                        "mt-6 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 text-card-foreground [box-shadow:var(--shadow-surface)]"
                    ),
                ],
                [fukol_grid(items, h)]
            ),
            h.p(
                [h.Class("mt-4 max-w-2xl text-sm text-muted-foreground")],
                [
                    "The child margins form the gutters. The container uses the same negative margin to keep the grid flush with its wrapper.",
                ]
            ),
            h.p(
                [h.Class("mt-2 text-sm text-muted-foreground")],
                [
                    "Tailwind: ",
                    h.code(
                        [
                            h.Class(
                                "rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground"
                            ),
                        ],
                        ["flex flex-wrap -m-(--gap)"]
                    ),
                    " with children using ",
                    h.code(
                        [
                            h.Class(
                                "rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground"
                            ),
                        ],
                        ["flex-[1_0_9rem] m-(--gap)"]
                    ),
                    ".",
                ]
            ),
        ]
    )
