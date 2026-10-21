import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as NewtypeDemo from "./newtype.ts"

type ToParentMessage<ParentMessage> = (
    message: NewtypeDemo.Message
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
    message: NewtypeDemo.Message,
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
    model: NewtypeDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Newtype examples"),
        ],
        NewtypeDemo.stages.map((stage: NewtypeDemo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        NewtypeDemo.Message.SelectedNewtypeStage({ stage })
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
    details: NewtypeDemo.StageDetails,
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

const define_view = <ParentMessage>(
    model: NewtypeDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = NewtypeDemo.define_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Type identity",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Tag", "Carrier", "Types"] as const).map(
                                    (defineCase: NewtypeDemo.DefineCase) =>
                                        choice_button(
                                            defineCase.toLowerCase(),
                                            model.defineCase === defineCase,
                                            NewtypeDemo.Message.SelectedNewtypeDefineCase(
                                                {
                                                    defineCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("UserId", snapshot.userIdType, h, "cyan"),
                            metric("OrderId", snapshot.orderIdType, h, "green"),
                            metric("carrier", snapshot.carrier, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Type helpers",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("Key", snapshot.keyHelper, h, "cyan"),
                            metric(
                                "Carrier",
                                snapshot.carrierHelper,
                                h,
                                "green"
                            ),
                            metric(
                                "runtime representation",
                                snapshot.runtimeTag,
                                h,
                                "amber"
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const iso_view = <ParentMessage>(
    model: NewtypeDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = NewtypeDemo.iso_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Iso",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Wrap", "Unwrap", "Identity"] as const).map(
                                    (isoCase: NewtypeDemo.IsoCase) =>
                                        choice_button(
                                            isoCase.toLowerCase(),
                                            model.isoCase === isoCase,
                                            NewtypeDemo.Message.SelectedNewtypeIsoCase(
                                                {
                                                    isoCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric(
                                "iso.set carrier → newtype",
                                String(snapshot.wrapped),
                                h,
                                "cyan"
                            ),
                            metric(
                                "iso.get",
                                String(snapshot.isoGet),
                                h,
                                "green"
                            ),
                            metric("Newtype.value", String(snapshot.value), h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Zero-cost representation",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "typeof wrapped",
                                snapshot.runtimeType,
                                h,
                                "cyan"
                            ),
                            metric(
                                "Object.is(wrapped, 42)",
                                String(snapshot.sameRuntimeValue),
                                h,
                                "green"
                            ),
                            metric("round trip", String(snapshot.roundTrip), h),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "The type changes, but the runtime representation does not. makeIso and value are implemented with identity casts.",
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

const instances_view = <ParentMessage>(
    model: NewtypeDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = NewtypeDemo.instances_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Lifted instance",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Equivalence",
                                        "Order",
                                        "Distinct",
                                    ] as const
                                ).map(
                                    (
                                        instancesCase: NewtypeDemo.InstancesCase
                                    ) =>
                                        choice_button(
                                            instancesCase.toLowerCase(),
                                            model.instancesCase ===
                                                instancesCase,
                                            NewtypeDemo.Message.SelectedNewtypeInstancesCase(
                                                {
                                                    instancesCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric(
                                "Label eq a / a",
                                String(snapshot.equalAA),
                                h,
                                "green"
                            ),
                            metric(
                                "Label eq a / b",
                                String(snapshot.equalAB),
                                h,
                                "amber"
                            ),
                            metric(
                                "UserId order 1 / 2",
                                String(snapshot.order12),
                                h,
                                "cyan"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Ordering + type separation",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "2 / 1",
                                        String(snapshot.order21),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "2 / 2",
                                        String(snapshot.order22),
                                        h
                                    ),
                                ]
                            ),
                            metric(
                                "distinct type identities",
                                snapshot.distinctTypes,
                                h,
                                "amber"
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const algebra_view = <ParentMessage>(
    model: NewtypeDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = NewtypeDemo.algebra_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Algebra",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    ["Combiner", "Reducer", "ZeroCost"] as const
                                ).map((algebraCase: NewtypeDemo.AlgebraCase) =>
                                    choice_button(
                                        algebraCase === "ZeroCost"
                                            ? "zero cost"
                                            : algebraCase.toLowerCase(),
                                        model.algebraCase === algebraCase,
                                        NewtypeDemo.Message.SelectedNewtypeAlgebraCase(
                                            {
                                                algebraCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric(
                                "combine 10 + 20",
                                String(snapshot.combined),
                                h,
                                "green"
                            ),
                            metric(
                                "reduce 1 + 2 + 3",
                                String(snapshot.reduced),
                                h,
                                "cyan"
                            ),
                            metric(
                                "reducer initial",
                                String(snapshot.reducerInitial),
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Lift behavior",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "result type",
                                snapshot.resultType,
                                h,
                                "green"
                            ),
                            metric(
                                "runtime behavior",
                                snapshot.runtimeCost,
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
                                    "The number reducer still performs ordinary numeric addition at runtime; the lifted type ensures its combine / combineAll results remain Credits.",
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
    details: NewtypeDemo.StageDetails,
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
    model: NewtypeDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = NewtypeDemo.stage_details[model.stage]

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
                                        ["effect / Newtype"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Compile-time identity with zero runtime wrapping",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Separate structurally identical carrier values in TypeScript, wrap and unwrap through an Iso, and reuse carrier equality, ordering, combining, and reducing logic without changing runtime representation.",
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
                                        ["10 public entries"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["zero-cost tag"]
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
            model.stage === "Define"
                ? define_view(model, to_parent_message, h)
                : model.stage === "Iso"
                  ? iso_view(model, to_parent_message, h)
                  : model.stage === "Instances"
                    ? instances_view(model, to_parent_message, h)
                    : algebra_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
