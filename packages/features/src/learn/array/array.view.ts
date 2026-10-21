import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as ArrayDemo from "./array.ts"

type ToParentMessage<ParentMessage> = (
    message: ArrayDemo.Message
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
    message: ArrayDemo.Message,
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
    model: ArrayDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Array examples"),
        ],
        ArrayDemo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        ArrayDemo.SelectedArrayStage({ stage })
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

const array_row = <ParentMessage>(
    values: ReadonlyArray<unknown>,
    tone: "accent-2" | "green" | "amber",
    h: HtmlBuilder<ParentMessage>
): Html => {
    const classes =
        tone === "green"
            ? "border-success/40 bg-success/5 text-success"
            : tone === "amber"
              ? "border-warning/40 bg-warning/5 text-warning"
              : "border-chart-2/40 bg-chart-2/5 text-chart-2"

    return h.div(
        [
            h.Class(
                "flex min-h-16 flex-wrap items-center gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-3"
            ),
        ],
        values.length === 0
            ? [
                  h.span(
                      [
                          h.Class(
                              "w-full text-center font-mono text-xs text-muted-foreground"
                          ),
                      ],
                      ["[]"]
                  ),
              ]
            : values.map((value) =>
                  h.div(
                      [
                          h.Class(
                              `rounded-[var(--radius-surface)] border px-3 py-2 font-mono text-xs ${classes}`
                          ),
                      ],
                      [
                          typeof value === "string"
                              ? value
                              : JSON.stringify(value),
                      ]
                  )
              )
    )
}

const result_card = <ParentMessage>(
    label: string,
    value: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border border-chart-1/40 bg-chart-1/5 p-4"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                    ),
                ],
                [label]
            ),
            h.div(
                [
                    h.Class(
                        "mt-2 break-words font-mono text-sm font-semibold text-chart-1"
                    ),
                ],
                [value]
            ),
        ]
    )

const access_action = <ParentMessage>(
    mode: ArrayDemo.AccessMode,
    model: ArrayDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        mode,
        ArrayDemo.SelectedArrayAccessMode({ access_mode: mode }),
        to_parent_message,
        model.access_mode === mode,
        h
    )

const access_view = <ParentMessage>(
    model: ArrayDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = ArrayDemo.access_result(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · construct and access safely",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            access_action("Get", model, to_parent_message, h),
                            access_action("Find", model, to_parent_message, h),
                            access_action(
                                "HeadLast",
                                model,
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border p-5"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "mb-2 font-mono text-xs text-muted-foreground"
                                    ),
                                ],
                                ["Array.range(1, 5)"]
                            ),
                            array_row(ArrayDemo.source_numbers, "accent-2", h),
                        ]
                    ),
                    model.access_mode === "Get"
                        ? h.div(
                              [
                                  h.Class(
                                      "flex flex-wrap gap-2 border-t-(length:--surface-border-width) border-border p-4"
                                  ),
                              ],
                              [-1, 0, 1, 4, 99].map((index) =>
                                  action(
                                      String(index),
                                      ArrayDemo.SelectedArrayAccessIndex({
                                          index,
                                      }),
                                      to_parent_message,
                                      model.access_index === index,
                                      h
                                  )
                              )
                          )
                        : h.empty,
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            result_card("expression", result.expression, h),
                            h.div(
                                [h.Class("text-center text-muted-foreground")],
                                ["→"]
                            ),
                            result_card("output", result.output, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Option at uncertain positions",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [result.detail]
                    ),
                ],
                h
            ),
        ]
    )
}

const transform_action = <ParentMessage>(
    mode: ArrayDemo.TransformMode,
    model: ArrayDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        mode,
        ArrayDemo.SelectedArrayTransformMode({ transform_mode: mode }),
        to_parent_message,
        model.transform_mode === mode,
        h
    )

const transform_view = <ParentMessage>(
    model: ArrayDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = ArrayDemo.transform_result(model.transform_mode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · transform shape and values",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["Map", "FlatMap", "ZipWith"] as const).map((mode) =>
                            transform_action(mode, model, to_parent_message, h)
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            array_row(result.left, "accent-2", h),
                            h.div(
                                [
                                    h.Class(
                                        "text-center font-mono text-xs text-chart-1"
                                    ),
                                ],
                                [model.transform_mode]
                            ),
                            array_row(result.right, "green", h),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-4 font-mono text-xs text-muted-foreground"
                            ),
                        ],
                        [result.expression]
                    ),
                ],
                h
            ),
            panel(
                "Shape rule",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [result.detail]
                    ),
                ],
                h
            ),
        ]
    )
}

const filter_action = <ParentMessage>(
    mode: ArrayDemo.FilterMode,
    model: ArrayDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        mode,
        ArrayDemo.SelectedArrayFilterMode({ filter_mode: mode }),
        to_parent_message,
        model.filter_mode === mode,
        h
    )

const filter_view = <ParentMessage>(
    model: ArrayDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = ArrayDemo.filter_result(model.filter_mode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · filter with boolean or Result",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["Filter", "FilterMap", "Partition"] as const).map(
                            (mode) =>
                                filter_action(mode, model, to_parent_message, h)
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border p-5"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("mb-4")],
                                [array_row(ArrayDemo.source_numbers, "accent-2", h)]
                            ),
                            model.filter_mode === "Partition"
                                ? h.div(
                                      [h.Class("grid gap-4 md:grid-cols-2")],
                                      [
                                          h.div(
                                              [],
                                              [
                                                  h.div(
                                                      [
                                                          h.Class(
                                                              "mb-2 text-[10px] font-semibold tracking-wider text-warning uppercase"
                                                          ),
                                                      ],
                                                      ["Failure / excluded"]
                                                  ),
                                                  array_row(
                                                      result.left,
                                                      "amber",
                                                      h
                                                  ),
                                              ]
                                          ),
                                          h.div(
                                              [],
                                              [
                                                  h.div(
                                                      [
                                                          h.Class(
                                                              "mb-2 text-[10px] font-semibold tracking-wider text-success uppercase"
                                                          ),
                                                      ],
                                                      ["Success / satisfying"]
                                                  ),
                                                  array_row(
                                                      result.right,
                                                      "green",
                                                      h
                                                  ),
                                              ]
                                          ),
                                      ]
                                  )
                                : array_row(result.right, "green", h),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-4 font-mono text-xs text-muted-foreground"
                            ),
                        ],
                        [result.expression]
                    ),
                ],
                h
            ),
            panel(
                "Why Result?",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [result.detail]
                    ),
                ],
                h
            ),
        ]
    )
}

const shape_action = <ParentMessage>(
    mode: ArrayDemo.ShapeMode,
    model: ArrayDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        mode,
        ArrayDemo.SelectedArrayShapeMode({ shape_mode: mode }),
        to_parent_message,
        model.shape_mode === mode,
        h
    )

const render_shape_output = <ParentMessage>(
    mode: ArrayDemo.ShapeMode,
    output: unknown,
    h: HtmlBuilder<ParentMessage>
): Html => {
    if (mode === "Chunks" || mode === "Window") {
        const rows = output as ReadonlyArray<ReadonlyArray<unknown>>
        return h.div(
            [h.Class("space-y-2")],
            rows.map((row) => array_row(row, "green", h))
        )
    }

    if (mode === "GroupBy") {
        const groups = output as Record<
            string,
            ReadonlyArray<{
                readonly name: string
                readonly team: string
            }>
        >

        return h.div(
            [h.Class("space-y-3")],
            Object.entries(groups).map(([key, group]) =>
                h.div(
                    [
                        h.Class(
                            "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-3"
                        ),
                    ],
                    [
                        h.div(
                            [
                                h.Class(
                                    "font-mono text-xs font-semibold text-chart-1"
                                ),
                            ],
                            [key]
                        ),
                        h.div(
                            [h.Class("mt-2 flex flex-wrap gap-2")],
                            group.map((person) =>
                                h.span(
                                    [
                                        h.Class(
                                            "rounded-full border border-success/30 bg-success/5 px-2 py-1 font-mono text-[10px] text-success"
                                        ),
                                    ],
                                    [person.name]
                                )
                            )
                        ),
                    ]
                )
            )
        )
    }

    return result_card("folded value", String(output), h)
}

const shape_view = <ParentMessage>(
    model: ArrayDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = ArrayDemo.shape_result(model.shape_mode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · reshape, group, and fold",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            ["Chunks", "Window", "GroupBy", "Reduce"] as const
                        ).map((mode) =>
                            shape_action(mode, model, to_parent_message, h)
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border p-5"
                            ),
                        ],
                        [
                            render_shape_output(
                                model.shape_mode,
                                result.output,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-4 font-mono text-xs text-muted-foreground"
                            ),
                        ],
                        [result.expression]
                    ),
                ],
                h
            ),
            panel(
                "Static shape where possible",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [result.detail]
                    ),
                ],
                h
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: ArrayDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Access"
                ? access_view(model, to_parent_message, h)
                : model.stage === "Transform"
                  ? transform_view(model, to_parent_message, h)
                  : model.stage === "Filter"
                    ? filter_view(model, to_parent_message, h)
                    : shape_view(model, to_parent_message, h),
        ]
    )
