import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as PredicateDemo from "./predicate.ts"

type ToParentMessage<ParentMessage> = (
    message: PredicateDemo.Message
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
    message: PredicateDemo.Message,
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
    model: PredicateDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Predicate examples"),
        ],
        PredicateDemo.stages.map((stage: PredicateDemo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        PredicateDemo.Message.SelectedPredicateStage({
                            stage,
                        })
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
    details: PredicateDemo.StageDetails,
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

const guard_view = <ParentMessage>(
    model: PredicateDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = PredicateDemo.guard_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Runtime guards",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    ["Primitive", "Nullish", "Runtime"] as const
                                ).map((guardCase: PredicateDemo.GuardCase) =>
                                    choice_button(
                                        guardCase.toLowerCase(),
                                        model.guardCase === guardCase,
                                        PredicateDemo.Message.SelectedPredicateGuardCase(
                                            {
                                                guardCase,
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
                                        "isString",
                                        String(snapshot.string),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "isNumber",
                                        String(snapshot.number),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "NaN isNumber",
                                        String(snapshot.nanIsNumber),
                                        h,
                                        "amber"
                                    ),
                                    metric(
                                        "isNullish(null)",
                                        String(snapshot.nullish),
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
                "Object / iterable distinctions",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "isObject({})",
                                        String(snapshot.object),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "isObject([])",
                                        String(snapshot.arrayIsObject),
                                        h,
                                        "amber"
                                    ),
                                    metric(
                                        "isObjectOrArray([])",
                                        String(snapshot.arrayIsObjectOrArray),
                                        h,
                                        "cyan"
                                    ),
                                    metric(
                                        "function isObjectKeyword",
                                        String(
                                            snapshot.functionIsObjectKeyword
                                        ),
                                        h
                                    ),
                                ]
                            ),
                            metric(
                                "string isIterable",
                                String(snapshot.iterableString),
                                h,
                                "green"
                            ),
                            metric(
                                "structural PromiseLike",
                                String(snapshot.promiseLike),
                                h,
                                "cyan"
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const shape_view = <ParentMessage>(
    model: PredicateDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = PredicateDemo.shape_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Property + tag",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Property", "Tuple", "Struct"] as const).map(
                                    (shapeCase: PredicateDemo.ShapeCase) =>
                                        choice_button(
                                            shapeCase.toLowerCase(),
                                            model.shapeCase === shapeCase,
                                            PredicateDemo.Message.SelectedPredicateShapeCase(
                                                {
                                                    shapeCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric(
                                "hasProperty(id)",
                                String(snapshot.hasId),
                                h,
                                "green"
                            ),
                            metric(
                                "missing id",
                                String(snapshot.hasMissing),
                                h,
                                "amber"
                            ),
                            metric(
                                'isTagged("Ok")',
                                String(snapshot.okTag),
                                h,
                                "cyan"
                            ),
                            metric("wrong tag", String(snapshot.wrongTag), h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Tuple + Struct",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "[number, string]",
                                        String(snapshot.tuple),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "wrong tuple",
                                        String(snapshot.tupleWrong),
                                        h,
                                        "amber"
                                    ),
                                    metric(
                                        "isTupleOf(2)",
                                        String(snapshot.exactTwo),
                                        h,
                                        "cyan"
                                    ),
                                    metric(
                                        "isTupleOfAtLeast(2)",
                                        String(snapshot.atLeastTwo),
                                        h
                                    ),
                                ]
                            ),
                            metric(
                                "Struct user",
                                String(snapshot.struct),
                                h,
                                "green"
                            ),
                            metric(
                                "extra fields",
                                snapshot.extraKeys,
                                h,
                                "cyan"
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const combine_view = <ParentMessage>(
    model: PredicateDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = PredicateDemo.combine_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Boolean algebra",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Boolean",
                                        "Collections",
                                        "Projection",
                                    ] as const
                                ).map(
                                    (combineCase: PredicateDemo.CombineCase) =>
                                        choice_button(
                                            combineCase.toLowerCase(),
                                            model.combineCase === combineCase,
                                            PredicateDemo.Message.SelectedPredicateCombineCase(
                                                {
                                                    combineCase,
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
                                        "and true",
                                        String(snapshot.andTrue),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "and false",
                                        String(snapshot.andFalse),
                                        h,
                                        "amber"
                                    ),
                                    metric(
                                        "or",
                                        String(snapshot.or),
                                        h,
                                        "cyan"
                                    ),
                                    metric("not", String(snapshot.not), h),
                                    metric("xor", String(snapshot.xor), h),
                                    metric("eqv", String(snapshot.eqv), h),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Rules + dynamic collections",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "implies",
                                        String(snapshot.implies),
                                        h,
                                        "green"
                                    ),
                                    metric("nor", String(snapshot.nor), h),
                                    metric("nand", String(snapshot.nand), h),
                                    metric(
                                        "every",
                                        String(snapshot.every),
                                        h,
                                        "cyan"
                                    ),
                                    metric(
                                        "some",
                                        String(snapshot.some),
                                        h,
                                        "cyan"
                                    ),
                                    metric(
                                        "mapInput",
                                        String(snapshot.projected),
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

const refine_view = <ParentMessage>(
    model: PredicateDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = PredicateDemo.refine_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Predicate vs Refinement",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Narrow", "Compose", "Types"] as const).map(
                                    (refineCase: PredicateDemo.RefineCase) =>
                                        choice_button(
                                            refineCase.toLowerCase(),
                                            model.refineCase === refineCase,
                                            PredicateDemo.Message.SelectedPredicateRefineCase(
                                                {
                                                    refineCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("Predicate", snapshot.predicate, h),
                            metric(
                                "Refinement",
                                snapshot.refinement,
                                h,
                                "cyan"
                            ),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        'compose("effect")',
                                        String(snapshot.composeHit),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        'compose("")',
                                        String(snapshot.composeMiss),
                                        h,
                                        "amber"
                                    ),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Narrowing algebra",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("or refinements", snapshot.union, h, "cyan"),
                            metric(
                                "and refinements",
                                snapshot.intersection,
                                h,
                                "green"
                            ),
                            metric("type utilities", snapshot.utilityTypes, h),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const notice_panel = <ParentMessage>(
    details: PredicateDemo.StageDetails,
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
    model: PredicateDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = PredicateDemo.stage_details[model.stage]

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
                                        ["effect / Predicate"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Runtime guards, structural checks, boolean algebra, and type refinement",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Narrow unknown values, validate tuple and object shapes, compose reusable boolean rules, and preserve TypeScript refinement information through combinators.",
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
                                        ["50 top-level exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["guards + refinements"]
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
            model.stage === "Guard"
                ? guard_view(model, to_parent_message, h)
                : model.stage === "Shape"
                  ? shape_view(model, to_parent_message, h)
                  : model.stage === "Combine"
                    ? combine_view(model, to_parent_message, h)
                    : refine_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
