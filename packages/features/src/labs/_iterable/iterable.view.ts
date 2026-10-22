import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as IterableDemo from "./iterable.ts"

type ToParentMessage<ParentMessage> = (
    message: IterableDemo.Message
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
    message: IterableDemo.Message,
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
    model: IterableDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Iterable examples"),
        ],
        IterableDemo.stages.map((stage: IterableDemo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        IterableDemo.Message.SelectedIterableStage({ stage })
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
    details: IterableDemo.StageDetails,
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

const create_label = (createCase: IterableDemo.CreateCase): string =>
    createCase.toLowerCase()

const create_view = <ParentMessage>(
    model: IterableDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = IterableDemo.create_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Constructor",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Range",
                                        "Generate",
                                        "Repeat",
                                        "Unfold",
                                    ] as const
                                ).map((createCase: IterableDemo.CreateCase) =>
                                    choice_button(
                                        create_label(createCase),
                                        model.createCase === createCase,
                                        IterableDemo.Message.SelectedIterableCreateCase(
                                            {
                                                createCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("primary", snapshot.primary, h, "cyan"),
                            metric("secondary", snapshot.secondary, h),
                            metric("finite rule", snapshot.finite, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Iterable boundary",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "infinite value, bounded with take",
                                snapshot.infiniteBounded,
                                h,
                                "green"
                            ),
                            metric(
                                "fromRecord",
                                snapshot.recordEntries,
                                h,
                                "cyan"
                            ),
                            metric("empty size", String(snapshot.emptySize), h),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Constructors return normal Iterables. Materialization is an explicit consumer decision, which is why unbounded ranges and repeated sequences can be represented safely.",
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

const lazy_label = (lazyCase: IterableDemo.LazyCase): string =>
    lazyCase.toLowerCase()

const lazy_view = <ParentMessage>(
    model: IterableDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = IterableDemo.lazy_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Lazy pipeline",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Pipeline", "Combine", "Chunk"] as const).map(
                                    (lazyCase: IterableDemo.LazyCase) =>
                                        choice_button(
                                            lazy_label(lazyCase),
                                            model.lazyCase === lazyCase,
                                            IterableDemo.Message.SelectedIterableLazyCase(
                                                {
                                                    lazyCase,
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
                                        "visited before consumption",
                                        String(snapshot.beforeConsumption),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "visited after consumption",
                                        String(snapshot.afterConsumption),
                                        h,
                                        model.lazyCase === "Pipeline"
                                            ? "amber"
                                            : "default"
                                    ),
                                ]
                            ),
                            metric("detail", snapshot.detail, h, "cyan"),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Materialized sample",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("output", snapshot.output, h, "green"),
                            metric("related", snapshot.secondary, h, "cyan"),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    model.lazyCase === "Pipeline"
                                        ? "The source is infinite, but take stops after three passing values. filter and map are evaluated only as downstream iteration requests values."
                                        : model.lazyCase === "Combine"
                                          ? "prepend / append preserve order, intersperse inserts separators between values, and zip-style combinators stop at the shorter input."
                                          : "chunksOf emits arrays lazily and the final chunk may be shorter. flatten removes one iterable layer.",
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

const search_label = (searchCase: IterableDemo.SearchCase): string =>
    searchCase.toLowerCase()

const search_view = <ParentMessage>(
    model: IterableDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = IterableDemo.search_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Search mode",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Find", "Group", "Extract"] as const).map(
                                    (searchCase: IterableDemo.SearchCase) =>
                                        choice_button(
                                            search_label(searchCase),
                                            model.searchCase === searchCase,
                                            IterableDemo.Message.SelectedIterableSearchCase(
                                                {
                                                    searchCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            h.div(
                                [h.Class("grid grid-cols-3 gap-3")],
                                [
                                    metric("head", snapshot.head, h, "green"),
                                    metric(
                                        "findFirst > 2",
                                        snapshot.first,
                                        h,
                                        "cyan"
                                    ),
                                    metric("findLast = 1", snapshot.last, h),
                                ]
                            ),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "contains 3",
                                        String(snapshot.contains),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "containsWith case-insensitive",
                                        String(snapshot.customContains),
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
                "Grouping + extraction",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "group consecutive",
                                snapshot.grouped,
                                h,
                                "cyan"
                            ),
                            metric("groupBy parity", snapshot.groupBy, h),
                            metric(
                                "dedupeAdjacent",
                                snapshot.deduped,
                                h,
                                "green"
                            ),
                            metric(
                                "Option / Result extraction",
                                snapshot.extracted,
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

const fold_label = (foldCase: IterableDemo.FoldCase): string =>
    foldCase.toLowerCase()

const fold_view = <ParentMessage>(
    model: IterableDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = IterableDemo.fold_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Fold / combine",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Reduce", "Scan", "Product"] as const).map(
                                    (foldCase: IterableDemo.FoldCase) =>
                                        choice_button(
                                            fold_label(foldCase),
                                            model.foldCase === foldCase,
                                            IterableDemo.Message.SelectedIterableFoldCase(
                                                {
                                                    foldCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric(
                                "reduce sum",
                                String(snapshot.reduced),
                                h,
                                "green"
                            ),
                            metric("scan states", snapshot.scan, h, "cyan"),
                            metric("countBy even", String(snapshot.countBy), h),
                            metric("forEach visited", snapshot.visited, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Pairing semantics",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "cartesianWith",
                                snapshot.cartesian,
                                h,
                                "cyan"
                            ),
                            metric("zip", snapshot.zipped, h, "green"),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Cartesian composition emits every cross-pair. zip consumes corresponding positions and discards excess values from the longer iterable. scan stays lazy, while reduce / countBy / forEach consume the source.",
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
    details: IterableDemo.StageDetails,
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
    model: IterableDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = IterableDemo.stage_details[model.stage]

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
                                        ["effect / Iterable"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Lazy tools for ordinary JavaScript Iterables",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Generate finite or unbounded sequences, compose lazy transformations, search and group without forcing arrays first, then fold or pair values when a consumer is ready.",
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
                                        ["50 exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["lazy Iterable"]
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
            model.stage === "Create"
                ? create_view(model, to_parent_message, h)
                : model.stage === "Lazy"
                  ? lazy_view(model, to_parent_message, h)
                  : model.stage === "Search"
                    ? search_view(model, to_parent_message, h)
                    : fold_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
