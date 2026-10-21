import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Demo from "./big-int.ts"

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
    toParent: ToParentMessage<ParentMessage>,
    active: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: toParent(message),
            isDisabled: active,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-40"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const card = <ParentMessage>(
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

const tabs = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
        ],
        Demo.stages.map((stage) =>
            action(
                stage,
                Demo.Message.SelectedBigIntStage({
                    stage,
                }),
                toParent,
                model.stage === stage,
                h
            )
        )
    )

const resultPanel = <ParentMessage>(
    expression: string,
    output: string,
    detail: string,
    outputTone: "green" | "amber",
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "Result",
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 p-5 md:grid-cols-[1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            card("expression", expression, "violet", h),
                            h.div(
                                [h.Class("text-center text-muted-foreground")],
                                ["→"]
                            ),
                            card("output", output, outputTone, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Why it matters",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [detail]
                    ),
                ],
                h
            ),
        ]
    )

const convertView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = Demo.convertResult(model.convertCase)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · safe conversion boundaries",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "HugeString",
                                "Whitespace",
                                "InvalidDecimal",
                                "SafeNumber",
                                "UnsafeNumber",
                                "HugeToNumber",
                            ] as const
                        ).map((mode) =>
                            action(
                                mode,
                                Demo.Message.SelectedBigIntConvertCase({
                                    convertCase: mode,
                                }),
                                toParent,
                                model.convertCase === mode,
                                h
                            )
                        )
                    ),
                ],
                h
            ),
            resultPanel(
                result.expression,
                result.output,
                result.detail,
                result.output.includes("none") ? "amber" : "green",
                h
            ),
        ]
    )
}

const arithmeticView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = Demo.arithmeticResult(model.arithmeticMode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · exact integer arithmetic",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "Sum",
                                "Multiply",
                                "Subtract",
                                "Divide",
                                "DivideZero",
                                "Remainder",
                            ] as const
                        ).map((mode) =>
                            action(
                                mode,
                                Demo.Message.SelectedBigIntArithmeticMode({
                                    arithmeticMode: mode,
                                }),
                                toParent,
                                model.arithmeticMode === mode,
                                h
                            )
                        )
                    ),
                ],
                h
            ),
            resultPanel(
                result.expression,
                result.output,
                result.detail,
                result.output.includes("none") ? "amber" : "green",
                h
            ),
            panel(
                "BigInt is integer-only",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Division truncates toward zero. If you need 17 ÷ 5 = 3.4, use BigDecimal rather than BigInt.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const integerMathView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = Demo.integerMathResult(model.integerMathMode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · integer number theory + ranges",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "Gcd",
                                "Lcm",
                                "Sqrt",
                                "SqrtFloor",
                                "SqrtNegative",
                                "Range",
                            ] as const
                        ).map((mode) =>
                            action(
                                mode,
                                Demo.Message.SelectedBigIntIntegerMathMode({
                                    integerMathMode: mode,
                                }),
                                toParent,
                                model.integerMathMode === mode,
                                h
                            )
                        )
                    ),
                ],
                h
            ),
            resultPanel(
                result.expression,
                result.output,
                result.detail,
                result.output.includes("none") ? "amber" : "green",
                h
            ),
        ]
    )
}

const aggregateView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = Demo.aggregateResult(model.aggregateMode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · aggregate functions and algebra instances",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "SumAll",
                                "MultiplyAll",
                                "ReducerSum",
                                "ReducerMultiply",
                                "CombinerMax",
                                "CombinerMin",
                            ] as const
                        ).map((mode) =>
                            action(
                                mode,
                                Demo.Message.SelectedBigIntAggregateMode({
                                    aggregateMode: mode,
                                }),
                                toParent,
                                model.aggregateMode === mode,
                                h
                            )
                        )
                    ),
                ],
                h
            ),
            resultPanel(
                result.expression,
                result.output,
                result.detail,
                "green",
                h
            ),
            panel(
                "Reusable instances",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "`ReducerSum` / `ReducerMultiply` are for generic APIs consuming a Reducer. `CombinerMax` / `CombinerMin` are for APIs that need a non-empty pairwise Combiner. `BigInt.Order` and `BigInt.Equivalence` are available for comparison-oriented APIs.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            tabs(model, toParent, h),
            model.stage === "Convert"
                ? convertView(model, toParent, h)
                : model.stage === "Arithmetic"
                  ? arithmeticView(model, toParent, h)
                  : model.stage === "IntegerMath"
                    ? integerMathView(model, toParent, h)
                    : aggregateView(model, toParent, h),
        ]
    )
