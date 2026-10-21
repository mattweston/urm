import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as HktDemo from "./hkt.ts"

type ToParentMessage<ParentMessage> = (
    message: HktDemo.Message
) => ParentMessage

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

const metric = <ParentMessage>(
    label: string,
    value: string,
    h: HtmlBuilder<ParentMessage>,
    tone: "default" | "cyan" | "green" | "amber" = "default"
): Html => {
    const toneClass =
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
                `min-w-0 rounded-[var(--radius-surface)] border p-3 ${toneClass}`
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
                        "mt-1 whitespace-pre-wrap break-words font-mono text-xs font-semibold leading-5"
                    ),
                ],
                [value]
            ),
        ]
    )
}

const choice_button = <ParentMessage>(
    label: string,
    active: boolean,
    message: HktDemo.Message,
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
    model: HktDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect HKT examples"),
        ],
        HktDemo.stages.map((stage: HktDemo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        HktDemo.Message.SelectedHktStage({ stage })
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

const api_pills = <ParentMessage>(
    apis: ReadonlyArray<string>,
    h: HtmlBuilder<ParentMessage>
): ReadonlyArray<Html> =>
    apis.map((api: string) =>
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

const intro_panel = <ParentMessage>(
    details: HktDemo.StageDetails,
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

const lambda_view = <ParentMessage>(
    model: HktDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = HktDemo.lambda_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Type constructor",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Array",
                                        "Option",
                                        "Effect",
                                        "Function",
                                    ] as const
                                ).map((lambdaCase: HktDemo.LambdaCase) =>
                                    choice_button(
                                        lambdaCase,
                                        model.lambdaCase === lambdaCase,
                                        HktDemo.Message.SelectedHktLambdaCase({
                                            lambdaCase,
                                        }),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric(
                                "type shape",
                                snapshot.constructor,
                                h,
                                "cyan"
                            ),
                            metric("channels used", snapshot.uses, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Why TypeLambda exists",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "concrete example",
                                snapshot.concreteExample,
                                h,
                                "green"
                            ),
                            metric("purpose", snapshot.purpose, h),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "The interface names the slots of a generic constructor. No value is created: TypeLambda is only a compile-time encoding that generic abstractions can quantify over.",
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

const kind_view = <ParentMessage>(
    model: HktDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = HktDemo.kind_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.8fr_1.2fr]")],
        [
            panel(
                "Apply Kind",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Array",
                                        "Option",
                                        "Effect",
                                        "Function",
                                    ] as const
                                ).map((kindCase: HktDemo.KindCase) =>
                                    choice_button(
                                        kindCase,
                                        model.kindCase === kindCase,
                                        HktDemo.Message.SelectedHktKindCase({
                                            kindCase,
                                        }),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric(
                                "Kind expression",
                                snapshot.typeExpression,
                                h,
                                "cyan"
                            ),
                            metric(
                                "substituted",
                                snapshot.substitutedChannels,
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Resolved type + witness",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "resolved type",
                                snapshot.resolved,
                                h,
                                "green"
                            ),
                            metric(
                                "runtime witness",
                                snapshot.runtimeWitness,
                                h,
                                "cyan"
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Kind itself does nothing at runtime. The witness is an ordinary Array, Option, Effect, or function whose TypeScript type was computed through HKT.Kind.",
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

const type_class_label = (typeClassCase: HktDemo.TypeClassCase): string =>
    typeClassCase === "Generic" ? "generic helper" : typeClassCase

const type_class_view = <ParentMessage>(
    model: HktDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = HktDemo.type_class_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Type class",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Array", "Option", "Generic"] as const).map(
                                    (typeClassCase: HktDemo.TypeClassCase) =>
                                        choice_button(
                                            type_class_label(typeClassCase),
                                            model.typeClassCase ===
                                                typeClassCase,
                                            HktDemo.Message.SelectedHktTypeClassCase(
                                                {
                                                    typeClassCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric(
                                "abstraction",
                                snapshot.abstraction,
                                h,
                                "cyan"
                            ),
                            metric(
                                "shared operation",
                                snapshot.sameOperation,
                                h
                            ),
                            metric("URI role", snapshot.uriRole, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Same map shape",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("input", snapshot.input, h),
                            metric("output", snapshot.output, h, "green"),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "The method signature is written once in terms of Kind<F, …>. Each implementation specializes F to its own container shape while preserving the same generic operation.",
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

const variance_view = <ParentMessage>(
    model: HktDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = HktDemo.variance_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.75fr_1.25fr]")],
        [
            panel(
                "Channel",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Target", "Input", "Outputs"] as const).map(
                                    (varianceCase: HktDemo.VarianceCase) =>
                                        choice_button(
                                            varianceCase,
                                            model.varianceCase === varianceCase,
                                            HktDemo.Message.SelectedHktVarianceCase(
                                                {
                                                    varianceCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("channel", snapshot.channel, h, "cyan"),
                            metric("role", snapshot.role, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Encoding",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "TypeLambda use",
                                snapshot.typeLambdaUse,
                                h,
                                "cyan"
                            ),
                            metric("example", snapshot.example, h, "green"),
                            metric(
                                "Kind fallback marker",
                                snapshot.fallbackMarker,
                                h
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "The four slots let a single HKT encoding represent more than unary containers. A custom TypeLambda chooses which slots participate in its concrete type expression.",
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
    details: HktDemo.StageDetails,
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
    model: HktDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = HktDemo.stage_details[model.stage]

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
                                        ["effect / HKT"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Higher-kinded type encoding for generic constructors",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Encode Array, Option, Effect, and function shapes as TypeLambda values at the type level; apply them with Kind; then define generic TypeClass operations over the abstract constructor.",
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
                                        ["4 exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["type-level only"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["strict typing"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            stage_tabs(model, to_parent_message, h),
            intro_panel(details, h),
            model.stage === "Lambda"
                ? lambda_view(model, to_parent_message, h)
                : model.stage === "Kind"
                  ? kind_view(model, to_parent_message, h)
                  : model.stage === "TypeClass"
                    ? type_class_view(model, to_parent_message, h)
                    : variance_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
