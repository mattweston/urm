import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Demo from "./boolean.ts"

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
            h.AriaLabel("Effect Boolean examples"),
        ],
        Demo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        Demo.Message.SelectedBooleanStage({ stage })
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

const result_card = <ParentMessage>(
    label: string,
    value: string,
    tone: "cyan" | "green" | "amber" | "violet",
    h: HtmlBuilder<ParentMessage>
): Html => {
    const classes =
        tone === "green"
            ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-600"
            : tone === "amber"
              ? "border-amber-500/40 bg-amber-500/5 text-amber-600"
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

const coerce_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = Demo.coerceResult(model.coerceCase)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · truthiness coercion vs boolean guard",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "True",
                                "False",
                                "One",
                                "Zero",
                                "FalseString",
                                "EmptyString",
                            ] as const
                        ).map((coerceCase) =>
                            action(
                                coerceCase,
                                Demo.Message.SelectedBooleanCoerceCase({
                                    coerceCase,
                                }),
                                to_parent_message,
                                model.coerceCase === coerceCase,
                                h
                            )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr]"
                            ),
                        ],
                        [
                            result_card(
                                "input",
                                Demo.coerceInputLabel(model.coerceCase),
                                "cyan",
                                h
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["two different questions →"]
                            ),
                            h.div(
                                [h.Class("grid gap-3 sm:grid-cols-2")],
                                [
                                    result_card(
                                        "Boolean.Boolean(input)",
                                        String(result.coerced),
                                        result.coerced ? "green" : "amber",
                                        h
                                    ),
                                    result_card(
                                        "Boolean.isBoolean(input)",
                                        String(result.guard),
                                        result.guard ? "green" : "amber",
                                        h
                                    ),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                'The string "false" is truthy',
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

const logic_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = Demo.logicResult(
        model.logicMode,
        model.logicLeft,
        model.logicRight
    )
    const table = Demo.truthTable(model.logicMode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · boolean algebra",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "And",
                                "Nand",
                                "Or",
                                "Nor",
                                "Xor",
                                "Eqv",
                                "Implies",
                            ] as const
                        ).map((logicMode) =>
                            action(
                                logicMode,
                                Demo.Message.SelectedBooleanLogicMode({
                                    logicMode,
                                }),
                                to_parent_message,
                                model.logicMode === logicMode,
                                h
                            )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr]"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    action(
                                        `left: ${String(model.logicLeft)}`,
                                        Demo.Message.ToggledBooleanLogicLeft(),
                                        to_parent_message,
                                        false,
                                        h
                                    ),
                                    action(
                                        `right: ${String(model.logicRight)}`,
                                        Demo.Message.ToggledBooleanLogicRight(),
                                        to_parent_message,
                                        false,
                                        h
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center text-muted-foreground"
                                    ),
                                ],
                                ["→"]
                            ),
                            result_card(
                                result.expression,
                                String(result.output),
                                result.output ? "green" : "amber",
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
                                [h.Class("mb-3 text-xs text-muted-foreground")],
                                [result.rule]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "grid grid-cols-3 bg-muted/30 px-3 py-2 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["left", "right", "result"]
                                    ),
                                    ...table.map(([left, right, output]) =>
                                        h.div(
                                            [
                                                h.Class(
                                                    "grid grid-cols-3 border-t-(length:--surface-border-width) border-border px-3 py-2 font-mono text-xs"
                                                ),
                                            ],
                                            [
                                                String(left),
                                                String(right),
                                                String(output),
                                            ]
                                        )
                                    ),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Dual call style",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "The binary combinators are dual: `Boolean.and(a, b)` and `pipe(a, Boolean.and(b))` use the same operation. `not` is unary.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const match_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const comparison = Demo.orderResult(model.matchValue, model.orderOther)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · lazy match + reusable instances",
                [
                    h.div(
                        [h.Class("grid gap-4 p-5 md:grid-cols-3")],
                        [
                            h.div(
                                [h.Class("space-y-3")],
                                [
                                    action(
                                        `value: ${String(model.matchValue)}`,
                                        Demo.Message.ToggledBooleanMatchValue(),
                                        to_parent_message,
                                        false,
                                        h
                                    ),
                                    result_card(
                                        "Boolean.match",
                                        Demo.matchResult(model.matchValue),
                                        "green",
                                        h
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("space-y-3")],
                                [
                                    action(
                                        `other: ${String(model.orderOther)}`,
                                        Demo.Message.ToggledBooleanOrderOther(),
                                        to_parent_message,
                                        false,
                                        h
                                    ),
                                    result_card(
                                        "Boolean.Order(value, other)",
                                        String(comparison.order),
                                        "violet",
                                        h
                                    ),
                                ]
                            ),
                            result_card(
                                "Boolean.Equivalence(value, other)",
                                String(comparison.equivalent),
                                comparison.equivalent ? "green" : "amber",
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "false sorts before true",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "`Boolean.Order` is the standard boolean Order where false < true. `Boolean.Equivalence` uses strict boolean equality. `Boolean.match` evaluates only the selected lazy branch.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const aggregate_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const values = Demo.aggregateValues(model.aggregatePreset)
    const result = Demo.aggregateResult(
        model.aggregateMode,
        model.aggregatePreset
    )

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · iterable predicates vs Reducers",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            ["AllTrue", "Mixed", "AllFalse", "Empty"] as const
                        ).map((aggregatePreset) =>
                            action(
                                aggregatePreset,
                                Demo.Message.SelectedBooleanAggregatePreset({
                                    aggregatePreset,
                                }),
                                to_parent_message,
                                model.aggregatePreset === aggregatePreset,
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
                        (
                            [
                                "Every",
                                "Some",
                                "ReducerAnd",
                                "ReducerOr",
                            ] as const
                        ).map((aggregateMode) =>
                            action(
                                aggregateMode,
                                Demo.Message.SelectedBooleanAggregateMode({
                                    aggregateMode,
                                }),
                                to_parent_message,
                                model.aggregateMode === aggregateMode,
                                h
                            )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr]"
                            ),
                        ],
                        [
                            result_card(
                                "values",
                                JSON.stringify(values),
                                "cyan",
                                h
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center text-muted-foreground"
                                    ),
                                ],
                                ["→"]
                            ),
                            h.div(
                                [h.Class("grid gap-3 sm:grid-cols-2")],
                                [
                                    result_card(
                                        "result",
                                        String(result.output),
                                        result.output ? "green" : "amber",
                                        h
                                    ),
                                    result_card(
                                        "values visited",
                                        `${result.visited} / ${values.length}`,
                                        result.visited < values.length
                                            ? "green"
                                            : "violet",
                                        h
                                    ),
                                ]
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
                "Short-circuit is the important difference",
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
            model.stage === "Coerce"
                ? coerce_view(model, to_parent_message, h)
                : model.stage === "Logic"
                  ? logic_view(model, to_parent_message, h)
                  : model.stage === "Match"
                    ? match_view(model, to_parent_message, h)
                    : aggregate_view(model, to_parent_message, h),
        ]
    )
