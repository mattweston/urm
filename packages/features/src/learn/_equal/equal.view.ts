import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as EqualDemo from "./equal.ts"

type ToParentMessage<ParentMessage> = (
    message: EqualDemo.Message
) => ParentMessage

const PANEL_CLASS =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"

const stage_button = <ParentMessage>(
    stage: EqualDemo.Stage,
    model: EqualDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(
                EqualDemo.Message.SelectedEqualStage({ stage })
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
    model: EqualDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Equal examples"),
        ],
        EqualDemo.stages.map((stage) =>
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
    message: EqualDemo.Message,
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
    details: EqualDemo.StageDetails,
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

const structural_view = <ParentMessage>(
    model: EqualDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = EqualDemo.structural_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Comparison case",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Objects",
                                        "Collections",
                                        "Specials",
                                        "Mismatch",
                                    ] as const
                                ).map((structuralCase) =>
                                    choice_button(
                                        structuralCase,
                                        model.structuralCase === structuralCase,
                                        EqualDemo.Message.SelectedEqualStructuralCase(
                                            {
                                                structuralCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("case", snapshot.label, h, "cyan"),
                            metric("rule", snapshot.rule, h),
                            metric(
                                "order independent",
                                String(snapshot.orderIndependent),
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),

            panel(
                "Equal.equals",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid gap-3 md:grid-cols-2")],
                                [
                                    metric("left", snapshot.left, h),
                                    metric("right", snapshot.right, h),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "grid grid-cols-[1fr_auto_1fr] items-center gap-3"
                                    ),
                                ],
                                [
                                    h.div([h.Class("h-px bg-border")]),
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-xs font-semibold text-cyan-600"
                                            ),
                                        ],
                                        ["deep comparison"]
                                    ),
                                    h.div([h.Class("h-px bg-border")]),
                                ]
                            ),
                            metric(
                                "equals",
                                String(snapshot.equal),
                                h,
                                snapshot.equal ? "green" : "amber"
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const custom_view = <ParentMessage>(
    model: EqualDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = EqualDemo.custom_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.8fr_1.2fr]")],
        [
            panel(
                "Coordinate values",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    ["Same", "Different", "OneSided"] as const
                                ).map((customCase) =>
                                    choice_button(
                                        customCase === "OneSided"
                                            ? "one-sided Equal"
                                            : customCase,
                                        model.customCase === customCase,
                                        EqualDemo.Message.SelectedEqualCustomCase(
                                            {
                                                customCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("left", snapshot.left, h, "cyan"),
                            metric("right", snapshot.right, h),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "left isEqual",
                                        String(snapshot.leftIsEqual),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "right isEqual",
                                        String(snapshot.rightIsEqual),
                                        h,
                                        snapshot.rightIsEqual
                                            ? "green"
                                            : "amber"
                                    ),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),

            panel(
                "Custom protocol",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "Equal.equals",
                                        String(snapshot.equals),
                                        h,
                                        snapshot.equals ? "green" : "amber"
                                    ),
                                    metric(
                                        "delegated?",
                                        String(snapshot.delegated),
                                        h
                                    ),
                                    metric(
                                        "left hash",
                                        String(snapshot.leftHash),
                                        h
                                    ),
                                    metric("right hash", snapshot.rightHash, h),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-border bg-background/70 p-4"
                                    ),
                                ],
                                [
                                    h.code(
                                        [
                                            h.Class(
                                                "font-mono text-xs font-semibold"
                                            ),
                                        ],
                                        ["[Equal.symbol](that)"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "my-2 font-mono text-cyan-600"
                                            ),
                                        ],
                                        ["+"]
                                    ),
                                    h.code(
                                        [
                                            h.Class(
                                                "font-mono text-xs font-semibold"
                                            ),
                                        ],
                                        ["[Hash.symbol]()"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Equal values must produce compatible hashes so HashMap / HashSet can use the same identity contract.",
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

const reference_view = <ParentMessage>(
    model: EqualDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = EqualDemo.reference_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Identity mode",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    ["Structural", "Proxy", "Unsafe"] as const
                                ).map((referenceCase) =>
                                    choice_button(
                                        referenceCase === "Proxy"
                                            ? "byReference"
                                            : referenceCase === "Unsafe"
                                              ? "byReferenceUnsafe"
                                              : "structural",
                                        model.referenceCase === referenceCase,
                                        EqualDemo.Message.SelectedEqualReferenceCase(
                                            {
                                                referenceCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("mode", snapshot.mode, h, "cyan"),
                            metric("same shape", String(snapshot.sameShape), h),
                            metric(
                                "permanent mark",
                                String(snapshot.permanent),
                                h,
                                snapshot.permanent ? "amber" : "green"
                            ),
                        ]
                    ),
                ],
                h
            ),

            panel(
                "Structural vs identity",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "compared to peer",
                                        String(snapshot.comparedEqual),
                                        h,
                                        snapshot.comparedEqual
                                            ? "green"
                                            : "amber"
                                    ),
                                    metric(
                                        "same reference",
                                        String(snapshot.selfEqual),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "returned same object",
                                        String(snapshot.returnedSameObject),
                                        h
                                    ),
                                    metric(
                                        "source still structural",
                                        String(snapshot.sourceStillStructural),
                                        h,
                                        snapshot.sourceStillStructural
                                            ? "green"
                                            : "amber"
                                    ),
                                ]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-border bg-background/70 p-4 text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    model.referenceCase === "Proxy"
                                        ? "The proxy becomes reference-only; the original source object remains structurally comparable."
                                        : model.referenceCase === "Unsafe"
                                          ? "The original object itself is now reference-only for the rest of its lifetime."
                                          : "Without an opt-out, two plain objects with the same enumerable structure compare equal.",
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

const equivalence_view = <ParentMessage>(
    model: EqualDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = EqualDemo.equivalence_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.8fr_1.2fr]")],
        [
            panel(
                "Adapter type",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Numbers", "Objects"] as const).map(
                                    (equivalenceCase) =>
                                        choice_button(
                                            equivalenceCase,
                                            model.equivalenceCase ===
                                                equivalenceCase,
                                            EqualDemo.Message.SelectedEqualEquivalenceCase(
                                                {
                                                    equivalenceCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("algorithm", snapshot.algorithm, h, "cyan"),
                            metric(
                                "equivalence sample",
                                String(snapshot.equivalenceResult),
                                h,
                                "green"
                            ),
                        ]
                    ),
                ],
                h
            ),

            panel(
                "Array.dedupeWith",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("input", snapshot.input, h),
                            h.div(
                                [
                                    h.Class(
                                        "grid place-items-center font-mono text-cyan-600"
                                    ),
                                ],
                                ["↓ Equal.asEquivalence"]
                            ),
                            metric("output", snapshot.output, h, "cyan"),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "before",
                                        String(snapshot.beforeCount),
                                        h
                                    ),
                                    metric(
                                        "after",
                                        String(snapshot.afterCount),
                                        h,
                                        "green"
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
    details: EqualDemo.StageDetails,
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
    model: EqualDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = EqualDemo.stage_details[model.stage]

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
                                        ["effect / Equal"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Structural equality with explicit escape hatches",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Compare built-in values deeply, define domain identity with Equal + Hash, opt objects into reference identity, and reuse the same semantics through Equivalence.",
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
                                        ["7 exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["deep structural"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["Hash contract"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),

            stage_tabs(model, to_parent_message, h),

            intro_panel(details, h),

            model.stage === "Structural"
                ? structural_view(model, to_parent_message, h)
                : model.stage === "Custom"
                  ? custom_view(model, to_parent_message, h)
                  : model.stage === "Reference"
                    ? reference_view(model, to_parent_message, h)
                    : equivalence_view(model, to_parent_message, h),

            notice_panel(details, h),
        ]
    )
}
