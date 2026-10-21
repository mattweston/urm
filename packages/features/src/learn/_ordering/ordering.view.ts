import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as OrderingDemo from "./ordering.ts"

type ToParentMessage<ParentMessage> = (
    message: OrderingDemo.Message
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
    message: OrderingDemo.Message,
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
    model: OrderingDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Ordering examples"),
        ],
        OrderingDemo.stages.map((stage: OrderingDemo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        OrderingDemo.Message.SelectedOrderingStage({ stage })
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
    details: OrderingDemo.StageDetails,
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

const values_view = <ParentMessage>(
    model: OrderingDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = OrderingDemo.values_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.74fr_1.26fr]")],
        [
            panel(
                "Three values",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Less", "Equal", "Greater"] as const).map(
                                    (valuesCase: OrderingDemo.ValuesCase) =>
                                        choice_button(
                                            valuesCase.toLowerCase(),
                                            model.valuesCase === valuesCase,
                                            OrderingDemo.Message.SelectedOrderingValuesCase(
                                                {
                                                    valuesCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("-1", snapshot.less, h, "cyan"),
                            metric("0", snapshot.equal, h, "green"),
                            metric("1", snapshot.greater, h, "amber"),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Type relationship",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("domain", snapshot.domain, h, "cyan"),
                            metric(
                                "Order relationship",
                                snapshot.orderRelationship,
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
                                    "Ordering is the normalized comparison result itself. Order<A> is the reusable function that produces that result for two A values.",
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

const reverse_view = <ParentMessage>(
    model: OrderingDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = OrderingDemo.reverse_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.74fr_1.26fr]")],
        [
            panel(
                "Reverse table",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Less", "Equal", "Greater"] as const).map(
                                    (reverseCase: OrderingDemo.ReverseCase) =>
                                        choice_button(
                                            reverseCase.toLowerCase(),
                                            model.reverseCase === reverseCase,
                                            OrderingDemo.Message.SelectedOrderingReverseCase(
                                                {
                                                    reverseCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("less", snapshot.less, h, "cyan"),
                            metric("equal", snapshot.equal, h, "green"),
                            metric("greater", snapshot.greater, h, "amber"),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Sort direction",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "ascending compare(1,2)",
                                snapshot.ascending,
                                h,
                                "green"
                            ),
                            metric(
                                "reversed compare(1,2)",
                                snapshot.descending,
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
                                    "reverse works on a computed Ordering. If you already have an Order comparator and want to reverse every comparison, Order.flip is the higher-level helper.",
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

const match_label = (value: OrderingDemo.MatchCase): string =>
    value === "DataFirst"
        ? "data first"
        : value === "DataLast"
          ? "data last"
          : "branches"

const match_view = <ParentMessage>(
    model: OrderingDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = OrderingDemo.match_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.74fr_1.26fr]")],
        [
            panel(
                "Pattern match",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "DataFirst",
                                        "DataLast",
                                        "Branches",
                                    ] as const
                                ).map((matchCase: OrderingDemo.MatchCase) =>
                                    choice_button(
                                        match_label(matchCase),
                                        model.matchCase === matchCase,
                                        OrderingDemo.Message.SelectedOrderingMatchCase(
                                            {
                                                matchCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("-1 branch", snapshot.less, h, "cyan"),
                            metric("0 branch", snapshot.equal, h, "green"),
                            metric("1 branch", snapshot.greater, h, "amber"),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Dual forms + laziness",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "data first: match(1, options)",
                                snapshot.dataFirst,
                                h,
                                "green"
                            ),
                            metric(
                                "data last: match(options)(-1)",
                                snapshot.dataLast,
                                h,
                                "cyan"
                            ),
                            metric(
                                "handler evaluation",
                                snapshot.laziness,
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

const reduce_label = (value: OrderingDemo.ReduceCase): string =>
    value === "CombineAll" ? "combineAll" : value.toLowerCase()

const reduce_view = <ParentMessage>(
    model: OrderingDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = OrderingDemo.reduce_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.74fr_1.26fr]")],
        [
            panel(
                "Reducer",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Combine",
                                        "CombineAll",
                                        "Priority",
                                    ] as const
                                ).map((reduceCase: OrderingDemo.ReduceCase) =>
                                    choice_button(
                                        reduce_label(reduceCase),
                                        model.reduceCase === reduceCase,
                                        OrderingDemo.Message.SelectedOrderingReduceCase(
                                            {
                                                reduceCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric(
                                "identity",
                                String(snapshot.identity),
                                h,
                                "green"
                            ),
                            metric(
                                "combine(0, 1)",
                                String(snapshot.zeroThenOne),
                                h,
                                "cyan"
                            ),
                            metric(
                                "combine(-1, 1)",
                                String(snapshot.firstNonZero),
                                h,
                                "amber"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Priority chain",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "all zero",
                                        String(snapshot.allZero),
                                        h
                                    ),
                                    metric(
                                        "0 · 0 · 1 · -1",
                                        String(snapshot.sequence),
                                        h,
                                        "cyan"
                                    ),
                                ]
                            ),
                            metric(
                                "person: age decides",
                                snapshot.personAgeWins,
                                h,
                                "green"
                            ),
                            metric(
                                "person: name breaks age tie",
                                snapshot.personNameBreaksTie,
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

const notice_panel = <ParentMessage>(
    details: OrderingDemo.StageDetails,
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
    model: OrderingDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = OrderingDemo.stage_details[model.stage]

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
                                        ["effect / Ordering"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "The three comparison results, made reusable",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Model normalized comparison outcomes, reverse a result, branch exhaustively with lazy handlers, and combine prioritized comparison results with a first-nonzero reducer.",
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
            model.stage === "Values"
                ? values_view(model, to_parent_message, h)
                : model.stage === "Reverse"
                  ? reverse_view(model, to_parent_message, h)
                  : model.stage === "Match"
                    ? match_view(model, to_parent_message, h)
                    : reduce_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
