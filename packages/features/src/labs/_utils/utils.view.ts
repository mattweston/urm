import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Demo from "./utils.ts"

type ToParentMessage<ParentMessage> = (message: Demo.Message) => ParentMessage

type ButtonAttribute<ParentMessage> =
    Parameters<HtmlBuilder<ParentMessage>["button"]>[0] extends ReadonlyArray<
        infer Attribute
    >
        ? Attribute
        : never

type ButtonViewAttributes<ParentMessage> = Readonly<{
    button: ReadonlyArray<ButtonAttribute<ParentMessage>>
}>

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

const metric = <ParentMessage>(
    label: string,
    value: string,
    tone: "default" | "cyan" | "green" | "amber" | "violet",
    h: HtmlBuilder<ParentMessage>
): Html => {
    const toneClass =
        tone === "cyan"
            ? "border-cyan-500/30 bg-cyan-500/5 text-cyan-700"
            : tone === "green"
              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700"
              : tone === "amber"
                ? "border-amber-500/30 bg-amber-500/5 text-amber-700"
                : tone === "violet"
                  ? "border-violet-500/30 bg-violet-500/5 text-violet-700"
                  : "border-border bg-background/70"

    return h.div(
        [
            h.Class(
                `min-w-0 rounded-[var(--radius-surface)] border p-4 ${toneClass}`
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "text-[9px] font-semibold tracking-widest text-muted-foreground uppercase"
                    ),
                ],
                [label]
            ),
            h.div(
                [
                    h.Class(
                        "mt-2 whitespace-pre-wrap break-words font-mono text-xs font-semibold leading-5"
                    ),
                ],
                [value]
            ),
        ]
    )
}

const choice = <ParentMessage>(
    label: string,
    active: boolean,
    message: Demo.Message,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(message),
            isDisabled: active,
            toView: (attributes: ButtonViewAttributes<ParentMessage>) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            active
                                ? "rounded-[var(--radius-surface)] border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 font-mono text-xs font-semibold text-cyan-700"
                                : "rounded-[var(--radius-surface)] border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
                "grid grid-cols-3 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2"
            ),
            h.AriaLabel("Effect Utils examples"),
        ],
        Demo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        Demo.Message.SelectedUtilsStage({ stage })
                    ),
                    isDisabled: model.stage === stage,
                    toView: (attributes: ButtonViewAttributes<ParentMessage>) =>
                        h.button(
                            [
                                ...attributes.button,
                                h.Class(
                                    model.stage === stage
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

const single_shot_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const trace = Demo.singleShotTrace(model.singleValue, model.returnValue)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · SingleShotGen yields once",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["hello", "effect", "yield*"] as const).map(
                                    (singleValue) =>
                                        choice(
                                            JSON.stringify(singleValue),
                                            model.singleValue === singleValue,
                                            Demo.Message.SelectedUtilsSingleValue(
                                                {
                                                    singleValue,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                ([7, 42, 99] as const).map((returnValue) =>
                                    choice(
                                        `return ${returnValue}`,
                                        model.returnValue === returnValue,
                                        Demo.Message.SelectedUtilsReturnValue({
                                            returnValue,
                                        }),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-3 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-2"
                            ),
                        ],
                        [
                            metric("first next(0)", trace.first, "cyan", h),
                            metric(
                                `second next(${model.returnValue})`,
                                trace.second,
                                "green",
                                h
                            ),
                            metric(
                                `third next(${model.returnValue + 1})`,
                                trace.third,
                                "amber",
                                h
                            ),
                            metric(
                                "iterator[Symbol.iterator]().next(0)",
                                trace.fresh,
                                "violet",
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "The protocol seam behind yield*",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "The first next() yields the wrapped Effect-style value. The next value sent into the iterator becomes the generator expression's result. Calling [Symbol.iterator]() creates a fresh SingleShotGen, so an outer value can participate in generator syntax repeatedly.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const gen_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = Demo.genResultLabel(model.genKind, model.genFails)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · Gen types a generator API",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            choice(
                                "Option",
                                model.genKind === "Option",
                                Demo.Message.SelectedUtilsGenKind({
                                    genKind: "Option",
                                }),
                                to_parent_message,
                                h
                            ),
                            choice(
                                "Result",
                                model.genKind === "Result",
                                Demo.Message.SelectedUtilsGenKind({
                                    genKind: "Result",
                                }),
                                to_parent_message,
                                h
                            ),
                            choice(
                                model.genFails
                                    ? "failure branch: on"
                                    : "failure branch: off",
                                false,
                                Demo.Message.ToggledUtilsGenFailure(),
                                to_parent_message,
                                h
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
                            metric(
                                "typed alias",
                                model.genKind === "Option"
                                    ? "const gen: Utils.Gen<Option.OptionTypeLambda> = Option.gen"
                                    : "const gen: Utils.Gen<Result.ResultTypeLambda> = Result.gen",
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
                            metric(
                                "generator result",
                                result,
                                model.genFails ? "amber" : "green",
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "One type signature, different short-circuit semantics",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [Demo.genRule(model.genKind)]
                    ),
                ],
                h
            ),
        ]
    )
}

const variance_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = Demo.varianceDetails(model.varianceSlot)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · Variance tells Gen how channels flow",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["F", "R", "O", "E"] as const).map((varianceSlot) =>
                            choice(
                                `_${varianceSlot}`,
                                model.varianceSlot === varianceSlot,
                                Demo.Message.SelectedUtilsVarianceSlot({
                                    varianceSlot,
                                }),
                                to_parent_message,
                                h
                            )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-3 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-3"
                            ),
                        ],
                        [
                            metric("slot", details.label, "cyan", h),
                            metric("type", details.signature, "violet", h),
                            metric("direction", details.direction, "green", h),
                        ]
                    ),
                    h.p(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [details.role]
                    ),
                ],
                h
            ),
            panel(
                "Mostly library-author machinery",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Application code normally uses Option.gen, Result.gen, or Effect.gen directly. Utils.Variance and Utils.Gen are the reusable types that let Effect modules expose those APIs with consistent inference.",
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
            model.stage === "SingleShot"
                ? single_shot_view(model, to_parent_message, h)
                : model.stage === "Gen"
                  ? gen_view(model, to_parent_message, h)
                  : variance_view(model, to_parent_message, h),
        ]
    )
