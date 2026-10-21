import type { Html, HtmlBuilder } from "foldkit/html"

type GridItem = Readonly<{
    id: string
    title: string
}>

const grid: ReadonlyArray<ReadonlyArray<GridItem>> = Array.from(
    { length: 5 },
    (_, row_index) =>
        Array.from({ length: row_index + 1 }, (_, item_index) => ({
            id: `row-${row_index + 1}-item-${item_index + 1}`,
            title: String(item_index + 1),
        }))
)

const auto_grid_class_name =
    "grid list-none grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-2 p-2"

const item_class_name =
    "rounded-[var(--radius-surface)] bg-muted p-2 text-center text-sm font-medium text-foreground ring-1 ring-border"

const grid_row = <Message>(
    items: ReadonlyArray<GridItem>,
    row_index: number,
    h: HtmlBuilder<Message>
): Html =>
    h.keyed("ul")(
        String(row_index),
        [
            h.Class(auto_grid_class_name),
            h.AriaLabel(`${items.length}-item grid`),
        ],
        items.map((item) =>
            h.keyed("li")(item.id, [h.Class(item_class_name)], [item.title])
        )
    )

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
    h.section(
        [h.Class("mx-auto w-full max-w-5xl px-6 py-10")],
        [
            h.h1(
                [h.Class("text-2xl font-semibold tracking-tight")],
                ["Conditional Grid"]
            ),
            h.p(
                [h.Class("mt-2 max-w-2xl text-sm text-muted-foreground")],
                [
                    "Each row contains a different number of items while the same auto-fit grid decides how many tracks to create.",
                ]
            ),
            h.div(
                [
                    h.Class(
                        "mt-6 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 text-card-foreground [box-shadow:var(--shadow-surface)]"
                    ),
                ],
                grid.map((items, row_index) => grid_row(items, row_index, h))
            ),
            h.p(
                [h.Class("mt-4 text-sm text-muted-foreground")],
                [
                    "CSS: ",
                    h.code(
                        [
                            h.Class(
                                "rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground"
                            ),
                        ],
                        ["repeat(auto-fit, minmax(4rem, 1fr))"]
                    ),
                    " becomes ",
                    h.code(
                        [
                            h.Class(
                                "rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground"
                            ),
                        ],
                        ["grid-cols-[repeat(auto-fit,minmax(4rem,1fr))]"]
                    ),
                    ".",
                ]
            ),
        ]
    )
