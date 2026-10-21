import { Array, Match as M, Option } from "effect"
import { Submodel } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import {
    AddedRectangle,
    ChangedShapeLabel,
    ChangedZoom,
    ClickedCanvas,
    ClickedRedo,
    ClickedShape,
    ClickedUndo,
    DeletedSelection,
    NudgedSelection,
    SelectedTool,
    ToggledOnline,
    type Message,
} from "./draftboard.message.ts"
import type { Model, Shape } from "./draftboard.model.ts"

const button_class =
    "inline-flex min-h-10 items-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-40 [box-shadow:var(--shadow-control)]"

const shapeView = (
    model: Model,
    shape: Shape,
    h: HtmlBuilder<Message>
): Html => {
    const is_selected = model.selected_ids.includes(shape.id)
    return h.button(
        [
            h.Type("button"),
            h.OnClick(ClickedShape({ id: shape.id, is_additive: false })),
            h.Class(
                `absolute rounded-xl border p-4 text-left shadow-sm transition ${is_selected ? "border-primary ring-2 ring-primary/30" : "border-border"} ${shape.fill}`
            ),
            h.Style({
                left: `${shape.x * model.zoom}px`,
                top: `${shape.y * model.zoom}px`,
                width: `${shape.width * model.zoom}px`,
                height: `${shape.height * model.zoom}px`,
            }),
        ],
        [
            h.span(
                [
                    h.Class(
                        "text-xs font-semibold uppercase tracking-wider opacity-60"
                    ),
                ],
                [shape.id]
            ),
            h.span(
                [h.Class("mt-2 block text-base font-semibold")],
                [shape.label]
            ),
        ]
    )
}

const selectedInspector = (model: Model, h: HtmlBuilder<Message>): Html =>
    Option.match(
        Array.findFirst(model.document.shapes, (shape) =>
            model.selected_ids.includes(shape.id)
        ),
        {
            onNone: () =>
                h.p(
                    [h.Class("text-sm text-muted-foreground")],
                    ["Select an object to inspect it."]
                ),
            onSome: (shape) =>
                h.div(
                    [h.Class("space-y-3")],
                    [
                        h.label(
                            [h.Class("block text-sm font-medium")],
                            ["Label"]
                        ),
                        h.input([
                            h.Value(shape.label),
                            h.OnInput((value) =>
                                ChangedShapeLabel({ id: shape.id, value })
                            ),
                            h.Class(
                                "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2"
                            ),
                        ]),
                        h.div(
                            [h.Class("grid grid-cols-3 gap-2")],
                            [
                                h.button(
                                    [
                                        h.Type("button"),
                                        h.OnClick(
                                            NudgedSelection({
                                                delta_x: -8,
                                                delta_y: 0,
                                            })
                                        ),
                                        h.Class(button_class),
                                    ],
                                    ["Left"]
                                ),
                                h.button(
                                    [
                                        h.Type("button"),
                                        h.OnClick(
                                            NudgedSelection({
                                                delta_x: 0,
                                                delta_y: -8,
                                            })
                                        ),
                                        h.Class(button_class),
                                    ],
                                    ["Up"]
                                ),
                                h.button(
                                    [
                                        h.Type("button"),
                                        h.OnClick(
                                            NudgedSelection({
                                                delta_x: 8,
                                                delta_y: 0,
                                            })
                                        ),
                                        h.Class(button_class),
                                    ],
                                    ["Right"]
                                ),
                            ]
                        ),
                        h.button(
                            [
                                h.Type("button"),
                                h.OnClick(DeletedSelection()),
                                h.Class(
                                    `${button_class} w-full text-destructive`
                                ),
                            ],
                            ["Delete selection"]
                        ),
                    ]
                ),
        }
    )

const draftboardView = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.div(
        [h.Class("space-y-4")],
        [
            h.header(
                [h.Class("flex flex-wrap items-center justify-between gap-3")],
                [
                    h.div(
                        [],
                        [
                            h.p(
                                [
                                    h.Class(
                                        "text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                                    ),
                                ],
                                ["Draftboard"]
                            ),
                            h.h1(
                                [h.Class("text-3xl font-bold")],
                                [model.document.title]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                [`Updated by ${model.document.updated_by}`]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("flex items-center gap-2")],
                        [
                            h.span(
                                [h.Class("text-sm text-muted-foreground")],
                                [
                                    M.value(model.sync_state).pipe(
                                        M.when("Saved", () => "Saved"),
                                        M.when("Saving", () => "Saving…"),
                                        M.when(
                                            "Queued",
                                            () => "Offline · changes queued"
                                        ),
                                        M.when("Error", () => "Save failed"),
                                        M.exhaustive
                                    ),
                                ]
                            ),
                            h.button(
                                [
                                    h.Type("button"),
                                    h.OnClick(ToggledOnline()),
                                    h.Class(button_class),
                                ],
                                [model.is_online ? "Go offline" : "Reconnect"]
                            ),
                        ]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "flex flex-wrap gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2"
                    ),
                ],
                [
                    ...(["Select", "Rectangle", "Hand"] as const).map((tool) =>
                        h.button(
                            [
                                h.Type("button"),
                                h.OnClick(SelectedTool({ tool })),
                                h.Class(
                                    `${button_class} ${model.tool === tool ? "bg-muted" : ""}`
                                ),
                            ],
                            [tool]
                        )
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(AddedRectangle()),
                            h.Class(button_class),
                        ],
                        ["Add rectangle"]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(ClickedUndo()),
                            h.Disabled(model.undo_stack.length === 0),
                            h.Class(button_class),
                        ],
                        ["Undo"]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(ClickedRedo()),
                            h.Disabled(model.redo_stack.length === 0),
                            h.Class(button_class),
                        ],
                        ["Redo"]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(ChangedZoom({ amount: -0.1 })),
                            h.Class(button_class),
                        ],
                        ["−"]
                    ),
                    h.span(
                        [h.Class("self-center text-sm tabular-nums")],
                        [`${Math.round(model.zoom * 100)}%`]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(ChangedZoom({ amount: 0.1 })),
                            h.Class(button_class),
                        ],
                        ["+"]
                    ),
                ]
            ),
            h.div(
                [h.Class("grid gap-4 xl:grid-cols-[1fr_18rem]")],
                [
                    h.div(
                        [
                            h.Class(
                                "overflow-auto rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-muted/30"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.OnClick(ClickedCanvas()),
                                    h.Class(
                                        "relative min-h-[620px] min-w-[1050px]"
                                    ),
                                ],
                                model.document.shapes.map((shape) =>
                                    shapeView(model, shape, h)
                                )
                            ),
                        ]
                    ),
                    h.aside(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4"
                            ),
                        ],
                        [
                            h.h2(
                                [h.Class("mb-4 font-semibold")],
                                [
                                    model.selected_ids.length > 1
                                        ? `${model.selected_ids.length} objects selected`
                                        : "Inspector",
                                ]
                            ),
                            selectedInspector(model, h),
                        ]
                    ),
                ]
            ),
        ]
    )

export const view = Submodel.defineView<Model, Message>(draftboardView)
