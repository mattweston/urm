import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as GraphDemo from "./graph.ts"

type ToParentMessage<ParentMessage> = (
    message: GraphDemo.Message
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
    message: GraphDemo.Message,
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
    model: GraphDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Graph examples"),
        ],
        GraphDemo.stages.map((stage: GraphDemo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        GraphDemo.Message.SelectedGraphStage({ stage })
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
    details: GraphDemo.StageDetails,
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
    model: GraphDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = GraphDemo.build_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.74fr_1.26fr]")],
        [
            panel(
                "Graph kind",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                [
                                    choice_button(
                                        "directed",
                                        model.buildCase === "Directed",
                                        GraphDemo.Message.SelectedGraphBuildCase(
                                            {
                                                buildCase: "Directed",
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    ),
                                    choice_button(
                                        "undirected",
                                        model.buildCase === "Undirected",
                                        GraphDemo.Message.SelectedGraphBuildCase(
                                            {
                                                buildCase: "Undirected",
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    ),
                                ]
                            ),
                            metric("type", snapshot.kind, h, "cyan"),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "nodes",
                                        String(snapshot.nodeCount),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "edges",
                                        String(snapshot.edgeCount),
                                        h
                                    ),
                                ]
                            ),
                            metric(
                                "isGraph",
                                String(snapshot.isGraph),
                                h,
                                "green"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Indexes + adjacency",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("active nodes", snapshot.nodes, h, "cyan"),
                            metric("relation 1", snapshot.firstRelation, h),
                            metric("relation 2", snapshot.secondRelation, h),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    model.buildCase === "Directed"
                                        ? "Directed graphs expose successors and predecessors separately. The numeric indexes remain stable identifiers for later queries and algorithms."
                                        : "Undirected adjacency is symmetric: the same stored edge connects both endpoints for neighbor queries.",
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

const traverse_label = (traverseCase: GraphDemo.TraverseCase): string =>
    traverseCase === "PostOrder" ? "postorder" : traverseCase.toLowerCase()

const traverse_view = <ParentMessage>(
    model: GraphDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = GraphDemo.traverse_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Traversal",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    ["BFS", "DFS", "PostOrder", "Topo"] as const
                                ).map((traverseCase: GraphDemo.TraverseCase) =>
                                    choice_button(
                                        traverse_label(traverseCase),
                                        model.traverseCase === traverseCase,
                                        GraphDemo.Message.SelectedGraphTraverseCase(
                                            {
                                                traverseCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("start", snapshot.start, h, "cyan"),
                            metric("order meaning", snapshot.orderMeaning, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "NodeWalker projection",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("indices", snapshot.indices, h),
                            metric("values", snapshot.values, h, "cyan"),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "incoming externals / sources",
                                        snapshot.sources,
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "outgoing externals / sinks",
                                        snapshot.sinks,
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
        ]
    )
}

const algorithm_label = (algorithmCase: GraphDemo.AlgorithmCase): string =>
    algorithmCase === "ShortestPath"
        ? "Dijkstra"
        : algorithmCase === "Cycles"
          ? "cycles"
          : "SCCs"

const algorithms_view = <ParentMessage>(
    model: GraphDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = GraphDemo.algorithm_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Algorithm family",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "ShortestPath",
                                        "Cycles",
                                        "Components",
                                    ] as const
                                ).map(
                                    (algorithmCase: GraphDemo.AlgorithmCase) =>
                                        choice_button(
                                            algorithm_label(algorithmCase),
                                            model.algorithmCase ===
                                                algorithmCase,
                                            GraphDemo.Message.SelectedGraphAlgorithmCase(
                                                {
                                                    algorithmCase,
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
                                        "dependency DAG acyclic",
                                        String(snapshot.acyclic),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "cycle graph acyclic",
                                        String(snapshot.cycleAcyclic),
                                        h,
                                        snapshot.cycleAcyclic
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
                "Result",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                snapshot.primaryLabel,
                                snapshot.primary,
                                h,
                                "cyan"
                            ),
                            metric(
                                snapshot.secondaryLabel,
                                snapshot.secondary,
                                h
                            ),
                            metric("note", snapshot.note, h),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Graph's algorithm surface is much broader than this stage: it also includes A*, Bellman–Ford, Floyd–Warshall, simple/all shortest paths, spanning forests, articulation points, bridges, bipartite matching, maximum flow, minimum cut, and reductions.",
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

const snapshot_label = (snapshotCase: GraphDemo.SnapshotCase): string =>
    snapshotCase === "Snapshot"
        ? "snapshot"
        : snapshotCase === "Mutate"
          ? "mutate"
          : "Mermaid"

const snapshot_view = <ParentMessage>(
    model: GraphDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = GraphDemo.snapshot_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Boundary",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    ["Snapshot", "Mutate", "Mermaid"] as const
                                ).map((snapshotCase: GraphDemo.SnapshotCase) =>
                                    choice_button(
                                        snapshot_label(snapshotCase),
                                        model.snapshotCase === snapshotCase,
                                        GraphDemo.Message.SelectedGraphSnapshotCase(
                                            {
                                                snapshotCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric(
                                "snapshot type",
                                snapshot.snapshotType,
                                h,
                                "cyan"
                            ),
                            metric("node indexes", snapshot.nodeIds, h),
                            metric("edge indexes", snapshot.edgeIds, h),
                            metric(
                                "round-trip node count",
                                String(snapshot.roundTripNodes),
                                h,
                                "green"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Immutable evolution + export",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "original nodes",
                                        String(snapshot.originalNodes),
                                        h
                                    ),
                                    metric(
                                        "mutated nodes",
                                        String(snapshot.mutatedNodes),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "original edges",
                                        String(snapshot.originalEdges),
                                        h
                                    ),
                                    metric(
                                        "mutated edges",
                                        String(snapshot.mutatedEdges),
                                        h,
                                        "green"
                                    ),
                                ]
                            ),
                            metric("toMermaid", snapshot.mermaid, h, "cyan"),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "The original graph remains unchanged while mutate returns a new immutable value. Snapshots preserve active numeric identifiers for serialization or transport.",
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
    details: GraphDemo.StageDetails,
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
    model: GraphDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = GraphDemo.stage_details[model.stage]

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
                                        ["effect / Graph"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Indexed immutable graphs with rich algorithms",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Build directed or undirected structure through mutation scopes, traverse lazily, run graph algorithms, then snapshot, evolve, and export immutable graphs.",
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
                                        ["136 exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["directed + undirected"]
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
                : model.stage === "Traverse"
                  ? traverse_view(model, to_parent_message, h)
                  : model.stage === "Algorithms"
                    ? algorithms_view(model, to_parent_message, h)
                    : snapshot_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
