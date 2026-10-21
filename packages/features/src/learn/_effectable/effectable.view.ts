import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as EffectableDemo from "./effectable.ts"

type ToParentMessage<ParentMessage> = (
    message: EffectableDemo.Message
) => ParentMessage

const PANEL_CLASS =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"

const stage_button = <ParentMessage>(
    stage: EffectableDemo.Stage,
    model: EffectableDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(
                EffectableDemo.Message.SelectedEffectableStage({ stage })
            ),
            isDisabled: model.stage === stage,
            toView: (attributes) =>
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

const stage_tabs = <ParentMessage>(
    model: EffectableDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Effectable examples"),
        ],
        EffectableDemo.stages.map((stage) =>
            stage_button(stage, model, to_parent_message, h)
        )
    )

const panel = <ParentMessage>(
    title: string,
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
                        [title]
                    ),
                ]
            ),
            ...children,
        ]
    )

const api_pills = <ParentMessage>(
    apis: ReadonlyArray<string>,
    h: HtmlBuilder<ParentMessage>
): ReadonlyArray<Html> =>
    apis.map((api) =>
        h.keyed("span")(
            api,
            [
                h.Class(
                    "rounded-full border border-cyan-500/30 bg-cyan-500/5 px-2.5 py-1 font-mono text-[10px] text-cyan-600"
                ),
            ],
            [api]
        )
    )

const metric = <ParentMessage>(
    label: string,
    value: string,
    h: HtmlBuilder<ParentMessage>,
    tone: "default" | "cyan" | "green" | "amber" = "default"
): Html => {
    const tone_class =
        tone === "cyan"
            ? "border-cyan-500/30 bg-cyan-500/5"
            : tone === "green"
              ? "border-emerald-500/30 bg-emerald-500/5"
              : tone === "amber"
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-border bg-background/70"

    return h.div(
        [
            h.Class(
                `min-w-0 rounded-[var(--radius-surface)] border p-3 ${tone_class}`
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
                        "mt-1 break-words font-mono text-xs font-semibold leading-5"
                    ),
                ],
                [value]
            ),
        ]
    )
}

const choice_button = <ParentMessage>(
    label: string,
    is_active: boolean,
    message: EffectableDemo.Message,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(message),
            isDisabled: is_active,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            is_active
                                ? "rounded-[var(--radius-surface)] border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 font-mono text-xs font-semibold text-cyan-700"
                                : "rounded-[var(--radius-surface)] border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const intro_panel = <ParentMessage>(
    details: EffectableDemo.StageDetails,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [h.Class(PANEL_CLASS)],
        [
            h.div(
                [h.Class("grid gap-0 lg:grid-cols-[1.05fr_0.95fr]")],
                [
                    h.div(
                        [h.Class("p-6")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "font-mono text-[10px] font-semibold tracking-[0.2em] text-cyan-600 uppercase"
                                    ),
                                ],
                                [details.eyebrow]
                            ),
                            h.h2(
                                [
                                    h.Class(
                                        "mt-2 text-2xl font-semibold tracking-tight"
                                    ),
                                ],
                                [details.title]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [details.description]
                            ),
                            h.div(
                                [h.Class("mt-4 flex flex-wrap gap-2")],
                                api_pills(details.apis, h)
                            ),
                        ]
                    ),
                    h.pre(
                        [
                            h.Class(
                                "overflow-x-auto border-t border-border bg-background/60 p-5 font-mono text-xs leading-5 lg:border-l lg:border-t-0"
                            ),
                        ],
                        [h.code([], [details.code])]
                    ),
                ]
            ),
        ]
    )

const class_view = <ParentMessage>(
    model: EffectableDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = EffectableDemo.class_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.8fr_1.2fr]")],
        [
            panel(
                "Domain value",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Effect", "Foldkit", "Empty"] as const).map(
                                    (classCase) =>
                                        choice_button(
                                            classCase === "Empty"
                                                ? "Empty string"
                                                : classCase,
                                            model.classCase === classCase,
                                            EffectableDemo.Message.SelectedEffectableClassCase(
                                                {
                                                    classCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric(
                                "instance",
                                `new TextLength(${JSON.stringify(
                                    snapshot.text
                                )})`,
                                h,
                                "cyan"
                            ),
                            metric(
                                "own field",
                                `text = ${JSON.stringify(snapshot.text)}`,
                                h
                            ),
                            metric(
                                "pipe available",
                                String(snapshot.pipeAvailable),
                                h,
                                "green"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Effect protocol",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "Effect.isEffect",
                                        String(snapshot.isEffect),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "Effect.runSync",
                                        String(snapshot.runResult),
                                        h,
                                        "cyan"
                                    ),
                                    metric(
                                        "map(length × 2)",
                                        String(snapshot.mappedResult),
                                        h
                                    ),
                                    metric(
                                        "A / E / R",
                                        "number / never / never",
                                        h
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-border bg-background/70 p-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "grid gap-3 md:grid-cols-[1fr_auto_1fr]"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [],
                                                [
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "font-mono text-xs font-semibold"
                                                            ),
                                                        ],
                                                        ["TextLength"]
                                                    ),
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "mt-1 text-xs text-muted-foreground"
                                                            ),
                                                        ],
                                                        ["domain object"]
                                                    ),
                                                ]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "self-center font-mono text-cyan-600"
                                                    ),
                                                ],
                                                ["asEffect →"]
                                            ),
                                            h.div(
                                                [],
                                                [
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "font-mono text-xs font-semibold"
                                                            ),
                                                        ],
                                                        ["Effect<number>"]
                                                    ),
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "mt-1 text-xs text-muted-foreground"
                                                            ),
                                                        ],
                                                        [
                                                            "normal Effect evaluation",
                                                        ]
                                                    ),
                                                ]
                                            ),
                                        ]
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

const yield_view = <ParentMessage>(
    model: EffectableDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = EffectableDemo.yield_snapshot(model)

    const success = model.yieldCase === "Success"

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.82fr_1.18fr]")],
        [
            panel(
                "Input + environment",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                [
                                    choice_button(
                                        "Success",
                                        success,
                                        EffectableDemo.Message.SelectedEffectableYieldCase(
                                            {
                                                yieldCase: "Success",
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    ),
                                    choice_button(
                                        "Failure",
                                        !success,
                                        EffectableDemo.Message.SelectedEffectableYieldCase(
                                            {
                                                yieldCase: "Failure",
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    ),
                                ]
                            ),
                            metric(
                                "ScaleValue input",
                                String(snapshot.input),
                                h,
                                "cyan"
                            ),
                            metric(
                                "provided Multiplier",
                                String(snapshot.multiplier),
                                h
                            ),
                            metric(
                                "required service R",
                                snapshot.requiredService,
                                h
                            ),
                            metric(
                                "Effect.isEffect",
                                String(snapshot.isEffect),
                                h,
                                "green"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "yield* inside Effect.gen",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-border bg-background/70 p-4 font-mono text-xs leading-6"
                                    ),
                                ],
                                [
                                    h.div(
                                        [],
                                        [
                                            "const scaled = yield* new ScaleValue(input)",
                                        ]
                                    ),
                                    h.div(
                                        [h.Class("text-muted-foreground")],
                                        ["return scaled + 1"]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "Exit",
                                        snapshot.exitTag,
                                        h,
                                        success ? "green" : "amber"
                                    ),
                                    metric(
                                        "result",
                                        snapshot.result,
                                        h,
                                        success ? "cyan" : "amber"
                                    ),
                                    metric("typed E", snapshot.errorChannel, h),
                                    metric(
                                        "direct yield",
                                        String(snapshot.yieldedDirectly),
                                        h,
                                        "green"
                                    ),
                                ]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    success
                                        ? "ScaleValue reads Multiplier from the Effect environment, returns 7 × 3, then the generator adds 1."
                                        : "The same custom Effect value fails through ScaleError before a success value exists; the error remains in E.",
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

const mixin_view = <ParentMessage>(
    model: EffectableDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = EffectableDemo.mixin_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.82fr_1.18fr]")],
        [
            panel(
                "Existing class",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                [
                                    choice_button(
                                        "value = 2",
                                        model.mixinCase === "Two",
                                        EffectableDemo.Message.SelectedEffectableMixinCase(
                                            {
                                                mixinCase: "Two",
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    ),
                                    choice_button(
                                        "value = 5",
                                        model.mixinCase === "Five",
                                        EffectableDemo.Message.SelectedEffectableMixinCase(
                                            {
                                                mixinCase: "Five",
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    ),
                                ]
                            ),
                            metric(
                                "new Box(value)",
                                String(snapshot.value),
                                h,
                                "cyan"
                            ),
                            metric(
                                "Box.double()",
                                String(snapshot.doubleResult),
                                h
                            ),
                            metric(
                                "original Box is Effect?",
                                String(snapshot.baseIsEffect),
                                h
                            ),
                            metric(
                                "base prototype changed?",
                                String(snapshot.originalPrototypeChanged),
                                h,
                                "green"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Mixed subclass",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "Effect.isEffect",
                                        String(snapshot.mixedIsEffect),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "Effect.runSync",
                                        String(snapshot.runResult),
                                        h,
                                        "cyan"
                                    ),
                                    metric(
                                        "instanceof Box",
                                        String(snapshot.instanceOfBase),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "instanceof EffectBox",
                                        String(snapshot.instanceOfMixed),
                                        h,
                                        "green"
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-border bg-background/70 p-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-xs font-semibold"
                                            ),
                                        ],
                                        ["EffectBox.prototype"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "my-3 grid place-items-center font-mono text-cyan-600"
                                            ),
                                        ],
                                        ["↓"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "rounded border border-cyan-500/30 bg-cyan-500/5 px-3 py-2 font-mono text-xs font-semibold text-cyan-700"
                                            ),
                                        ],
                                        ["Effect prototype inserted"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "my-3 grid place-items-center font-mono text-cyan-600"
                                            ),
                                        ],
                                        ["↓"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-xs font-semibold"
                                            ),
                                        ],
                                        ["Box.prototype"]
                                    ),
                                ]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Constructor state and double() survive the mixin. The original Box remains a normal non-Effect class.",
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

const prototype_view = <ParentMessage>(
    model: EffectableDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = EffectableDemo.prototype_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.8fr_1.2fr]")],
        [
            panel(
                "Primitive object",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                [
                                    choice_button(
                                        "value = 7",
                                        model.prototypeCase === "Seven",
                                        EffectableDemo.Message.SelectedEffectablePrototypeCase(
                                            {
                                                prototypeCase: "Seven",
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    ),
                                    choice_button(
                                        "value = 42",
                                        model.prototypeCase === "FortyTwo",
                                        EffectableDemo.Message.SelectedEffectablePrototypeCase(
                                            {
                                                prototypeCase: "FortyTwo",
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    ),
                                ]
                            ),
                            metric(
                                "own value",
                                String(snapshot.value),
                                h,
                                "cyan"
                            ),
                            metric("prototype label", "PrimitiveNumber", h),
                            metric(
                                "evaluator receives Fiber",
                                String(snapshot.evaluatorReceivesFiber),
                                h,
                                "green"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Low-level Effect behavior",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "Effect.isEffect",
                                        String(snapshot.isEffect),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "Effect.runSync",
                                        String(snapshot.runResult),
                                        h,
                                        "cyan"
                                    ),
                                    metric(
                                        "map(value × 10)",
                                        String(snapshot.mappedResult),
                                        h
                                    ),
                                    metric(
                                        "yield* + 1",
                                        String(snapshot.yieldedResult),
                                        h
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-border bg-background/70 p-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "grid gap-3 md:grid-cols-[1fr_auto_1fr]"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [],
                                                [
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "font-mono text-xs font-semibold"
                                                            ),
                                                        ],
                                                        ["plain object"]
                                                    ),
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "mt-1 text-xs text-muted-foreground"
                                                            ),
                                                        ],
                                                        ["{ value }"]
                                                    ),
                                                ]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "self-center font-mono text-cyan-600"
                                                    ),
                                                ],
                                                ["Object.create →"]
                                            ),
                                            h.div(
                                                [],
                                                [
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "font-mono text-xs font-semibold"
                                                            ),
                                                        ],
                                                        ["Effectable.Prototype"]
                                                    ),
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "mt-1 text-xs text-muted-foreground"
                                                            ),
                                                        ],
                                                        [
                                                            "label + evaluate(fiber)",
                                                        ]
                                                    ),
                                                ]
                                            ),
                                        ]
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

const notice_panel = <ParentMessage>(
    details: EffectableDemo.StageDetails,
    h: HtmlBuilder<ParentMessage>
): Html =>
    panel(
        "What to notice",
        [
            h.p(
                [h.Class("px-5 py-4 text-sm leading-6 text-muted-foreground")],
                [details.notice]
            ),
        ],
        h
    )

export const view = <ParentMessage>(
    model: EffectableDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = EffectableDemo.stage_details[model.stage]

    return h.div(
        [h.Class("space-y-5")],
        [
            h.section(
                [h.Class(PANEL_CLASS)],
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-end"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("max-w-3xl")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-[10px] font-semibold tracking-[0.2em] text-cyan-600 uppercase"
                                            ),
                                        ],
                                        ["effect / Effectable"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Make domain values behave like Effects",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Compare the class, mixin, and low-level prototype routes to the same outcome: a custom value that composes, runs, and yields as a native Effect.",
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "flex flex-wrap gap-2 lg:justify-end"
                                    ),
                                ],
                                [
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["3 exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["yield* native"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["A / E / R preserved"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            stage_tabs(model, to_parent_message, h),
            intro_panel(details, h),
            model.stage === "Class"
                ? class_view(model, to_parent_message, h)
                : model.stage === "Yield"
                  ? yield_view(model, to_parent_message, h)
                  : model.stage === "Mixin"
                    ? mixin_view(model, to_parent_message, h)
                    : prototype_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
