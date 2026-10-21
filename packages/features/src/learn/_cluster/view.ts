import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Cluster from "./examples/cluster.ts"

type ToParentMessage<ParentMessage> = (
    message: Cluster.Message
) => ParentMessage

const PANEL_CLASS =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"

const panel = <ParentMessage>(
    label: string,
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
                        [label]
                    ),
                ]
            ),
            ...children,
        ]
    )

const action = <ParentMessage>(
    label: string,
    message: Cluster.Message,
    to_parent_message: ToParentMessage<ParentMessage>,
    is_disabled: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(message),
            isDisabled: is_disabled,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-3 py-2 text-xs font-semibold tracking-wide transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-40"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const stage_tabs = <ParentMessage>(
    model: Cluster.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Cluster examples"),
        ],
        Cluster.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        Cluster.SelectedClusterStage({ stage })
                    ),
                    isDisabled: stage === model.stage,
                    toView: (attributes) =>
                        h.button(
                            [
                                ...attributes.button,
                                h.Class(
                                    stage === model.stage
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

const controls = <ParentMessage>(
    children: ReadonlyArray<Html>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "flex flex-wrap gap-2 border-t-(length:--surface-border-width) border-border p-4"
            ),
        ],
        children
    )

const counter_card = <ParentMessage>(
    entity_id: string,
    count: number,
    increment_message: Cluster.Message,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                    ),
                ],
                ["Counter entity"]
            ),
            h.div(
                [h.Class("mt-1 font-mono text-sm font-semibold")],
                [entity_id]
            ),
            h.div(
                [
                    h.Class(
                        "my-5 text-center font-mono text-4xl font-bold tabular-nums"
                    ),
                ],
                [String(count)]
            ),
            action("Increment", increment_message, to_parent_message, false, h),
        ]
    )

const entity_view = <ParentMessage>(
    model: Cluster.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · one Entity type, many identities",
                [
                    h.div(
                        [h.Class("grid gap-4 p-5 md:grid-cols-2")],
                        [
                            counter_card(
                                "counter-123",
                                model.counter_a,
                                Cluster.ClickedIncrementCounterA(),
                                to_parent_message,
                                h
                            ),
                            counter_card(
                                "counter-456",
                                model.counter_b,
                                Cluster.ClickedIncrementCounterB(),
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Reset counters",
                                Cluster.ClickedResetClusterCounters(),
                                to_parent_message,
                                false,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Mental model",
                [
                    h.div(
                        [
                            h.Class(
                                "space-y-3 px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            h.p(
                                [],
                                [
                                    "Entity.make defines the distributed protocol once. The entity ID selects one logical stateful instance.",
                                ]
                            ),
                            h.p(
                                [],
                                [
                                    "The same Counter protocol can therefore back many independent counters without defining a separate service for every ID.",
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const entity_choice = <ParentMessage>(
    entity_id: Cluster.EntityId,
    model: Cluster.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        entity_id,
        Cluster.SelectedClusterEntityId({ entity_id }),
        to_parent_message,
        model.routing_entity_id === entity_id,
        h
    )

const route_node = <ParentMessage>(
    kicker: string,
    value: string,
    tone: "normal" | "accent" | "runner",
    h: HtmlBuilder<ParentMessage>
): Html => {
    const class_name =
        tone === "accent"
            ? "border-violet-500/40 bg-violet-500/5"
            : tone === "runner"
              ? "border-sky-500/40 bg-sky-500/5"
              : "border-border bg-background"

    return h.div(
        [
            h.Class(
                `rounded-[var(--radius-surface)] border p-4 text-center ${class_name}`
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                    ),
                ],
                [kicker]
            ),
            h.div([h.Class("mt-2 font-mono text-sm font-semibold")], [value]),
        ]
    )
}

const routing_view = <ParentMessage>(
    model: Cluster.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const shard_id = Cluster.demo_shard_id(model.routing_entity_id)
    const runner = Cluster.routed_runner(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · Entity → shard → runner",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            entity_choice(
                                "counter-123",
                                model,
                                to_parent_message,
                                h
                            ),
                            entity_choice(
                                "counter-456",
                                model,
                                to_parent_message,
                                h
                            ),
                            entity_choice(
                                "cart-9",
                                model,
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-3 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            route_node(
                                "Entity address",
                                model.routing_entity_id,
                                "normal",
                                h
                            ),
                            h.span(
                                [h.Class("text-center text-muted-foreground")],
                                ["→"]
                            ),
                            route_node(
                                "Shard",
                                `default / ${shard_id}`,
                                "accent",
                                h
                            ),
                            h.span(
                                [h.Class("text-center text-muted-foreground")],
                                ["→"]
                            ),
                            route_node("Owning runner", runner, "runner", h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "What the client knows",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "The client addresses the logical Entity by type + entity ID. Sharding resolves that ID to a shard and routes the RPC to whichever runner currently owns it.",
                        ]
                    ),
                    h.p(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-3 text-xs leading-5 text-muted-foreground"
                            ),
                        ],
                        [
                            "The shard mapping shown here is illustrative. The real runtime computes it through Sharding.getShardId using the configured shard group and shard count.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const shard_chip = <ParentMessage>(
    shard_id: number,
    owner: string,
    has_moved: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                has_moved
                    ? "rounded-[var(--radius-surface)] border border-amber-500/50 bg-amber-500/5 px-2 py-2 text-center"
                    : "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-2 py-2 text-center"
            ),
        ],
        [
            h.div(
                [h.Class("font-mono text-xs font-semibold")],
                [`s${shard_id}`]
            ),
            h.div(
                [
                    h.Class(
                        has_moved
                            ? "mt-1 font-mono text-[9px] text-amber-600"
                            : "mt-1 font-mono text-[9px] text-muted-foreground"
                    ),
                ],
                [owner.replace("runner-", "")]
            ),
        ]
    )

const rebalance_view = <ParentMessage>(
    model: Cluster.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const moved = Cluster.moved_shards()
    const runners = Cluster.runner_names(model.has_third_runner)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · runners change, Entity addresses do not",
                [
                    h.div(
                        [h.Class("p-5")],
                        [
                            h.div(
                                [h.Class("mb-4 flex flex-wrap gap-2")],
                                runners.map((runner) =>
                                    h.div(
                                        [
                                            h.Class(
                                                "rounded-full border border-sky-500/30 bg-sky-500/5 px-3 py-1.5 font-mono text-xs text-sky-500"
                                            ),
                                        ],
                                        [runner]
                                    )
                                )
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "grid grid-cols-4 gap-2 sm:grid-cols-6"
                                    ),
                                ],
                                Array.from({ length: 12 }, (_, index) => {
                                    const shard_id = index + 1
                                    return shard_chip(
                                        shard_id,
                                        Cluster.owner_for_shard(
                                            shard_id,
                                            model.has_third_runner
                                        ),
                                        model.has_third_runner &&
                                            moved.includes(shard_id),
                                        h
                                    )
                                })
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                model.has_third_runner
                                    ? "Remove runner-c"
                                    : "Add runner-c",
                                Cluster.ClickedToggleThirdRunner(),
                                to_parent_message,
                                false,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Rebalance",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            model.has_third_runner
                                ? `${moved.length} teaching shards changed owner when runner-c joined. Clients still address counter-123 as counter-123.`
                                : "With two runners, each shard has one current owner. Adding another healthy runner can redistribute shard ownership.",
                        ]
                    ),
                    h.p(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-3 text-xs leading-5 text-muted-foreground"
                            ),
                        ],
                        [
                            "The boxes use a simple teaching assignment. The real cluster uses runner membership, shard groups, weights, and its runtime assignment algorithm.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const lifecycle_badge = <ParentMessage>(
    status: Cluster.LifecycleStatus,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const class_name =
        status === "Active"
            ? "border-emerald-500/40 text-emerald-600"
            : status === "Passivated"
              ? "border-amber-500/40 text-amber-600"
              : "border-border text-muted-foreground"

    return h.span(
        [
            h.Class(
                `rounded-full border px-2 py-1 font-mono text-[10px] font-semibold tracking-wider uppercase ${class_name}`
            ),
        ],
        [status]
    )
}

const log_view = <ParentMessage>(
    entries: ReadonlyArray<string>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    entries.length === 0
        ? h.div(
              [h.Class("px-5 py-8 text-center text-sm text-muted-foreground")],
              ["No activation yet."]
          )
        : h.div(
              [],
              entries.map((entry, index) =>
                  h.div(
                      [
                          h.Class(
                              "grid grid-cols-[2.5rem_1fr] gap-3 border-t-(length:--surface-border-width) border-border px-5 py-3 first:border-t-0"
                          ),
                      ],
                      [
                          h.span(
                              [
                                  h.Class(
                                      "font-mono text-xs text-muted-foreground"
                                  ),
                              ],
                              [String(index + 1).padStart(2, "0")]
                          ),
                          h.span([h.Class("font-mono text-xs")], [entry]),
                      ]
                  )
              )
          )

const lifecycle_view = <ParentMessage>(
    model: Cluster.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · activation and passivation",
                [
                    h.div(
                        [h.Class("p-5")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-5"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "flex items-start justify-between gap-3"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [],
                                                [
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                                            ),
                                                        ],
                                                        [
                                                            "Counter / counter-123",
                                                        ]
                                                    ),
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "mt-1 font-mono text-xs text-muted-foreground"
                                                            ),
                                                        ],
                                                        [
                                                            `activation generation ${model.lifecycle_generation}`,
                                                        ]
                                                    ),
                                                ]
                                            ),
                                            lifecycle_badge(
                                                model.lifecycle_status,
                                                h
                                            ),
                                        ]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "my-6 text-center font-mono text-5xl font-bold tabular-nums"
                                            ),
                                        ],
                                        [String(model.lifecycle_count)]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "text-center text-xs text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            model.lifecycle_status === "Active"
                                                ? "in-memory Ref is alive on the owning runner"
                                                : model.lifecycle_status ===
                                                    "Passivated"
                                                  ? "activation stopped; no Ref is resident"
                                                  : "no active handler yet",
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Activate",
                                Cluster.ClickedActivateClusterEntity(),
                                to_parent_message,
                                model.lifecycle_status !== "Dormant",
                                h
                            ),
                            action(
                                "Increment",
                                Cluster.ClickedIncrementActiveClusterEntity(),
                                to_parent_message,
                                model.lifecycle_status !== "Active",
                                h
                            ),
                            action(
                                "Passivate",
                                Cluster.ClickedPassivateClusterEntity(),
                                to_parent_message,
                                model.lifecycle_status !== "Active",
                                h
                            ),
                            action(
                                "Reactivate",
                                Cluster.ClickedReactivateClusterEntity(),
                                to_parent_message,
                                model.lifecycle_status !== "Passivated",
                                h
                            ),
                            action(
                                "Reset",
                                Cluster.ClickedResetClusterLifecycle(),
                                to_parent_message,
                                false,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel("Lifecycle log", [log_view(model.lifecycle_log, h)], h),
            panel(
                "Persisted message ≠ persisted Ref",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "ClusterSchema.Persisted controls message persistence. The Ref in this Counter handler is only in-memory state for one activation. After passivation, a later activation creates a new Ref unless your application stores state somewhere durable.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )

export const view = <ParentMessage>(
    model: Cluster.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Entity"
                ? entity_view(model, to_parent_message, h)
                : model.stage === "Routing"
                  ? routing_view(model, to_parent_message, h)
                  : model.stage === "Rebalance"
                    ? rebalance_view(model, to_parent_message, h)
                    : lifecycle_view(model, to_parent_message, h),
        ]
    )
