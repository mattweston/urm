import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as OrderDemo from "./order.ts"

type ToParentMessage<ParentMessage> = (
    message: OrderDemo.Message
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
    message: OrderDemo.Message,
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
    model: OrderDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Order examples"),
        ],
        OrderDemo.stages.map((stage: OrderDemo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        OrderDemo.Message.SelectedOrderStage({ stage })
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
    details: OrderDemo.StageDetails,
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

const compare_view = <ParentMessage>(
    model: OrderDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = OrderDemo.compare_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Built-in comparison",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Builtins", "Custom", "Flip"] as const).map(
                                    (compareCase: OrderDemo.CompareCase) =>
                                        choice_button(
                                            compareCase.toLowerCase(),
                                            model.compareCase === compareCase,
                                            OrderDemo.Message.SelectedOrderCompareCase(
                                                {
                                                    compareCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("String", snapshot.string, h, "cyan"),
                            metric(
                                "Number equal",
                                snapshot.numberEqual,
                                h,
                                "green"
                            ),
                            metric("Boolean", snapshot.boolean, h),
                            metric("BigInt", snapshot.bigInt, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Special cases + reversal",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("Date", snapshot.date, h, "green"),
                            metric("NaN vs 1", snapshot.nan, h, "amber"),
                            metric(
                                "flip(Number): 1 vs 2",
                                snapshot.flipped,
                                h,
                                "cyan"
                            ),
                            metric("alwaysEqual", snapshot.alwaysEqual, h),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const derive_label = (value: OrderDemo.DeriveCase): string =>
    value === "MapInput" ? "mapInput" : value.toLowerCase()

const derive_view = <ParentMessage>(
    model: OrderDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = OrderDemo.derive_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Derived criteria",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["MapInput", "Date", "Sort"] as const).map(
                                    (deriveCase: OrderDemo.DeriveCase) =>
                                        choice_button(
                                            derive_label(deriveCase),
                                            model.deriveCase === deriveCase,
                                            OrderDemo.Message.SelectedOrderDeriveCase(
                                                {
                                                    deriveCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("by name", snapshot.byName, h, "cyan"),
                            metric("by age", snapshot.byAge, h, "green"),
                            metric("by active", snapshot.byActive, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Projection reuse",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "descending age",
                                snapshot.descendingAge,
                                h,
                                "cyan"
                            ),
                            metric(
                                "Date projection",
                                snapshot.dateProjection,
                                h,
                                "green"
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "mapInput lets the domain type reuse a carrier Order. The same comparator can then drive native sort or Effect collection sorting without changing the Person objects.",
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

const compose_label = (value: OrderDemo.ComposeCase): string =>
    value.toLowerCase()

const compose_view = <ParentMessage>(
    model: OrderDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = OrderDemo.compose_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Tie-breaking",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Combine",
                                        "Struct",
                                        "Collections",
                                    ] as const
                                ).map((composeCase: OrderDemo.ComposeCase) =>
                                    choice_button(
                                        compose_label(composeCase),
                                        model.composeCase === composeCase,
                                        OrderDemo.Message.SelectedOrderComposeCase(
                                            {
                                                composeCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric(
                                "age → name",
                                snapshot.ageThenName,
                                h,
                                "cyan"
                            ),
                            metric(
                                "Struct age → name → active",
                                snapshot.struct,
                                h,
                                "green"
                            ),
                            metric("combineAll", snapshot.combinedAll, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Tuple + Array lexicographic order",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                'Tuple: [1,"b"] vs [1,"a"]',
                                snapshot.tuple,
                                h,
                                "green"
                            ),
                            metric(
                                "Array: [1,2] vs [1,3]",
                                snapshot.arrayPrefix,
                                h,
                                "cyan"
                            ),
                            metric(
                                "Array: equal prefix, shorter length",
                                snapshot.arrayLength,
                                h,
                                "amber"
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "All composition helpers stop at the first non-zero result. That makes the declaration order itself the tie-breaking priority.",
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

const range_view = <ParentMessage>(
    model: OrderDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = OrderDemo.range_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Predicates + extrema",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    ["Predicates", "Bounds", "Reducer"] as const
                                ).map((rangeCase: OrderDemo.RangeCase) =>
                                    choice_button(
                                        rangeCase.toLowerCase(),
                                        model.rangeCase === rangeCase,
                                        OrderDemo.Message.SelectedOrderRangeCase(
                                            {
                                                rangeCase,
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
                                        "1 < 2",
                                        String(snapshot.less),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "3 > 2",
                                        String(snapshot.greater),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "2 ≤ 2",
                                        String(snapshot.lessEqual),
                                        h
                                    ),
                                    metric(
                                        "2 ≥ 2",
                                        String(snapshot.greaterEqual),
                                        h
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "min(5, 2)",
                                        String(snapshot.min),
                                        h,
                                        "cyan"
                                    ),
                                    metric(
                                        "max(5, 2)",
                                        String(snapshot.max),
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
                "Inclusive range + reducer",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "clamp 5 / 15 / 25 to [10,20]",
                                `${snapshot.clampLow} · ${snapshot.clampMid} · ${snapshot.clampHigh}`,
                                h,
                                "cyan"
                            ),
                            metric(
                                "isBetween lower edge",
                                String(snapshot.betweenEdge),
                                h,
                                "green"
                            ),
                            metric(
                                "isBetween outside",
                                String(snapshot.betweenOutside),
                                h,
                                "amber"
                            ),
                            metric(
                                "makeReducer(age, name)",
                                snapshot.reducer,
                                h
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
    details: OrderDemo.StageDetails,
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
    model: OrderDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = OrderDemo.stage_details[model.stage]

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
                                        ["effect / Order"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Total ordering, derivation, tie-breaking, and range logic",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Compare primitive and domain values, derive Orders through projections, compose lexicographic criteria, and reuse one ordering for predicates, extrema, clamping, and range checks.",
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
                                        ["25 exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["-1 · 0 · 1"]
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
            model.stage === "Compare"
                ? compare_view(model, to_parent_message, h)
                : model.stage === "Derive"
                  ? derive_view(model, to_parent_message, h)
                  : model.stage === "Compose"
                    ? compose_view(model, to_parent_message, h)
                    : range_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
