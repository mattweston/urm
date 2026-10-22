import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Demo from "./byte-size.ts"

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
                Demo.Message.SelectedByteSizeStage({
                    stage,
                }),
                toParent,
                model.stage === stage,
                h
            )
        )
    )

const result = <ParentMessage>(
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
                            card("expression / input", expression, "violet", h),
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
                "Rule",
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

const parseView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const x = Demo.parseResult(model.parseCase)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · external strings → exact integral bytes",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "Decimal",
                                "Binary",
                                "FractionalByte",
                                "LongName",
                                "InvalidUnit",
                            ] as const
                        ).map((parseCase) =>
                            action(
                                parseCase,
                                Demo.Message.SelectedByteSizeParseCase({
                                    parseCase,
                                }),
                                toParent,
                                model.parseCase === parseCase,
                                h
                            )
                        )
                    ),
                ],
                h
            ),
            result(
                JSON.stringify(x.input),
                x.output,
                x.detail,
                x.output.includes("none") ? "amber" : "green",
                h
            ),
            panel(
                "Safe vs unsafe",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "`fromString` / `fromInput` return Option. Their `Unsafe` counterparts throw for invalid syntax, negative values, unsupported units, or quantities that cannot resolve to an integral byte count.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const unitsView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const x = Demo.unitResult(model.unitCase)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · SI decimal vs IEC binary",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "MBvsMiB",
                                "GBvsGiB",
                                "Constructors",
                                "ToUnit",
                            ] as const
                        ).map((unitCase) =>
                            action(
                                unitCase,
                                Demo.Message.SelectedByteSizeUnitCase({
                                    unitCase,
                                }),
                                toParent,
                                model.unitCase === unitCase,
                                h
                            )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-2"
                            ),
                        ],
                        [
                            card("decimal / first", x.left, "cyan", h),
                            card("binary / second", x.right, "green", h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Units are not aliases",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [x.detail]
                    ),
                ],
                h
            ),
        ]
    )
}

const mathView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const x = Demo.mathResult(model.mathMode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · non-negative exact byte arithmetic",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "Sum",
                                "Subtract",
                                "Underflow",
                                "Times",
                                "Divide",
                                "InvalidScalar",
                            ] as const
                        ).map((mathMode) =>
                            action(
                                mathMode,
                                Demo.Message.SelectedByteSizeMathMode({
                                    mathMode,
                                }),
                                toParent,
                                model.mathMode === mathMode,
                                h
                            )
                        )
                    ),
                ],
                h
            ),
            result(
                x.expression,
                x.output,
                x.detail,
                x.output.includes("none") ? "amber" : "green",
                h
            ),
        ]
    )
}

const formatView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const x = Demo.formatResult(model.formatMode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · format, compare, aggregate",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "AutoDecimal",
                                "AutoBinary",
                                "FixedUnit",
                                "Precision",
                                "Compare",
                                "Aggregate",
                            ] as const
                        ).map((formatMode) =>
                            action(
                                formatMode,
                                Demo.Message.SelectedByteSizeFormatMode({
                                    formatMode,
                                }),
                                toParent,
                                model.formatMode === formatMode,
                                h
                            )
                        )
                    ),
                ],
                h
            ),
            result(x.expression, x.output, x.detail, "green", h),
            panel(
                "Exact storage, approximate display boundary",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "`toBigInt` is the exact underlying byte count. `toNumber` is safe-integer checked. `toUnit` intentionally returns an approximate Number for unit-oriented display/interoperability.",
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
            model.stage === "Parse"
                ? parseView(model, toParent, h)
                : model.stage === "Units"
                  ? unitsView(model, toParent, h)
                  : model.stage === "Math"
                    ? mathView(model, toParent, h)
                    : formatView(model, toParent, h),
        ]
    )
