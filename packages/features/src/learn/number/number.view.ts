import * as Ui from "@foldkit/ui"
import { Option } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as NumberDemo from "./number.ts"

type ToParentMessage<ParentMessage> = (
    message: NumberDemo.Message
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
    message: NumberDemo.Message,
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
    model: NumberDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Number examples"),
        ],
        NumberDemo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        NumberDemo.SelectedNumberStage({
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

const option_card = <ParentMessage>(
    value: Option.Option<number>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Option.match(value, {
        onNone: () =>
            h.div(
                [
                    h.Class(
                        "rounded-[var(--radius-surface)] border border-warning/40 bg-warning/5 p-5"
                    ),
                ],
                [
                    h.div(
                        [
                            h.Class(
                                "text-[10px] font-semibold tracking-wider text-warning uppercase"
                            ),
                        ],
                        ["None"]
                    ),
                    h.div(
                        [h.Class("mt-3 font-mono text-sm text-warning")],
                        ["Option.none()"]
                    ),
                ]
            ),
        onSome: (number) =>
            h.div(
                [
                    h.Class(
                        "rounded-[var(--radius-surface)] border border-success/40 bg-success/5 p-5"
                    ),
                ],
                [
                    h.div(
                        [
                            h.Class(
                                "text-[10px] font-semibold tracking-wider text-success uppercase"
                            ),
                        ],
                        ["Some"]
                    ),
                    h.div(
                        [h.Class("mt-3 font-mono text-sm text-success")],
                        [
                            Number.isNaN(number)
                                ? "Option.some(NaN)"
                                : number === Infinity
                                  ? "Option.some(Infinity)"
                                  : number === -Infinity
                                    ? "Option.some(-Infinity)"
                                    : `Option.some(${number})`,
                        ]
                    ),
                ]
            ),
    })

const parse_choice = <ParentMessage>(
    preset: NumberDemo.ParsePreset,
    model: NumberDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        preset,
        NumberDemo.SelectedNumberParsePreset({
            parse_preset: preset,
        }),
        to_parent_message,
        model.parse_preset === preset,
        h
    )

const parse_view = <ParentMessage>(
    model: NumberDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const input = NumberDemo.parse_input(model.parse_preset)
    const result = NumberDemo.parse_result(model.parse_preset)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · parse safely",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "Integer",
                                "Decimal",
                                "NaN",
                                "Infinity",
                                "Invalid",
                                "Empty",
                            ] as const
                        ).map((preset) =>
                            parse_choice(preset, model, to_parent_message, h)
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-5"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["String input"]
                                    ),
                                    h.div(
                                        [h.Class("mt-3 font-mono text-lg")],
                                        [JSON.stringify(input)]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-chart-1"
                                    ),
                                ],
                                ["Number.parse →"]
                            ),
                            option_card(result, h),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border bg-background px-5 py-4"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                    ),
                                ],
                                ["Guard"]
                            ),
                            h.div(
                                [h.Class("mt-2 font-mono text-xs")],
                                [
                                    NumberDemo.parse_guard_label(
                                        model.parse_preset
                                    ),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Important parse detail",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            'Number.parse returns Option.none() for invalid or blank numeric text, but the special strings "NaN", "Infinity", and "-Infinity" intentionally decode to Some(number). Number.isNumber is a typeof-style guard, so NaN and Infinity still pass it.',
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const math_choice = <ParentMessage>(
    mode: NumberDemo.MathMode,
    model: NumberDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        mode,
        NumberDemo.SelectedNumberMathMode({
            math_mode: mode,
        }),
        to_parent_message,
        model.math_mode === mode,
        h
    )

const numeric_choice = <ParentMessage>(
    value: number,
    current: number,
    message: NumberDemo.Message,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(String(value), message, to_parent_message, current === value, h)

const math_view = <ParentMessage>(
    model: NumberDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = NumberDemo.math_result(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · arithmetic, including safe division",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "Sum",
                                "Subtract",
                                "Multiply",
                                "Divide",
                                "Remainder",
                                "Round",
                            ] as const
                        ).map((mode) =>
                            math_choice(mode, model, to_parent_message, h)
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-2"
                            ),
                        ],
                        [
                            h.div(
                                [],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Left / value"]
                                    ),
                                    h.div(
                                        [h.Class("flex flex-wrap gap-2")],
                                        [1.567, 6, 12, 20].map((value) =>
                                            numeric_choice(
                                                value,
                                                model.math_left,
                                                NumberDemo.SelectedNumberMathLeft(
                                                    { value }
                                                ),
                                                to_parent_message,
                                                h
                                            )
                                        )
                                    ),
                                ]
                            ),
                            h.div(
                                [],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        [
                                            model.math_mode === "Round"
                                                ? "Precision"
                                                : "Right / divisor",
                                        ]
                                    ),
                                    h.div(
                                        [h.Class("flex flex-wrap gap-2")],
                                        [0, 2, 4, 5].map((value) =>
                                            numeric_choice(
                                                value,
                                                model.math_right,
                                                NumberDemo.SelectedNumberMathRight(
                                                    { value }
                                                ),
                                                to_parent_message,
                                                h
                                            )
                                        )
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                result.is_optional &&
                                    result.output === "Option.none()"
                                    ? "border-t-(length:--surface-border-width) border-border bg-warning/5 px-5 py-4"
                                    : "border-t-(length:--surface-border-width) border-border bg-success/5 px-5 py-4"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "font-mono text-xs text-muted-foreground"
                                    ),
                                ],
                                [result.expression]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        result.is_optional &&
                                            result.output === "Option.none()"
                                            ? "mt-2 font-mono text-2xl font-bold text-warning"
                                            : "mt-2 font-mono text-2xl font-bold text-success"
                                    ),
                                ],
                                [result.output]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Safe vs unsafe division",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Number.divide represents division by zero as Option.none(). If a non-zero divisor is guaranteed and you prefer a plain number, Number.divideUnsafe is available but throws RangeError on zero.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const range_view = <ParentMessage>(
    model: NumberDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = NumberDemo.range_result(model.range_value)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · range and ordering",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [-3, 4, 14].map((value) =>
                            action(
                                String(value),
                                NumberDemo.SelectedNumberRangeValue({
                                    range_value: value as NumberDemo.RangeValue,
                                }),
                                to_parent_message,
                                model.range_value === value,
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
                                [h.Class("relative mx-auto max-w-2xl pt-12")],
                                [
                                    h.div(
                                        [h.Class("h-2 rounded-full bg-muted")],
                                        []
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "absolute left-[20%] right-[20%] top-12 h-2 rounded-full bg-chart-2/40"
                                            ),
                                        ],
                                        []
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "absolute left-[20%] top-7 -translate-x-1/2 font-mono text-xs text-muted-foreground"
                                            ),
                                        ],
                                        ["0"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "absolute right-[20%] top-7 translate-x-1/2 font-mono text-xs text-muted-foreground"
                                            ),
                                        ],
                                        ["10"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                model.range_value < 0
                                                    ? "absolute left-[4%] top-[38px] size-5 rounded-full border-2 border-destructive bg-background"
                                                    : model.range_value > 10
                                                      ? "absolute right-[4%] top-[38px] size-5 rounded-full border-2 border-destructive bg-background"
                                                      : model.range_value === 4
                                                        ? "absolute left-[44%] top-[38px] size-5 rounded-full border-2 border-success bg-background"
                                                        : "absolute left-[20%] top-[38px] size-5 rounded-full border-2 border-success bg-background"
                                            ),
                                        ],
                                        []
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "mt-12 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
                                    ),
                                ],
                                [
                                    stat_card(
                                        "between 0..10",
                                        String(result.between),
                                        h
                                    ),
                                    stat_card(
                                        "clamp 0..10",
                                        String(result.clamped),
                                        h
                                    ),
                                    stat_card("sign", String(result.sign), h),
                                    stat_card(
                                        "Order(value, 5)",
                                        String(result.compared_to_five),
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
                "One Order powers several helpers",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Number.Order is the standard numeric Order. Helpers such as between, clamp, min, max, and the comparison predicates build the same ordering semantics into pipe-friendly functions.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const stat_card = <ParentMessage>(
    label: string,
    value: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
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
                        "text-[9px] font-semibold tracking-wider text-muted-foreground uppercase"
                    ),
                ],
                [label]
            ),
            h.div(
                [h.Class("mt-2 font-mono text-lg font-semibold text-chart-2")],
                [value]
            ),
        ]
    )

const aggregate_choice = <ParentMessage>(
    mode: NumberDemo.AggregateMode,
    model: NumberDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        mode,
        NumberDemo.SelectedNumberAggregateMode({
            aggregate_mode: mode,
        }),
        to_parent_message,
        model.aggregate_mode === mode,
        h
    )

const aggregate_view = <ParentMessage>(
    model: NumberDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = NumberDemo.aggregate_result(model.aggregate_mode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · aggregate with reducers",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "Sum",
                                "Multiply",
                                "Min",
                                "Max",
                                "NextPow2",
                            ] as const
                        ).map((mode) =>
                            aggregate_choice(mode, model, to_parent_message, h)
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
                                        "mb-5 flex flex-wrap justify-center gap-2"
                                    ),
                                ],
                                NumberDemo.aggregate_values.map((value) =>
                                    h.div(
                                        [
                                            h.Class(
                                                "grid size-12 place-items-center rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background font-mono text-sm"
                                            ),
                                        ],
                                        [String(value)]
                                    )
                                )
                            ),
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
                                                "font-mono text-xs text-muted-foreground"
                                            ),
                                        ],
                                        [result.expression]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-3 font-mono text-3xl font-bold text-chart-1"
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
                "Direct helpers vs Reducers",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "For a plain iterable, sumAll and multiplyAll are direct conveniences. ReducerSum, ReducerMultiply, ReducerMin, and ReducerMax are reusable instances for APIs that consume a Reducer — including the Tuple reducer demo from the previous lesson.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: NumberDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Parse"
                ? parse_view(model, to_parent_message, h)
                : model.stage === "Math"
                  ? math_view(model, to_parent_message, h)
                  : model.stage === "Range"
                    ? range_view(model, to_parent_message, h)
                    : aggregate_view(model, to_parent_message, h),
        ]
    )
