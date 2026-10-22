import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as HashRingDemo from "./hash-ring.ts"

type ToParentMessage<ParentMessage> = (
    message: HashRingDemo.Message
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
    message: HashRingDemo.Message,
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
    model: HashRingDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect HashRing examples"),
        ],
        HashRingDemo.stages.map((stage: HashRingDemo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        HashRingDemo.Message.SelectedHashRingStage({ stage })
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
    details: HashRingDemo.StageDetails,
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

const build_view = <ParentMessage>(
    model: HashRingDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = HashRingDemo.build_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Registration",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Add", "AddMany", "Identity"] as const).map(
                                    (buildCase: HashRingDemo.BuildCase) =>
                                        choice_button(
                                            buildCase,
                                            model.buildCase === buildCase,
                                            HashRingDemo.Message.SelectedHashRingBuildCase(
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
                                        "baseWeight",
                                        String(snapshot.baseWeight),
                                        h,
                                        "cyan"
                                    ),
                                    metric(
                                        "nodes",
                                        String(snapshot.nodeCount),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "virtual points",
                                        String(snapshot.virtualPoints),
                                        h
                                    ),
                                    metric(
                                        "isHashRing",
                                        String(snapshot.isHashRing),
                                        h,
                                        "green"
                                    ),
                                ]
                            ),
                            metric(
                                "mutator returned same ring",
                                String(snapshot.sameInstance),
                                h,
                                "amber"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "PrimaryKey identity",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("iterated keys", snapshot.keys, h, "cyan"),
                            metric(
                                "fresh same-key node is member",
                                String(snapshot.primaryIdentity),
                                h,
                                "green"
                            ),
                            metric(
                                "stored cache-a region",
                                snapshot.updatedRegion,
                                h
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "PrimaryKey.value is the membership identity. Object identity and fields outside that string do not create a second ring member.",
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

const route_view = <ParentMessage>(
    model: HashRingDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = HashRingDemo.route_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Routing",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Single", "Remap", "Empty"] as const).map(
                                    (routeCase: HashRingDemo.RouteCase) =>
                                        choice_button(
                                            routeCase,
                                            model.routeCase === routeCase,
                                            HashRingDemo.Message.SelectedHashRingRouteCase(
                                                {
                                                    routeCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("input", snapshot.input, h, "cyan"),
                            metric(
                                "owner",
                                snapshot.owner,
                                h,
                                snapshot.owner === "undefined"
                                    ? "amber"
                                    : "green"
                            ),
                            metric("empty ring get", snapshot.emptyResult, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Consistent remapping sample",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "before add(cache-d)",
                                snapshot.beforeCounts,
                                h
                            ),
                            metric(
                                "after add(cache-d)",
                                snapshot.afterCounts,
                                h,
                                "cyan"
                            ),
                            h.div(
                                [h.Class("grid grid-cols-3 gap-3")],
                                [
                                    metric(
                                        "sample keys",
                                        String(snapshot.total),
                                        h
                                    ),
                                    metric(
                                        "unchanged",
                                        String(snapshot.unchanged),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "remapped",
                                        String(snapshot.remapped),
                                        h,
                                        "amber"
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
                                    "The sample is computed from real HashRing.get calls. Consistent hashing aims to leave most unrelated keys on their existing nodes when membership changes.",
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

const weights_view = <ParentMessage>(
    model: HashRingDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = HashRingDemo.weight_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Capacity model",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    ["Balanced", "Weighted", "Clamp"] as const
                                ).map((weightCase: HashRingDemo.WeightCase) =>
                                    choice_button(
                                        weightCase,
                                        model.weightCase === weightCase,
                                        HashRingDemo.Message.SelectedHashRingWeightCase(
                                            {
                                                weightCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric(
                                "baseWeight",
                                String(snapshot.baseWeight),
                                h,
                                "cyan"
                            ),
                            metric("stored weights", snapshot.weights, h),
                            metric(
                                "totalWeightCache",
                                String(snapshot.totalWeight),
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Virtual point effect",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "points per node",
                                snapshot.pointCounts,
                                h,
                                "cyan"
                            ),
                            metric(
                                "total points",
                                String(snapshot.totalPoints),
                                h,
                                "green"
                            ),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "same-key update",
                                        String(snapshot.sameKeyUpdate),
                                        h
                                    ),
                                    metric(
                                        "cache-a region",
                                        snapshot.regionAfterUpdate,
                                        h
                                    ),
                                    metric(
                                        "remove by same PrimaryKey",
                                        String(snapshot.removed),
                                        h
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

const shards_view = <ParentMessage>(
    model: HashRingDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = HashRingDemo.shard_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.72fr_1.28fr]")],
        [
            panel(
                "Shard request",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    ["Balanced", "Weighted", "Counts"] as const
                                ).map((shardCase: HashRingDemo.ShardCase) =>
                                    choice_button(
                                        shardCase,
                                        model.shardCase === shardCase,
                                        HashRingDemo.Message.SelectedHashRingShardCase(
                                            {
                                                shardCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric(
                                "requested count",
                                snapshot.requested,
                                h,
                                "cyan"
                            ),
                            metric(
                                "assigned shards",
                                String(snapshot.assigned),
                                h,
                                "green"
                            ),
                            metric("ownership counts", snapshot.ownership, h),
                            metric(
                                "empty ring",
                                snapshot.emptyRing,
                                h,
                                "amber"
                            ),
                            metric("count = 0", snapshot.zeroCount, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Shard → node",
                [
                    h.pre(
                        [
                            h.Class(
                                "max-h-72 overflow-auto whitespace-pre-wrap p-5 font-mono text-xs leading-5"
                            ),
                        ],
                        [h.code([], [snapshot.sequence])]
                    ),
                ],
                h
            ),
        ]
    )
}

const notice_panel = <ParentMessage>(
    details: HashRingDemo.StageDetails,
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
    model: HashRingDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = HashRingDemo.stage_details[model.stage]

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
                                        ["effect / HashRing"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Weighted consistent hashing for nodes and shards",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Register PrimaryKey nodes, route arbitrary strings with stable remapping, tune capacity through weights, and precompute fixed shard ownership.",
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
                                        ["9 exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["mutable weighted ring"]
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
                : model.stage === "Route"
                  ? route_view(model, to_parent_message, h)
                  : model.stage === "Weights"
                    ? weights_view(model, to_parent_message, h)
                    : shards_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
