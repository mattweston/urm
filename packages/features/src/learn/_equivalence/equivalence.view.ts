import * as Ui from "@foldkit/ui"
import type { ButtonAttributes } from "@foldkit/ui/button"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as EquivalenceDemo from "./equivalence.ts"

type ToParentMessage<ParentMessage> = (
    message: EquivalenceDemo.Message
) => ParentMessage

const PANEL_CLASS =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"

const stage_button = <ParentMessage>(
    stage: EquivalenceDemo.Stage,
    model: EquivalenceDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(
                EquivalenceDemo.Message.SelectedEquivalenceStage({ stage })
            ),
            isDisabled: model.stage === stage,
            toView: (attributes: ButtonAttributes<ParentMessage>) =>
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
    model: EquivalenceDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Equivalence examples"),
        ],
        EquivalenceDemo.stages.map((stage) =>
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
    message: EquivalenceDemo.Message,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(message),
            isDisabled: is_active,
            toView: (attributes: ButtonAttributes<ParentMessage>) =>
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
    details: EquivalenceDemo.StageDetails,
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

const primitive_case_label = (
    primitiveCase: EquivalenceDemo.PrimitiveCase
): string =>
    primitiveCase === "NumberNaN"
        ? "Number NaN"
        : primitiveCase === "StrictNaN"
          ? "strict NaN"
          : primitiveCase === "Date"
            ? "Date"
            : "tolerance"

const primitives_view = <ParentMessage>(
    model: EquivalenceDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = EquivalenceDemo.primitive_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Relation",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "NumberNaN",
                                        "StrictNaN",
                                        "Date",
                                        "Tolerance",
                                    ] as const
                                ).map(
                                    (
                                        primitiveCase: EquivalenceDemo.PrimitiveCase
                                    ) =>
                                        choice_button(
                                            primitive_case_label(primitiveCase),
                                            model.primitiveCase ===
                                                primitiveCase,
                                            EquivalenceDemo.Message.SelectedEquivalencePrimitiveCase(
                                                {
                                                    primitiveCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("equivalence", snapshot.name, h, "cyan"),
                            metric("comparison", snapshot.comparator, h),
                            metric("law note", snapshot.lawNote, h),
                        ]
                    ),
                ],
                h
            ),

            panel(
                "Result",
                [
                    h.div(
                        [h.Class("space-y-5 p-5")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]"
                                    ),
                                ],
                                [
                                    metric("left", snapshot.left, h),
                                    h.div(
                                        [
                                            h.Class(
                                                "text-center font-mono text-lg font-semibold text-cyan-600"
                                            ),
                                        ],
                                        ["≡ ?"]
                                    ),
                                    metric("right", snapshot.right, h),
                                ]
                            ),
                            metric(
                                "equivalent",
                                String(snapshot.result),
                                h,
                                snapshot.result ? "green" : "amber"
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-border bg-background/70 p-4 text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    model.primitiveCase === "NumberNaN"
                                        ? "Equivalence.Number deliberately restores reflexivity for NaN."
                                        : model.primitiveCase === "StrictNaN"
                                          ? "strictEqual follows JavaScript === exactly, so NaN is not equivalent to itself."
                                          : model.primitiveCase === "Date"
                                            ? "Different Date instances compare through their millisecond timestamps."
                                            : "make adds a same-reference fast path before running your custom relation.",
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

const derive_case_label = (deriveCase: EquivalenceDemo.DeriveCase): string =>
    deriveCase === "UserId"
        ? "User by ID"
        : deriveCase === "CaseInsensitive"
          ? "case-insensitive"
          : "normalized email"

const derive_view = <ParentMessage>(
    model: EquivalenceDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = EquivalenceDemo.derive_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Projection",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "UserId",
                                        "CaseInsensitive",
                                        "NormalizeEmail",
                                    ] as const
                                ).map(
                                    (deriveCase: EquivalenceDemo.DeriveCase) =>
                                        choice_button(
                                            derive_case_label(deriveCase),
                                            model.deriveCase === deriveCase,
                                            EquivalenceDemo.Message.SelectedEquivalenceDeriveCase(
                                                {
                                                    deriveCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric(
                                "derived relation",
                                snapshot.name,
                                h,
                                "cyan"
                            ),
                            metric(
                                "mapInput projection",
                                snapshot.projection,
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),

            panel(
                "Before → key → compare",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid gap-3 md:grid-cols-2")],
                                [
                                    metric("left", snapshot.left, h),
                                    metric("right", snapshot.right, h),
                                    metric(
                                        "left projected",
                                        snapshot.projectedLeft,
                                        h,
                                        "cyan"
                                    ),
                                    metric(
                                        "right projected",
                                        snapshot.projectedRight,
                                        h,
                                        "cyan"
                                    ),
                                ]
                            ),
                            metric(
                                "equivalent",
                                String(snapshot.result),
                                h,
                                snapshot.result ? "green" : "amber"
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const shape_case_label = (shapeCase: EquivalenceDemo.ShapeCase): string =>
    shapeCase

const shapes_view = <ParentMessage>(
    model: EquivalenceDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = EquivalenceDemo.shape_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Shape combinator",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Tuple",
                                        "Array",
                                        "Struct",
                                        "Record",
                                    ] as const
                                ).map((shapeCase: EquivalenceDemo.ShapeCase) =>
                                    choice_button(
                                        shape_case_label(shapeCase),
                                        model.shapeCase === shapeCase,
                                        EquivalenceDemo.Message.SelectedEquivalenceShapeCase(
                                            {
                                                shapeCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("equivalence", snapshot.name, h, "cyan"),
                            metric("rule", snapshot.rule, h),
                            metric("detail", snapshot.extra, h),
                        ]
                    ),
                ],
                h
            ),

            panel(
                "Composite comparison",
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
                            metric(
                                "equivalent",
                                String(snapshot.result),
                                h,
                                snapshot.result ? "green" : "amber"
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const combine_case_label = (combineCase: EquivalenceDemo.CombineCase): string =>
    combineCase === "Two"
        ? "combine"
        : combineCase === "Many"
          ? "combineAll"
          : combineCase === "Reducer"
            ? "makeReducer"
            : "empty rules"

const combine_view = <ParentMessage>(
    model: EquivalenceDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = EquivalenceDemo.combine_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.82fr_1.18fr]")],
        [
            panel(
                "Composition",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    ["Two", "Many", "Reducer", "Empty"] as const
                                ).map(
                                    (
                                        combineCase: EquivalenceDemo.CombineCase
                                    ) =>
                                        choice_button(
                                            combine_case_label(combineCase),
                                            model.combineCase === combineCase,
                                            EquivalenceDemo.Message.SelectedEquivalenceCombineCase(
                                                {
                                                    combineCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("builder", snapshot.name, h, "cyan"),
                            metric("rules", String(snapshot.ruleCount), h),
                            metric("identity", snapshot.identity, h),
                        ]
                    ),
                ],
                h
            ),

            panel(
                "Logical AND",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid gap-3 md:grid-cols-2")],
                                [
                                    metric("left", snapshot.left, h),
                                    metric("right", snapshot.right, h),
                                    metric(
                                        "name rule",
                                        String(snapshot.nameRule),
                                        h,
                                        snapshot.nameRule ? "green" : "amber"
                                    ),
                                    metric(
                                        "age rule",
                                        String(snapshot.ageRule),
                                        h,
                                        snapshot.ageRule ? "green" : "amber"
                                    ),
                                ]
                            ),
                            metric(
                                "combined result",
                                String(snapshot.result),
                                h,
                                snapshot.result ? "green" : "amber"
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
    details: EquivalenceDemo.StageDetails,
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
    model: EquivalenceDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = EquivalenceDemo.stage_details[model.stage]

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
                                        ["effect / Equivalence"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        ["Reusable equality laws for one type"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Start with primitive relations, derive equality through stable projections, lift it over data shapes, then combine several rules with logical AND.",
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
                                        ["17 documented items"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["lawful relation"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["no explicit any"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),

            stage_tabs(model, to_parent_message, h),

            intro_panel(details, h),

            model.stage === "Primitives"
                ? primitives_view(model, to_parent_message, h)
                : model.stage === "Derive"
                  ? derive_view(model, to_parent_message, h)
                  : model.stage === "Shapes"
                    ? shapes_view(model, to_parent_message, h)
                    : combine_view(model, to_parent_message, h),

            notice_panel(details, h),
        ]
    )
}
