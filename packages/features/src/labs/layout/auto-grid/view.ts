import type { Html, HtmlBuilder } from "foldkit/html"

const items: ReadonlyArray<string> = Array.from({ length: 12 }, (_, index) =>
    String(index + 1)
)

const auto_grid_class_name =
    "grid list-none grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-2 p-2"

const item_class_name =
    "rounded-[var(--radius-surface)] bg-muted p-2 text-center text-sm font-medium text-foreground ring-1 ring-border"

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
    h.section(
        [h.Class("mx-auto w-full max-w-5xl px-6 py-10")],
        [
            h.h1(
                [h.Class("text-2xl font-semibold tracking-tight")],
                ["Auto Grid"]
            ),
            h.p(
                [h.Class("mt-2 max-w-2xl text-sm text-muted-foreground")],
                [
                    "A single ordinary grid creates as many four-rem minimum columns as fit, then shares the remaining space between them.",
                ]
            ),
            h.div(
                [
                    h.Class(
                        "mt-6 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 text-card-foreground [box-shadow:var(--shadow-surface)]"
                    ),
                ],
                [
                    h.ul(
                        [
                            h.Class(auto_grid_class_name),
                            h.AriaLabel("Auto-fit grid"),
                        ],
                        items.map((item) =>
                            h.keyed("li")(
                                item,
                                [h.Class(item_class_name)],
                                [item]
                            )
                        )
                    ),
                ]
            ),
            h.p(
                [h.Class("mt-4 text-sm text-muted-foreground")],
                [
                    "Resize the content area to see tracks wrap without a breakpoint. Both grid labs use ",
                    h.code(
                        [
                            h.Class(
                                "rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground"
                            ),
                        ],
                        ["grid-cols-[repeat(auto-fit,minmax(4rem,1fr))] gap-2"]
                    ),
                    ".",
                ]
            ),
        ]
    )
