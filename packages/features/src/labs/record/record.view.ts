import * as Ui from "@foldkit/ui"
import { Option, Record as R } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as RecordDemo from "./record.ts"

type ToParentMessage<ParentMessage> = (
    message: RecordDemo.Message
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
    message: RecordDemo.Message,
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
    model: RecordDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Record examples"),
        ],
        RecordDemo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        RecordDemo.SelectedRecordStage({ stage })
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

const record_grid = <ParentMessage>(
    record: Readonly<Record<string, string | number>>,
    highlighted: ReadonlyArray<string>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const entries = R.toEntries(record)

    return h.div(
        [
            h.Class(
                "grid min-h-36 grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-3 sm:grid-cols-4"
            ),
        ],
        entries.length === 0
            ? [
                  h.div(
                      [
                          h.Class(
                              "col-span-full self-center text-center font-mono text-xs text-muted-foreground"
                          ),
                      ],
                      ["{}"]
                  ),
              ]
            : entries.map(([key, value]) =>
                  h.div(
                      [
                          h.Class(
                              highlighted.includes(key)
                                  ? "rounded-[var(--radius-surface)] border border-chart-2/40 bg-chart-2/5 p-3"
                                  : "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border p-3"
                          ),
                      ],
                      [
                          h.div(
                              [
                                  h.Class(
                                      "font-mono text-[10px] text-muted-foreground"
                                  ),
                              ],
                              [key]
                          ),
                          h.div(
                              [
                                  h.Class(
                                      highlighted.includes(key)
                                          ? "mt-2 font-mono text-sm font-semibold text-chart-2"
                                          : "mt-2 font-mono text-sm font-semibold"
                                  ),
                              ],
                              [String(value)]
                          ),
                      ]
                  )
              )
    )
}

const lookup_choice = <ParentMessage>(
    key: RecordDemo.LookupKey,
    model: RecordDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        key,
        RecordDemo.SelectedRecordLookupKey({ key }),
        to_parent_message,
        model.lookup_key === key,
        h
    )

const mutation_choice = <ParentMessage>(
    mutation: RecordDemo.Mutation,
    model: RecordDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        mutation,
        RecordDemo.SelectedRecordMutation({ mutation }),
        to_parent_message,
        model.mutation === mutation,
        h
    )

const lookup_view = <ParentMessage>(
    model: RecordDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const lookup = RecordDemo.lookup_result(model.lookup_key)
    const result = RecordDemo.mutation_result(model)

    const highlight = model.mutation_applied
        ? model.mutation === "Set"
            ? ["katherine"]
            : model.mutation === "Modify"
              ? ["ada"]
              : []
        : []

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · safe lookup",
                [
                    h.div(
                        [h.Class("p-5")],
                        [
                            record_grid(
                                RecordDemo.scores,
                                [model.lookup_key],
                                h
                            ),
                            h.div(
                                [h.Class("mt-4 flex flex-wrap gap-2")],
                                [
                                    lookup_choice(
                                        "ada",
                                        model,
                                        to_parent_message,
                                        h
                                    ),
                                    lookup_choice(
                                        "alan",
                                        model,
                                        to_parent_message,
                                        h
                                    ),
                                    lookup_choice(
                                        "missing",
                                        model,
                                        to_parent_message,
                                        h
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        Option.isSome(lookup)
                                            ? "mt-4 rounded-[var(--radius-surface)] border border-success/40 bg-success/5 px-4 py-3 font-mono text-xs text-success"
                                            : "mt-4 rounded-[var(--radius-surface)] border border-warning/40 bg-warning/5 px-4 py-3 font-mono text-xs text-warning"
                                    ),
                                ],
                                [
                                    Option.match(lookup, {
                                        onNone: () =>
                                            `Record.get("${model.lookup_key}") → Option.none()`,
                                        onSome: (value) =>
                                            `Record.get("${model.lookup_key}") → Option.some(${value})`,
                                    }),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Immutable-style update",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            mutation_choice("Set", model, to_parent_message, h),
                            mutation_choice(
                                "Remove",
                                model,
                                to_parent_message,
                                h
                            ),
                            mutation_choice(
                                "Modify",
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
                        [record_grid(result, highlight, h)]
                    ),
                    controls(
                        [
                            action(
                                "Apply",
                                RecordDemo.ClickedApplyRecordMutation(),
                                to_parent_message,
                                model.mutation_applied,
                                h
                            ),
                            action(
                                "Reset",
                                RecordDemo.ClickedResetRecordMutation(),
                                to_parent_message,
                                !model.mutation_applied,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
        ]
    )
}

const transform_choice = <ParentMessage>(
    transform: RecordDemo.Transform,
    model: RecordDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        transform,
        RecordDemo.SelectedRecordTransform({ transform }),
        to_parent_message,
        model.transform === transform,
        h
    )

const transform_view = <ParentMessage>(
    model: RecordDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = RecordDemo.transform_result(model.transform)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · map values or modify one key",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            transform_choice(
                                "Double",
                                model,
                                to_parent_message,
                                h
                            ),
                            transform_choice(
                                "Label",
                                model,
                                to_parent_message,
                                h
                            ),
                            transform_choice(
                                "BoostAda",
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
                            record_grid(RecordDemo.scores, [], h),
                            h.div(
                                [
                                    h.Class(
                                        "text-center font-mono text-xs text-chart-2"
                                    ),
                                ],
                                [
                                    model.transform === "Double"
                                        ? "Record.map ×2 →"
                                        : model.transform === "Label"
                                          ? "Record.map value+key →"
                                          : 'Record.modify("ada") →',
                                ]
                            ),
                            record_grid(
                                result,
                                model.transform === "BoostAda" ? ["ada"] : [],
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Key-aware transforms",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Record.map receives both the value and key, so you can transform values while preserving the original key set. Record.modify targets one key safely and returns Option.none when that key is absent.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const threshold_action = <ParentMessage>(
    threshold: number,
    model: RecordDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        String(threshold),
        RecordDemo.SelectedRecordThreshold({ threshold }),
        to_parent_message,
        model.threshold === threshold,
        h
    )

const partition_view = <ParentMessage>(
    model: RecordDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const filtered = RecordDemo.filtered(model.threshold)
    const [below, passing] = RecordDemo.partitioned(model.threshold)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · filter",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            h.span(
                                [
                                    h.Class(
                                        "self-center text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                    ),
                                ],
                                ["threshold"]
                            ),
                            threshold_action(60, model, to_parent_message, h),
                            threshold_action(75, model, to_parent_message, h),
                            threshold_action(85, model, to_parent_message, h),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            record_grid(RecordDemo.scores, [], h),
                            h.span(
                                [
                                    h.Class(
                                        "text-center font-mono text-xs text-chart-2"
                                    ),
                                ],
                                [`filter ≥ ${model.threshold} →`]
                            ),
                            record_grid(filtered, R.keys(filtered), h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "partition with Result",
                [
                    h.div(
                        [h.Class("grid gap-4 p-5 md:grid-cols-2")],
                        [
                            h.div(
                                [],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "mb-2 text-[10px] font-semibold tracking-wider text-destructive uppercase"
                                            ),
                                        ],
                                        ["Failure / left"]
                                    ),
                                    record_grid(below, R.keys(below), h),
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
                                        ["Success / right"]
                                    ),
                                    record_grid(passing, R.keys(passing), h),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const fold_choice = <ParentMessage>(
    mode: RecordDemo.FoldMode,
    model: RecordDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        mode,
        RecordDemo.SelectedRecordFoldMode({ mode }),
        to_parent_message,
        model.fold_mode === mode,
        h
    )

const fold_view = <ParentMessage>(
    model: RecordDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const lines = RecordDemo.fold_result(model.fold_mode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · convert and fold",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            fold_choice("Keys", model, to_parent_message, h),
                            fold_choice("Values", model, to_parent_message, h),
                            fold_choice("Entries", model, to_parent_message, h),
                            fold_choice("Collect", model, to_parent_message, h),
                            fold_choice("Reduce", model, to_parent_message, h),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            record_grid(RecordDemo.scores, [], h),
                            h.span(
                                [
                                    h.Class(
                                        "text-center font-mono text-xs text-chart-1"
                                    ),
                                ],
                                [model.fold_mode]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "min-h-36 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
                                    ),
                                ],
                                lines.map((line) =>
                                    h.div(
                                        [
                                            h.Class(
                                                "border-t-(length:--surface-border-width) border-border py-2 font-mono text-xs first:border-t-0"
                                            ),
                                        ],
                                        [line]
                                    )
                                )
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Choose the shape you need",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "keys, values, and toEntries expose common JS collection shapes; collect maps entries directly to an Array; reduce folds the whole Record to one accumulated value.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: RecordDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Lookup"
                ? lookup_view(model, to_parent_message, h)
                : model.stage === "Transform"
                  ? transform_view(model, to_parent_message, h)
                  : model.stage === "Partition"
                    ? partition_view(model, to_parent_message, h)
                    : fold_view(model, to_parent_message, h),
        ]
    )
