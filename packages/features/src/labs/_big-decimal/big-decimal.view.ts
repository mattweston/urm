import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Demo from "./big-decimal.ts"

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
            h.AriaLabel("Effect BigDecimal examples"),
        ],
        Demo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        Demo.Message.SelectedBigDecimalStage({ stage })
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

const parse_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = Demo.parseResult(model.parseCase)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · parse text into bigint + scale",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "Decimal",
                                "TrailingZeros",
                                "Exponent",
                                "Empty",
                                "Invalid",
                            ] as const
                        ).map((parseCase) =>
                            action(
                                parseCase,
                                Demo.Message.SelectedBigDecimalParseCase({
                                    parseCase,
                                }),
                                to_parent_message,
                                model.parseCase === parseCase,
                                h
                            )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 lg:grid-cols-[0.8fr_auto_1.2fr]"
                            ),
                        ],
                        [
                            result_card(
                                "input",
                                JSON.stringify(result.input),
                                "cyan",
                                h
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["fromString →"]
                            ),
                            result_card(
                                "safe parse",
                                result.option,
                                result.option.includes("none")
                                    ? "amber"
                                    : "green",
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-3 border-t-(length:--surface-border-width) border-border p-5 sm:grid-cols-3"
                            ),
                        ],
                        [
                            result_card(
                                "unscaled value",
                                result.value,
                                "violet",
                                h
                            ),
                            result_card("scale", result.scale, "cyan", h),
                            result_card(
                                "normalized",
                                result.normalized,
                                "green",
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Storage is decimal, not binary floating point",
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

const arithmetic_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = Demo.arithmeticResult(model.arithmeticMode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · arbitrary-precision decimal arithmetic",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "ExactSum",
                                "Sum",
                                "Multiply",
                                "Divide",
                                "DivideZero",
                                "Remainder",
                            ] as const
                        ).map((arithmeticMode) =>
                            action(
                                arithmeticMode,
                                Demo.Message.SelectedBigDecimalArithmeticMode({
                                    arithmeticMode,
                                }),
                                to_parent_message,
                                model.arithmeticMode === arithmeticMode,
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
                                "expression",
                                result.expression,
                                "violet",
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
                            result_card(
                                "output",
                                result.output,
                                result.output.includes("none")
                                    ? "amber"
                                    : "green",
                                h
                            ),
                        ]
                    ),
                    result.secondary === undefined
                        ? h.empty
                        : h.div(
                              [
                                  h.Class(
                                      "border-t-(length:--surface-border-width) border-border p-5"
                                  ),
                              ],
                              [
                                  result_card(
                                      "binary floating-point comparison",
                                      result.secondary,
                                      "amber",
                                      h
                                  ),
                              ]
                          ),
                ],
                h
            ),
            panel(
                "Safe division uses Option",
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

const round_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = Demo.roundResult(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · scale and rounding are explicit",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["2.5", "-2.5", "145", "-145"] as const).map(
                            (roundInput) =>
                                action(
                                    roundInput,
                                    Demo.Message.SelectedBigDecimalRoundInput({
                                        roundInput,
                                    }),
                                    to_parent_message,
                                    model.roundInput === roundInput,
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
                                "half-from-zero",
                                "half-even",
                                "half-odd",
                                "ceil",
                                "floor",
                                "to-zero",
                                "from-zero",
                            ] as const
                        ).map((roundMode) =>
                            action(
                                roundMode,
                                Demo.Message.SelectedBigDecimalRoundMode({
                                    roundMode,
                                }),
                                to_parent_message,
                                model.roundMode === roundMode,
                                h
                            )
                        )
                    ),
                    controls(
                        [
                            action(
                                "scale 0",
                                Demo.Message.SelectedBigDecimalRoundScale({
                                    roundScale: 0,
                                }),
                                to_parent_message,
                                model.roundScale === 0,
                                h
                            ),
                            action(
                                "scale -1",
                                Demo.Message.SelectedBigDecimalRoundScale({
                                    roundScale: -1,
                                }),
                                to_parent_message,
                                model.roundScale === -1,
                                h
                            ),
                        ],
                        h
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr]"
                            ),
                        ],
                        [
                            result_card("before", result.before, "cyan", h),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                [`${model.roundMode} @ ${model.roundScale} →`]
                            ),
                            result_card("after", result.after, "green", h),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-4 font-mono text-xs text-muted-foreground"
                            ),
                        ],
                        [result.storage]
                    ),
                ],
                h
            ),
            panel(
                "Round vs scale",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [result.detail]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-px border-t-(length:--surface-border-width) border-border bg-border sm:grid-cols-2"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("bg-card p-4")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-xs font-semibold text-cyan-500"
                                            ),
                                        ],
                                        ["scale(123.45, 4)"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-2 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        [Demo.scaleExample("123.45", 4)]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("bg-card p-4")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-xs font-semibold text-violet-500"
                                            ),
                                        ],
                                        ["scale(123.45, 1)"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-2 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        [Demo.scaleExample("123.45", 1)]
                                    ),
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

const compare_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = Demo.compareResult(model.compareMode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · compare, constrain, and cross boundaries",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "Equals",
                                "Order",
                                "Clamp",
                                "Format",
                                "Predicates",
                            ] as const
                        ).map((compareMode) =>
                            action(
                                compareMode,
                                Demo.Message.SelectedBigDecimalCompareMode({
                                    compareMode,
                                }),
                                to_parent_message,
                                model.compareMode === compareMode,
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
                                "expression",
                                result.expression,
                                "violet",
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
                            result_card("output", result.output, "green", h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Prefer decimal text until number interop is required",
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
            model.stage === "Parse"
                ? parse_view(model, to_parent_message, h)
                : model.stage === "Arithmetic"
                  ? arithmetic_view(model, to_parent_message, h)
                  : model.stage === "Round"
                    ? round_view(model, to_parent_message, h)
                    : compare_view(model, to_parent_message, h),
        ]
    )
