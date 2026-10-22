import type { Html, HtmlBuilder } from "foldkit/html"

import {
    ClickedAddBox,
    ClickedRemoveBox,
    SelectedPreviewShape,
    type Message,
} from "./message.ts"
import type { Model, PreviewShape } from "./model.ts"

const preview_shapes: ReadonlyArray<
    Readonly<{ value: PreviewShape; label: string }>
> = [
    { value: "portrait", label: "Portrait" },
    { value: "square", label: "Square" },
    { value: "landscape", label: "Landscape" },
]

const preview_size_class: Readonly<Record<PreviewShape, string>> = {
    portrait: "h-[32rem] w-[22rem]",
    square: "size-[32rem]",
    landscape: "h-[22rem] w-[44rem]",
}

const control_class =
    "min-h-11 rounded-[var(--radius-control)] border-(length:--control-border-width) px-4 py-2 text-sm font-medium transition-[color,background-color,scale] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50"

export const view = <ParentMessage>(
    model: Model,
    to_parent_message: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.main(
        [h.Class("mx-auto w-full max-w-6xl space-y-8 px-6 py-10")],
        [
            h.header(
                [h.Class("max-w-2xl space-y-3")],
                [
                    h.p(
                        [h.Class("text-sm font-medium text-primary")],
                        ["Design"]
                    ),
                    h.h1(
                        [
                            h.Class(
                                "text-3xl font-bold tracking-tight text-balance"
                            ),
                        ],
                        ["Grid Builder"]
                    ),
                    h.p(
                        [h.Class("text-pretty text-muted-foreground")],
                        [
                            "Add and remove boxes to see quantity queries reshape the grid. Change the preview proportions to see the size container query adapt the same content for portrait and landscape spaces.",
                        ]
                    ),
                ]
            ),
            h.section(
                [h.Class("grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]")],
                [
                    h.div(
                        [
                            h.Class(
                                "grid min-w-0 place-items-center overflow-auto rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-muted/30 p-4 [scrollbar-gutter:stable]"
                            ),
                        ],
                        [
                            h.keyed("div")(
                                model.preview_shape,
                                [
                                    h.Class(
                                        `grid-builder-container grid max-h-[70dvh] max-w-full resize overflow-hidden rounded-[var(--radius-surface)] border border-border bg-background ${preview_size_class[model.preview_shape]}`
                                    ),
                                ],
                                [
                                    h.ol(
                                        [
                                            h.Class(
                                                "grid-builder-grid grid min-h-0 list-none gap-3 p-3"
                                            ),
                                            h.AriaLabel(
                                                `${model.box_count}-box responsive grid`
                                            ),
                                        ],
                                        Array.from(
                                            { length: model.box_count },
                                            (_, index) =>
                                                h.keyed("li")(
                                                    String(index),
                                                    [
                                                        h.Class(
                                                            "grid min-h-12 place-items-center rounded-[var(--radius-control)] bg-primary/15 font-mono text-sm font-semibold tabular-nums text-primary ring-1 ring-inset ring-primary/25"
                                                        ),
                                                        h.Style({
                                                            viewTransitionName: `grid-builder-box-${index}`,
                                                            viewTransitionClass:
                                                                "grid-builder-box",
                                                        }),
                                                    ],
                                                    [String(index + 1)]
                                                )
                                        )
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.aside(
                        [
                            h.Class(
                                "h-fit space-y-6 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 [box-shadow:var(--shadow-card)]"
                            ),
                            h.AriaLabel("Grid controls"),
                        ],
                        [
                            h.div(
                                [h.Class("space-y-3")],
                                [
                                    h.h2([h.Class("font-semibold")], ["Boxes"]),
                                    h.output(
                                        [
                                            h.Class(
                                                "block font-mono text-3xl font-semibold tabular-nums"
                                            ),
                                            h.AriaLive("polite"),
                                        ],
                                        [String(model.box_count)]
                                    ),
                                    h.div(
                                        [h.Class("grid grid-cols-2 gap-2")],
                                        [
                                            h.button(
                                                [
                                                    h.Type("button"),
                                                    h.Disabled(
                                                        model.box_count <= 1
                                                    ),
                                                    h.OnClick(
                                                        to_parent_message(
                                                            ClickedRemoveBox()
                                                        )
                                                    ),
                                                    h.Class(
                                                        `${control_class} border-border bg-background hover:bg-accent`
                                                    ),
                                                ],
                                                ["Remove"]
                                            ),
                                            h.button(
                                                [
                                                    h.Type("button"),
                                                    h.Disabled(
                                                        model.box_count >= 12
                                                    ),
                                                    h.OnClick(
                                                        to_parent_message(
                                                            ClickedAddBox()
                                                        )
                                                    ),
                                                    h.Class(
                                                        `${control_class} border-primary bg-primary text-primary-foreground hover:bg-primary/90`
                                                    ),
                                                ],
                                                ["Add box"]
                                            ),
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "text-xs text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Choose between 1 and 12 boxes. Drag the preview’s lower-right corner to resize it freely.",
                                        ]
                                    ),
                                ]
                            ),
                            h.fieldset(
                                [h.Class("space-y-3")],
                                [
                                    h.legend(
                                        [h.Class("font-semibold")],
                                        ["Preview shape"]
                                    ),
                                    h.div(
                                        [h.Class("grid gap-2")],
                                        preview_shapes.map((shape) =>
                                            h.button(
                                                [
                                                    h.Type("button"),
                                                    h.AriaPressed(
                                                        String(
                                                            model.preview_shape ===
                                                                shape.value
                                                        )
                                                    ),
                                                    h.OnClick(
                                                        to_parent_message(
                                                            SelectedPreviewShape(
                                                                {
                                                                    preview_shape:
                                                                        shape.value,
                                                                }
                                                            )
                                                        )
                                                    ),
                                                    h.Class(
                                                        model.preview_shape ===
                                                            shape.value
                                                            ? `${control_class} border-primary bg-primary/10 text-primary`
                                                            : `${control_class} border-border bg-background hover:bg-accent`
                                                    ),
                                                ],
                                                [shape.label]
                                            )
                                        )
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            h.section(
                [h.Class("max-w-3xl space-y-3")],
                [
                    h.h2(
                        [h.Class("text-xl font-semibold")],
                        ["How the layout decides"]
                    ),
                    h.p(
                        [
                            h.Class(
                                "text-pretty text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "The grid uses :has() with :nth-child() to detect its item count. A named size container then switches the placement rules when the preview becomes wider than it is tall. The DOM order never changes; only the grid tracks and spans do.",
                        ]
                    ),
                ]
            ),
        ]
    )
