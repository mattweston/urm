import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Demo from "./combiner.ts"

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
                Demo.Message.SelectedCombinerStage({ stage }),
                toParent,
                model.stage === stage,
                h
            )
        )
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
            h.pre(
                [
                    h.Class(
                        "mt-2 overflow-auto whitespace-pre-wrap font-mono text-xs font-semibold leading-5"
                    ),
                ],
                [value]
            ),
        ]
    )
}

const binaryResult = <ParentMessage>(
    expression: string,
    left: string,
    right: string,
    output: string,
    detail: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "Combine two values",
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 p-5 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center"
                            ),
                        ],
                        [
                            card("self", left, "cyan", h),
                            h.div(
                                [
                                    h.Class(
                                        "text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["combine"]
                            ),
                            card("that", right, "amber", h),
                            h.div(
                                [h.Class("text-center text-muted-foreground")],
                                ["→"]
                            ),
                            card("result", output, "green", h),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border p-5"
                            ),
                        ],
                        [card("expression", expression, "violet", h)]
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

const makeView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const x = Demo.makeResult(model.makeMode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · define A × A → A once",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["Sum", "Product", "Merge"] as const).map((makeMode) =>
                            action(
                                makeMode,
                                Demo.Message.SelectedCombinerMakeMode({
                                    makeMode,
                                }),
                                toParent,
                                model.makeMode === makeMode,
                                h
                            )
                        )
                    ),
                ],
                h
            ),
            binaryResult(x.expression, x.left, x.right, x.output, x.detail, h),
        ]
    )
}

const pickView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const x = Demo.pickResult(model.pickMode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · built-in selection strategies",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            ["Min", "Max", "First", "Last", "Constant"] as const
                        ).map((pickMode) =>
                            action(
                                pickMode,
                                Demo.Message.SelectedCombinerPickMode({
                                    pickMode,
                                }),
                                toParent,
                                model.pickMode === pickMode,
                                h
                            )
                        )
                    ),
                ],
                h
            ),
            binaryResult(x.expression, x.left, x.right, x.output, x.detail, h),
        ]
    )
}

const transformView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const x = Demo.transformResult(model.transformMode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · transform an existing Combiner",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "Flip",
                                "IntercalateComma",
                                "IntercalatePath",
                            ] as const
                        ).map((transformMode) =>
                            action(
                                transformMode,
                                Demo.Message.SelectedCombinerTransformMode({
                                    transformMode,
                                }),
                                toParent,
                                model.transformMode === transformMode,
                                h
                            )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-3 border-t-(length:--surface-border-width) border-border p-5 sm:grid-cols-2"
                            ),
                        ],
                        [
                            card("base", x.base, "cyan", h),
                            card("wrapper", x.expression, "violet", h),
                        ]
                    ),
                ],
                h
            ),
            binaryResult(x.expression, x.left, x.right, x.output, x.detail, h),
        ]
    )
}

const reducerView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const x = Demo.reducerResult(model.reducerMode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · Combiner vs Reducer",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["Pair", "Empty", "NonEmpty", "Derive"] as const).map(
                            (reducerMode) =>
                                action(
                                    reducerMode,
                                    Demo.Message.SelectedCombinerReducerMode({
                                        reducerMode,
                                    }),
                                    toParent,
                                    model.reducerMode === reducerMode,
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
                            card("Combiner", x.combiner, "cyan", h),
                            card("Reducer", x.reducer, "violet", h),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border p-5"
                            ),
                        ],
                        [card("result", x.output, "green", h)]
                    ),
                ],
                h
            ),
            panel(
                "Reducer adds an identity",
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
            panel(
                "Type relationship",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [
                            `interface Combiner<A> {
  readonly combine:
    (self: A, that: A) => A
}

interface Reducer<A>
  extends Combiner<A> {
  readonly initialValue: A

  readonly combineAll:
    (values: Iterable<A>) => A
}`,
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
            model.stage === "Make"
                ? makeView(model, toParent, h)
                : model.stage === "Pick"
                  ? pickView(model, toParent, h)
                  : model.stage === "Transform"
                    ? transformView(model, toParent, h)
                    : reducerView(model, toParent, h),
        ]
    )
