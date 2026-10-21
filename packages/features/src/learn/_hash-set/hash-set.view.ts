import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as HashSetDemo from "./hash-set.ts"

type ToParentMessage<ParentMessage> = (
    message: HashSetDemo.Message
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
    message: HashSetDemo.Message,
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
    model: HashSetDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect HashSet examples"),
        ],
        HashSetDemo.stages.map((stage: HashSetDemo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        HashSetDemo.Message.SelectedHashSetStage({ stage })
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
    details: HashSetDemo.StageDetails,
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

const build_label = (buildCase: HashSetDemo.BuildCase): string =>
    buildCase === "Typed" ? "type helper" : buildCase.toLowerCase()

const build_view = <ParentMessage>(
    model: HashSetDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = HashSetDemo.build_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Construction",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Construct", "Unique", "Typed"] as const).map(
                                    (buildCase: HashSetDemo.BuildCase) =>
                                        choice_button(
                                            build_label(buildCase),
                                            model.buildCase === buildCase,
                                            HashSetDemo.Message.SelectedHashSetBuildCase(
                                                {
                                                    buildCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "source values",
                                        String(snapshot.sourceCount),
                                        h
                                    ),
                                    metric(
                                        "unique values",
                                        String(snapshot.uniqueCount),
                                        h,
                                        "cyan"
                                    ),
                                    metric(
                                        "isEmpty",
                                        String(snapshot.isEmpty),
                                        h
                                    ),
                                    metric(
                                        "isHashSet",
                                        String(snapshot.isHashSet),
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
            panel(
                "Unique set value",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("size", String(snapshot.size), h, "green"),
                            metric("values", snapshot.values, h, "cyan"),
                            metric(
                                "type-level example",
                                snapshot.extractedTypeExample,
                                h
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    model.buildCase === "Unique"
                                        ? "Repeated source occurrences collapse to one set member for each Effect equality class."
                                        : model.buildCase === "Typed"
                                          ? "HashSet.HashSet.Value extracts the element type from a concrete HashSet type."
                                          : "The set is iterable, but derived arrays should be sorted when a stable presentation order matters.",
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

const membership_label = (membershipCase: HashSetDemo.MembershipCase): string =>
    membershipCase.toLowerCase()

const membership_view = <ParentMessage>(
    model: HashSetDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = HashSetDemo.membership_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Membership",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Structural",
                                        "Immutable",
                                        "Predicates",
                                    ] as const
                                ).map(
                                    (
                                        membershipCase: HashSetDemo.MembershipCase
                                    ) =>
                                        choice_button(
                                            membership_label(membershipCase),
                                            model.membershipCase ===
                                                membershipCase,
                                            HashSetDemo.Message.SelectedHashSetMembershipCase(
                                                {
                                                    membershipCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric(
                                "fresh Person(Alice) present",
                                String(snapshot.alicePresent),
                                h,
                                "green"
                            ),
                            metric(
                                "fresh Person(Ada) present",
                                String(snapshot.adaPresent),
                                h
                            ),
                            h.div(
                                [h.Class("grid grid-cols-3 gap-3")],
                                [
                                    metric(
                                        "original",
                                        String(snapshot.originalSize),
                                        h
                                    ),
                                    metric(
                                        "after add",
                                        String(snapshot.addedSize),
                                        h,
                                        "cyan"
                                    ),
                                    metric(
                                        "after remove",
                                        String(snapshot.removedSize),
                                        h
                                    ),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Persistent + predicate behavior",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "original still has Bob",
                                        String(snapshot.originalStillHasBob),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "add existing = same instance",
                                        String(
                                            snapshot.addExistingSameInstance
                                        ),
                                        h,
                                        "cyan"
                                    ),
                                    metric(
                                        "remove missing = same instance",
                                        String(
                                            snapshot.removeMissingSameInstance
                                        ),
                                        h,
                                        "cyan"
                                    ),
                                    metric(
                                        "some(name.length > 3)",
                                        String(snapshot.someLongName),
                                        h
                                    ),
                                    metric(
                                        "every(non-empty)",
                                        String(snapshot.everyNonEmpty),
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
                                    "Custom Hash and Equal implementations let a fresh Person value match an existing member. add/remove keep the original set persistent, while no-op updates can reuse its exact object.",
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

const algebra_label = (algebraCase: HashSetDemo.AlgebraCase): string =>
    algebraCase.toLowerCase()

const algebra_view = <ParentMessage>(
    model: HashSetDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = HashSetDemo.algebra_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.75fr_1.25fr]")],
        [
            panel(
                "Set algebra",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Union",
                                        "Intersection",
                                        "Difference",
                                        "Subset",
                                    ] as const
                                ).map((algebraCase: HashSetDemo.AlgebraCase) =>
                                    choice_button(
                                        algebra_label(algebraCase),
                                        model.algebraCase === algebraCase,
                                        HashSetDemo.Message.SelectedHashSetAlgebraCase(
                                            {
                                                algebraCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("left", snapshot.left, h, "cyan"),
                            metric("right", snapshot.right, h),
                            metric("rule", snapshot.rule, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Result + containment",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "result",
                                snapshot.result,
                                h,
                                model.algebraCase === "Subset"
                                    ? "default"
                                    : "green"
                            ),
                            metric(
                                "result size",
                                String(snapshot.resultSize),
                                h
                            ),
                            h.div(
                                [h.Class("grid grid-cols-3 gap-3")],
                                [
                                    metric(
                                        "small ⊆ large",
                                        String(snapshot.subsetSmallLarge),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "large ⊆ small",
                                        String(snapshot.subsetLargeSmall),
                                        h,
                                        "amber"
                                    ),
                                    metric(
                                        "left ⊆ left",
                                        String(snapshot.reflexive),
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
                                    model.algebraCase === "Difference"
                                        ? "Difference is directional: values are kept only when they belong to the left set and not the right set."
                                        : "All relationships use the same Hash / Equal membership semantics as ordinary HashSet.has.",
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

const transform_label = (transformCase: HashSetDemo.TransformCase): string =>
    transformCase.toLowerCase()

const transform_view = <ParentMessage>(
    model: HashSetDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = HashSetDemo.transform_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Transform",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Map", "Filter", "Reduce"] as const).map(
                                    (
                                        transformCase: HashSetDemo.TransformCase
                                    ) =>
                                        choice_button(
                                            transform_label(transformCase),
                                            model.transformCase ===
                                                transformCase,
                                            HashSetDemo.Message.SelectedHashSetTransformCase(
                                                {
                                                    transformCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("input", snapshot.input, h),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "input size",
                                        String(snapshot.inputSize),
                                        h
                                    ),
                                    metric(
                                        "result size",
                                        String(snapshot.resultSize),
                                        h,
                                        "cyan"
                                    ),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Result + predicates",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("result", snapshot.result, h, "green"),
                            metric(
                                "reduced / note",
                                snapshot.reduced,
                                h,
                                "cyan"
                            ),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric("some", String(snapshot.some), h),
                                    metric(
                                        "every",
                                        String(snapshot.every),
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
                                    model.transformCase === "Map"
                                        ? "Three fruit names map to only two lengths because equal mapped values collapse into one HashSet member."
                                        : model.transformCase === "Filter"
                                          ? "filter keeps the original value type for a predicate and can also narrow it when given a TypeScript refinement."
                                          : "reduce consumes the unique set values into an arbitrary accumulator; it does not impose a semantic iteration order.",
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
    details: HashSetDemo.StageDetails,
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
    model: HashSetDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = HashSetDemo.stage_details[model.stage]

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
                                        ["effect / HashSet"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Immutable uniqueness with Effect Hash and Equal",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Construct unique persistent sets, test membership with structural equality, combine sets algebraically, and transform values while preserving set semantics.",
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
                                        ["20 exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["HashMap-backed"]
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
            model.stage === "Build"
                ? build_view(model, to_parent_message, h)
                : model.stage === "Membership"
                  ? membership_view(model, to_parent_message, h)
                  : model.stage === "Algebra"
                    ? algebra_view(model, to_parent_message, h)
                    : transform_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
