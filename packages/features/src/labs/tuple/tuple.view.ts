import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as TupleDemo from "./tuple.ts"

type ToParentMessage<ParentMessage> = (
    message: TupleDemo.Message
) => ParentMessage

const PANEL_CLASS =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"

const panel = <ParentMessage>(
    label: string,
    children: ReadonlyArray<Html>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [h.Class(PANEL_CLASS)],
        [
            h.header(
                [
                    h.Class(
                        "border-b-(length:--surface-border-width) border-border px-5 py-3"
                    ),
                ],
                [
                    h.h3(
                        [
                            h.Class(
                                "text-xs font-semibold tracking-widest uppercase"
                            ),
                        ],
                        [label]
                    ),
                ]
            ),
            ...children,
        ]
    )

const action = <ParentMessage>(
    label: string,
    message: TupleDemo.Message,
    to_parent_message: ToParentMessage<ParentMessage>,
    is_disabled: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(message),
            isDisabled: is_disabled,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-3 py-2 text-xs font-semibold tracking-wide transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-40"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const stage_tabs = <ParentMessage>(
    model: TupleDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Tuple examples"),
        ],
        TupleDemo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        TupleDemo.SelectedTupleStage({
                            stage,
                        })
                    ),
                    isDisabled: stage === model.stage,
                    toView: (attributes) =>
                        h.button(
                            [
                                ...attributes.button,
                                h.Class(
                                    stage === model.stage
                                        ? "rounded-[var(--radius-surface)] bg-foreground px-3 py-2 text-xs font-semibold tracking-wider text-background uppercase"
                                        : "rounded-[var(--radius-surface)] px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase transition-colors hover:bg-muted hover:text-foreground"
                                ),
                            ],
                            [stage]
                        ),
                },
                h
            )
        )
    )

const tuple_cell = <ParentMessage>(
    index: number,
    value: string,
    type: string,
    active: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                active
                    ? "rounded-[var(--radius-surface)] border border-chart-2/40 bg-chart-2/5 p-4"
                    : "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
            ),
        ],
        [
            h.div(
                [h.Class("flex items-center justify-between gap-3")],
                [
                    h.span(
                        [
                            h.Class(
                                "font-mono text-[10px] text-muted-foreground"
                            ),
                        ],
                        [`[${index}]`]
                    ),
                    h.span(
                        [
                            h.Class(
                                "rounded-full border border-chart-1/30 bg-chart-1/5 px-2 py-1 font-mono text-[9px] text-chart-1"
                            ),
                        ],
                        [type]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        active
                            ? "mt-4 font-mono text-lg font-semibold text-chart-2"
                            : "mt-4 font-mono text-lg font-semibold"
                    ),
                ],
                [value]
            ),
        ]
    )

const tuple_row = <ParentMessage>(
    values: ReadonlyArray<unknown>,
    highlighted: ReadonlyArray<number>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("grid gap-2 sm:grid-cols-2 lg:grid-cols-4")],
        values.map((value, index) =>
            h.div(
                [
                    h.Class(
                        highlighted.includes(index)
                            ? "rounded-[var(--radius-surface)] border border-chart-2/40 bg-chart-2/5 p-3"
                            : "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-3"
                    ),
                ],
                [
                    h.div(
                        [
                            h.Class(
                                "font-mono text-[10px] text-muted-foreground"
                            ),
                        ],
                        [`[${index}]`]
                    ),
                    h.div(
                        [
                            h.Class(
                                highlighted.includes(index)
                                    ? "mt-2 font-mono text-xs font-semibold text-chart-2"
                                    : "mt-2 font-mono text-xs font-semibold"
                            ),
                        ],
                        [JSON.stringify(value)]
                    ),
                ]
            )
        )
    )

const make_view = <ParentMessage>(
    model: TupleDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · exact positions, exact types",
                [
                    h.div(
                        [h.Class("grid gap-3 p-5 md:grid-cols-3")],
                        TupleDemo.tuple_values.map((value, index) =>
                            tuple_cell(
                                index,
                                JSON.stringify(value),
                                TupleDemo.tuple_types[index] ?? "unknown",
                                model.selected_index === index,
                                h
                            )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "flex flex-wrap gap-2 border-t-(length:--surface-border-width) border-border p-4"
                            ),
                        ],
                        [0, 1, 2].map((index) =>
                            action(
                                `Tuple.get(${index})`,
                                TupleDemo.SelectedTupleIndex({
                                    index: index as TupleDemo.TupleIndex,
                                }),
                                to_parent_message,
                                model.selected_index === index,
                                h
                            )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border bg-chart-2/5 px-5 py-4"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "font-mono text-xs text-muted-foreground"
                                    ),
                                ],
                                [`Tuple.get(person, ${model.selected_index})`]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "mt-2 font-mono text-lg font-semibold text-chart-2"
                                    ),
                                ],
                                [TupleDemo.selected_value(model.selected_index)]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Why Tuple.make?",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            'Tuple.make("Ada", 36, true) preserves the fixed shape ["Ada", 36, true]. Tuple.get only accepts valid positions and returns the exact type at that position.',
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const select_choice = <ParentMessage>(
    mode: TupleDemo.SelectMode,
    model: TupleDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        mode,
        TupleDemo.SelectedTupleSelectMode({ mode }),
        to_parent_message,
        model.select_mode === mode,
        h
    )

const select_view = <ParentMessage>(
    model: TupleDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const output = TupleDemo.select_result(model.select_mode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · select or extend positions",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            select_choice("Pick", model, to_parent_message, h),
                            select_choice("Omit", model, to_parent_message, h),
                            select_choice(
                                "Append",
                                model,
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            tuple_row(TupleDemo.tuple_values, [], h),
                            h.div(
                                [
                                    h.Class(
                                        "text-center font-mono text-xs text-chart-1"
                                    ),
                                ],
                                [
                                    model.select_mode === "Pick"
                                        ? "pick [0, 2] →"
                                        : model.select_mode === "Omit"
                                          ? "omit [1] →"
                                          : 'append "admin" →',
                                ]
                            ),
                            tuple_row(
                                output,
                                output.map((_, index) => index),
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Type shape changes with the operation",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            model.select_mode === "Pick"
                                ? "Tuple.pick keeps only the requested positions, in the index order you specify."
                                : model.select_mode === "Omit"
                                  ? "Tuple.omit removes the requested positions while preserving the remaining position-specific types."
                                  : "Tuple.appendElement returns [...T, E], so the new element becomes part of the tuple's static shape.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const transform_choice = <ParentMessage>(
    mode: TupleDemo.TransformMode,
    model: TupleDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        mode,
        TupleDemo.SelectedTupleTransformMode({ mode }),
        to_parent_message,
        model.transform_mode === mode,
        h
    )

const transform_view = <ParentMessage>(
    model: TupleDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const output = TupleDemo.transform_result(model.transform_mode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · transform values or positions",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            transform_choice(
                                "Evolve",
                                model,
                                to_parent_message,
                                h
                            ),
                            transform_choice(
                                "Rename",
                                model,
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            tuple_row(TupleDemo.tuple_values, [], h),
                            h.div(
                                [
                                    h.Class(
                                        "text-center font-mono text-xs text-chart-1"
                                    ),
                                ],
                                [
                                    model.transform_mode === "Evolve"
                                        ? "evolve [upper, +1] →"
                                        : 'rename ["2","1","0"] →',
                                ]
                            ),
                            tuple_row(
                                output,
                                output.map((_, index) => index),
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                model.transform_mode === "Evolve"
                    ? "Different function per position"
                    : "Reorder without losing the position types",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            model.transform_mode === "Evolve"
                                ? "Tuple.evolve accepts position-specific functions. Here index 0 changes string value/type and index 1 changes the number, while the boolean position is copied untouched."
                                : 'Tuple.renameIndices uses stringified source indices. ["2","1","0"] reverses the three positions and TypeScript tracks the reordered types.',
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const instance_choice = <ParentMessage>(
    mode: TupleDemo.InstanceMode,
    model: TupleDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        mode,
        TupleDemo.SelectedTupleInstanceMode({ mode }),
        to_parent_message,
        model.instance_mode === mode,
        h
    )

const instances_view = <ParentMessage>(
    model: TupleDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = TupleDemo.instance_result(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · guards and per-position instances",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            instance_choice(
                                "Guard",
                                model,
                                to_parent_message,
                                h
                            ),
                            instance_choice(
                                "Order",
                                model,
                                to_parent_message,
                                h
                            ),
                            instance_choice(
                                "Reduce",
                                model,
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                    model.instance_mode === "Guard"
                        ? h.div(
                              [
                                  h.Class(
                                      "flex flex-wrap gap-2 border-t-(length:--surface-border-width) border-border p-4"
                                  ),
                              ],
                              [2, 3, 4].map((length) =>
                                  action(
                                      `length ${length}`,
                                      TupleDemo.SelectedTupleGuardLength({
                                          length: length as TupleDemo.GuardLength,
                                      }),
                                      to_parent_message,
                                      model.guard_length === length,
                                      h
                                  )
                              )
                          )
                        : h.empty,
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr]"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4 font-mono text-xs leading-6"
                                    ),
                                ],
                                [result.label]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center text-chart-1"
                                    ),
                                ],
                                ["→"]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-success/40 bg-success/5 p-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-lg font-semibold text-success"
                                            ),
                                        ],
                                        [result.output]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 text-xs leading-5 text-muted-foreground"
                                            ),
                                        ],
                                        [result.detail]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "More than array utilities",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Tuple.isTupleOf narrows an Array at runtime by exact length. makeOrder and makeReducer let every tuple position use its own comparison or accumulation rule.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: TupleDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Make"
                ? make_view(model, to_parent_message, h)
                : model.stage === "Select"
                  ? select_view(model, to_parent_message, h)
                  : model.stage === "Transform"
                    ? transform_view(model, to_parent_message, h)
                    : instances_view(model, to_parent_message, h),
        ]
    )
