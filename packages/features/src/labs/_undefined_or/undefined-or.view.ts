import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Demo from "./undefined-or.ts"

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
            h.AriaLabel("Effect UndefinedOr examples"),
        ],
        Demo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        Demo.Message.SelectedUndefinedOrStage({
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

const presence_controls = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("flex flex-wrap gap-2 p-4")],
        (["Defined", "Undefined"] as const).map((presence) =>
            action(
                presence === "Defined" ? "value = 4" : "value = undefined",
                Demo.Message.SelectedUndefinedOrPresence({
                    presence,
                }),
                to_parent_message,
                model.presence === presence,
                h
            )
        )
    )

const map_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = Demo.mapResult(model.presence)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · map only defined values",
                [
                    presence_controls(model, to_parent_message, h),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr]"
                            ),
                        ],
                        [
                            result_card(
                                "input",
                                Demo.valueLabel(result.input),
                                result.input === undefined ? "amber" : "cyan",
                                h
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["map(n => n * 2) →"]
                            ),
                            result_card(
                                "output",
                                Demo.valueLabel(result.output),
                                result.output === undefined ? "amber" : "green",
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
                "No wrapper is introduced",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "The representation remains A | undefined. Defined values are transformed; undefined passes through unchanged.",
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
    const matched = Demo.matchResult(model.presence)
    const getters = Demo.getterResults(model.presence)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · handle both branches",
                [
                    presence_controls(model, to_parent_message, h),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-3"
                            ),
                        ],
                        [
                            result_card(
                                "UndefinedOr.match",
                                matched.output,
                                "green",
                                h
                            ),
                            result_card(
                                "getOrThrow",
                                getters.defaultGetter,
                                getters.defaultGetter.startsWith("threw")
                                    ? "amber"
                                    : "green",
                                h
                            ),
                            result_card(
                                "getOrThrowWith",
                                getters.customGetter,
                                getters.customGetter.startsWith("threw")
                                    ? "amber"
                                    : "green",
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "match for expected absence; throw for invariants",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "match converts A | undefined into a concrete result by handling both cases. getOrThrow and getOrThrowWith are fail-fast escape hatches when undefined means a broken assumption.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const throwable_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = Demo.throwableResult(model.throwableInput)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · convert exceptions to undefined",
                [
                    h.div(
                        [h.Class("p-5")],
                        [
                            h.label(
                                [h.Class("block space-y-2")],
                                [
                                    h.span(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["JSON input"]
                                    ),
                                    h.textarea([
                                        h.Class(
                                            "min-h-[112px] w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 font-mono outline-none"
                                        ),
                                        h.Value(model.throwableInput),
                                        h.OnInput((value) =>
                                            to_parent_message(
                                                Demo.Message.UpdatedUndefinedOrThrowableInput(
                                                    { value }
                                                )
                                            )
                                        ),
                                    ]),
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr]"
                            ),
                        ],
                        [
                            result_card(
                                "throwing parser",
                                "JSON.parse + number check",
                                "cyan",
                                h
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["liftThrowable →"]
                            ),
                            result_card(
                                "number | undefined",
                                Demo.valueLabel(result.output),
                                result.output === undefined ? "amber" : "green",
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Thrown errors are deliberately discarded",
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

const reduce_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = Demo.reducerResults(model)

    const toggle = (
        label: string,
        enabled: boolean,
        message: Demo.Message
    ): Html =>
        action(
            `${label}: ${enabled ? "defined" : "undefined"}`,
            message,
            to_parent_message,
            false,
            h
        )

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · tolerant vs fail-fast aggregation",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            toggle(
                                "1",
                                model.hasFirst,
                                Demo.Message.ToggledUndefinedOrFirst()
                            ),
                            toggle(
                                "2",
                                model.hasSecond,
                                Demo.Message.ToggledUndefinedOrSecond()
                            ),
                            toggle(
                                "3",
                                model.hasThird,
                                Demo.Message.ToggledUndefinedOrThird()
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-2"
                            ),
                        ],
                        [
                            result_card(
                                "values",
                                `[${result.values.map(Demo.valueLabel).join(", ")}]`,
                                "cyan",
                                h
                            ),
                            result_card(
                                "makeReducer(Sum).combineAll",
                                Demo.valueLabel(result.keepDefined),
                                result.keepDefined === undefined
                                    ? "amber"
                                    : "green",
                                h
                            ),
                            result_card(
                                "makeReducerFailFast(SumReducer).combineAll",
                                Demo.valueLabel(result.failFastReducer),
                                result.failFastReducer === undefined
                                    ? "amber"
                                    : "green",
                                h
                            ),
                            result_card(
                                "makeCombinerFailFast(Sum).combine(first, second)",
                                Demo.valueLabel(result.failFastCombiner),
                                result.failFastCombiner === undefined
                                    ? "amber"
                                    : "violet",
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Choose the missing-value policy",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "makeReducer treats undefined like a missing contribution and keeps defined values. The fail-fast constructors make any undefined operand poison the result; makeReducerFailFast also short-circuits combineAll once that happens.",
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
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Map"
                ? map_view(model, to_parent_message, h)
                : model.stage === "Match"
                  ? match_view(model, to_parent_message, h)
                  : model.stage === "Throwable"
                    ? throwable_view(model, to_parent_message, h)
                    : reduce_view(model, to_parent_message, h),
        ]
    )
