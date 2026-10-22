import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Demo from "./chunk.ts"

type ToParentMessage<ParentMessage> = (message: Demo.Message) => ParentMessage

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
    message: Demo.Message,
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
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Chunk examples"),
        ],
        Demo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        Demo.Message.SelectedChunkStage({ stage })
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

const controls = <ParentMessage>(
    children: ReadonlyArray<Html>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "flex flex-wrap gap-2 border-t-(length:--surface-border-width) border-border p-4"
            ),
        ],
        children
    )

const chunk_row = <ParentMessage>(
    values: ReadonlyArray<unknown>,
    tone: "cyan" | "green" | "amber",
    h: HtmlBuilder<ParentMessage>
): Html => {
    const classes =
        tone === "green"
            ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-600"
            : tone === "amber"
              ? "border-amber-500/40 bg-amber-500/5 text-amber-600"
              : "border-cyan-500/40 bg-cyan-500/5 text-cyan-500"

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
                      ["Chunk.empty()"]
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
    tone: "cyan" | "green" | "violet",
    h: HtmlBuilder<ParentMessage>
): Html => {
    const classes =
        tone === "green"
            ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-600"
            : tone === "violet"
              ? "border-violet-500/40 bg-violet-500/5 text-violet-500"
              : "border-cyan-500/40 bg-cyan-500/5 text-cyan-500"

    return h.div(
        [h.Class(`rounded-[var(--radius-surface)] border p-4 ${classes}`)],
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
                [h.Class("mt-2 break-words font-mono text-sm font-semibold")],
                [value]
            ),
        ]
    )
}

const access_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = Demo.accessResult(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · construct and access safely",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["Get", "Ends", "Convert"] as const).map((mode) =>
                            action(
                                mode,
                                Demo.Message.SelectedChunkAccessMode({ mode }),
                                to_parent_message,
                                model.accessMode === mode,
                                h
                            )
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
                                [
                                    h.Class(
                                        "mb-2 font-mono text-xs text-muted-foreground"
                                    ),
                                ],
                                ["Chunk.range(1, 5) · NonEmptyChunk<number>"]
                            ),
                            chunk_row(Demo.sourceValues, "cyan", h),
                        ]
                    ),
                    model.accessMode === "Get"
                        ? controls(
                              [-1, 0, 1, 4, 99].map((index) =>
                                  action(
                                      String(index),
                                      Demo.Message.SelectedChunkAccessIndex({
                                          index,
                                      }),
                                      to_parent_message,
                                      model.accessIndex === index,
                                      h
                                  )
                              ),
                              h
                          )
                        : h.empty,
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            result_card(
                                "expression",
                                result.expression,
                                "violet",
                                h
                            ),
                            h.div(
                                [h.Class("text-center text-muted-foreground")],
                                ["→"]
                            ),
                            result_card("output", result.output, "green", h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "NonEmptyChunk is carried in the type",
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

const concat_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = Demo.concatResult(model.concatMode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · immutable concatenate and slice",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["Append", "AppendAll", "Slice"] as const).map(
                            (mode) =>
                                action(
                                    mode,
                                    Demo.Message.SelectedChunkConcatMode({
                                        mode,
                                    }),
                                    to_parent_message,
                                    model.concatMode === mode,
                                    h
                                )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            chunk_row(result.left, "cyan", h),
                            h.div(
                                [
                                    h.Class(
                                        "text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                [
                                    model.concatMode === "Slice"
                                        ? "take / drop"
                                        : "+",
                                ]
                            ),
                            chunk_row(result.right, "amber", h),
                            h.div(
                                [h.Class("text-center text-muted-foreground")],
                                ["→"]
                            ),
                            chunk_row(result.output, "green", h),
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
                "Why Chunk exists beside Array",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [result.detail]
                    ),
                    h.p(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-3 text-xs leading-5 text-muted-foreground"
                            ),
                        ],
                        [
                            "Effect documents Chunk as an immutable ordered collection optimized for efficient concatenation and access patterns. appendAll and take/drop return new Chunks; neither input is mutated.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const transform_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = Demo.transformResult(model.transformMode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · transform and split Result channels",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "Map",
                                "FlatMap",
                                "FilterMap",
                                "Partition",
                            ] as const
                        ).map((mode) =>
                            action(
                                mode,
                                Demo.Message.SelectedChunkTransformMode({
                                    mode,
                                }),
                                to_parent_message,
                                model.transformMode === mode,
                                h
                            )
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
                                [chunk_row(result.source, "cyan", h)]
                            ),
                            model.transformMode === "Partition"
                                ? h.div(
                                      [h.Class("grid gap-4 md:grid-cols-2")],
                                      [
                                          h.div(
                                              [],
                                              [
                                                  h.div(
                                                      [
                                                          h.Class(
                                                              "mb-2 text-[10px] font-semibold tracking-wider text-amber-600 uppercase"
                                                          ),
                                                      ],
                                                      ["Failure / excluded"]
                                                  ),
                                                  chunk_row(
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
                                                              "mb-2 text-[10px] font-semibold tracking-wider text-emerald-600 uppercase"
                                                          ),
                                                      ],
                                                      ["Success / satisfying"]
                                                  ),
                                                  chunk_row(
                                                      result.right,
                                                      "green",
                                                      h
                                                  ),
                                              ]
                                          ),
                                      ]
                                  )
                                : chunk_row(result.left, "green", h),
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
                "Type and channel behavior",
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

const shape_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = Demo.shapeResult(model.shapeMode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · reshape, compare, and fold",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "Chunks",
                                "Dedupe",
                                "Zip",
                                "Set",
                                "Reduce",
                            ] as const
                        ).map((mode) =>
                            action(
                                mode,
                                Demo.Message.SelectedChunkShapeMode({ mode }),
                                to_parent_message,
                                model.shapeMode === mode,
                                h
                            )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            result_card(
                                "expression",
                                result.expression,
                                "violet",
                                h
                            ),
                            h.div(
                                [h.Class("text-center text-muted-foreground")],
                                ["→"]
                            ),
                            result_card("output", result.output, "green", h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Collection helpers still return Chunk",
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
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Access"
                ? access_view(model, to_parent_message, h)
                : model.stage === "Concat"
                  ? concat_view(model, to_parent_message, h)
                  : model.stage === "Transform"
                    ? transform_view(model, to_parent_message, h)
                    : shape_view(model, to_parent_message, h),
        ]
    )
