import { Data, Effect, Queue, Schema as S, Stream } from "effect"
import { Command, Mount, Navigation } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { taggedStruct } from "foldkit/schema"

export type DocumentationGraphNode = Readonly<{
    href: string
    label: string
    group: string
    is_tag: boolean
    is_current: boolean
}>
export type DocumentationGraphLink = Readonly<{
    source: string
    target: string
    source_arrow: boolean
    target_arrow: boolean
}>
export type DocumentationGraph = Readonly<{
    nodes: ReadonlyArray<DocumentationGraphNode>
    links: ReadonlyArray<DocumentationGraphLink>
    is_global: boolean
}>

export const GraphSettings = S.Struct({
    search: S.String,
    show_tags: S.Boolean,
    show_orphans: S.Boolean,
    show_arrows: S.Boolean,
    node_size: S.Number,
    link_width: S.Number,
    repulsion: S.Number,
    edge_length: S.Number,
})
export type GraphSettings = typeof GraphSettings.Type
export const defaultGraphSettings: GraphSettings = GraphSettings.make({
    search: "",
    show_tags: true,
    show_orphans: true,
    show_arrows: false,
    node_size: 1,
    link_width: 1.5,
    repulsion: 260,
    edge_length: 105,
})

const DocumentationGraphPayload = S.Struct({
    graph: S.Struct({
        nodes: S.Array(
            S.Struct({
                href: S.String,
                label: S.String,
                group: S.String,
                is_tag: S.Boolean,
                is_current: S.Boolean,
            })
        ),
        links: S.Array(
            S.Struct({
                source: S.String,
                target: S.String,
                source_arrow: S.Boolean,
                target_arrow: S.Boolean,
            })
        ),
        is_global: S.Boolean,
    }),
    settings: GraphSettings,
})
const decodeGraphPayload = S.decodeUnknownSync(DocumentationGraphPayload)

export const GraphMounted = taggedStruct("GraphMounted")
export const GraphMountFailed = taggedStruct("GraphMountFailed", {
    reason: S.String,
})
export const GraphLinkClicked = taggedStruct("GraphLinkClicked", {
    href: S.String,
})
export const GraphNavigationCompleted = taggedStruct("GraphNavigationCompleted")
export const ToggledGraphSettings = taggedStruct("ToggledGraphSettings")
export const ChangedGraphSearch = taggedStruct("ChangedGraphSearch", {
    value: S.String,
})
export const ToggledGraphTags = taggedStruct("ToggledGraphTags")
export const ToggledGraphOrphans = taggedStruct("ToggledGraphOrphans")
export const ToggledGraphArrows = taggedStruct("ToggledGraphArrows")
export const ChangedGraphNodeSize = taggedStruct("ChangedGraphNodeSize", {
    value: S.Number,
})
export const ChangedGraphLinkWidth = taggedStruct("ChangedGraphLinkWidth", {
    value: S.Number,
})
export const ChangedGraphRepulsion = taggedStruct("ChangedGraphRepulsion", {
    value: S.Number,
})
export const ChangedGraphEdgeLength = taggedStruct("ChangedGraphEdgeLength", {
    value: S.Number,
})
export const ResetGraphSettings = taggedStruct("ResetGraphSettings")
export const GraphMessage = S.Union([
    GraphMounted,
    GraphMountFailed,
    GraphLinkClicked,
    GraphNavigationCompleted,
    ToggledGraphSettings,
    ChangedGraphSearch,
    ToggledGraphTags,
    ToggledGraphOrphans,
    ToggledGraphArrows,
    ChangedGraphNodeSize,
    ChangedGraphLinkWidth,
    ChangedGraphRepulsion,
    ChangedGraphEdgeLength,
    ResetGraphSettings,
])
export type GraphMessage = typeof GraphMessage.Type

class DocumentationGraphMountError extends Data.TaggedError(
    "DocumentationGraphMountError"
)<{ readonly reason: string }> {}

const revealed_graphs = new Set<string>()

const graphIdentity = (graph: DocumentationGraph): string =>
    JSON.stringify({
        nodes: graph.nodes.map((node) => node.href),
        links: graph.links.map((link) => [link.source, link.target]),
    })

export const MountDocumentationGraph = Mount.defineStream(
    "MountDocumentationGraph",
    {
        messages: [GraphMounted, GraphMountFailed, GraphLinkClicked],
        execute: ({ element }) =>
            Stream.callback<
                | typeof GraphMounted.Type
                | typeof GraphMountFailed.Type
                | typeof GraphLinkClicked.Type
            >((queue) =>
                Effect.gen(function* () {
                    if (!(element instanceof HTMLElement)) {
                        Queue.offerUnsafe(
                            queue,
                            GraphMountFailed({
                                reason: "Graph host is not an HTMLElement.",
                            })
                        )
                        return yield* Effect.never
                    }
                    yield* Effect.acquireRelease(
                        Effect.tryPromise({
                            try: async () => {
                                const { echarts } =
                                    await import("./graph-echarts.client.ts")
                                const chart = echarts.init(element, undefined, {
                                    renderer: "canvas",
                                })
                                let reveal_animation: Animation | undefined
                                let pending_reveal: (() => void) | undefined
                                const read_graph_palette = () => {
                                    const styles = getComputedStyle(element)
                                    const foreground =
                                        styles
                                            .getPropertyValue("--foreground")
                                            .trim() || "#18181b"

                                    return {
                                        foreground,
                                        muted:
                                            styles
                                                .getPropertyValue(
                                                    "--muted-foreground"
                                                )
                                                .trim() || "#71717a",
                                        primary:
                                            styles
                                                .getPropertyValue("--primary")
                                                .trim() || foreground,
                                        tag:
                                            styles
                                                .getPropertyValue("--chart-3")
                                                .trim() || "#16a34a",
                                        tooltip_background:
                                            styles
                                                .getPropertyValue("--popover")
                                                .trim() || "#ffffff",
                                        tooltip_border:
                                            styles
                                                .getPropertyValue("--border")
                                                .trim() || "#e4e4e7",
                                        tooltip_foreground:
                                            styles
                                                .getPropertyValue(
                                                    "--popover-foreground"
                                                )
                                                .trim() || foreground,
                                    }
                                }
                                const categories_for_palette = (
                                    palette: ReturnType<
                                        typeof read_graph_palette
                                    >
                                ) => [
                                    {
                                        name: "current",
                                        itemStyle: { color: palette.primary },
                                    },
                                    {
                                        name: "tag",
                                        itemStyle: { color: palette.tag },
                                    },
                                    {
                                        name: "page",
                                        itemStyle: { color: palette.muted },
                                    },
                                ]
                                const apply_graph_palette = (): void => {
                                    const palette = read_graph_palette()

                                    chart.setOption({
                                        tooltip: {
                                            backgroundColor:
                                                palette.tooltip_background,
                                            borderColor: palette.tooltip_border,
                                            textStyle: {
                                                color: palette.tooltip_foreground,
                                            },
                                        },
                                        series: [
                                            {
                                                id: "documentation-graph",
                                                type: "graph",
                                                label: {
                                                    color: palette.foreground,
                                                },
                                                lineStyle: {
                                                    color: palette.muted,
                                                },
                                                categories:
                                                    categories_for_palette(
                                                        palette
                                                    ),
                                            },
                                        ],
                                    })
                                }
                                const resize_observer = new ResizeObserver(() =>
                                    chart.resize()
                                )
                                const navigate = (event: {
                                    data?: unknown
                                }): void => {
                                    if (
                                        typeof event.data === "object" &&
                                        event.data !== null &&
                                        "href" in event.data &&
                                        typeof event.data.href === "string" &&
                                        !event.data.href.startsWith("#")
                                    ) {
                                        Queue.offerUnsafe(
                                            queue,
                                            GraphLinkClicked({
                                                href: event.data.href,
                                            })
                                        )
                                    }
                                }
                                const apply_payload = (): void => {
                                    const encoded = element.dataset.graphPayload
                                    if (encoded === undefined) return
                                    const parsed: unknown = JSON.parse(encoded)
                                    const { graph, settings } =
                                        decodeGraphPayload(parsed)
                                    const palette = read_graph_palette()
                                    const identity = graphIdentity(graph)
                                    const should_reveal =
                                        !revealed_graphs.has(identity) &&
                                        !window.matchMedia(
                                            "(prefers-reduced-motion: reduce)"
                                        ).matches

                                    if (pending_reveal !== undefined) {
                                        chart.off("rendered", pending_reveal)
                                    }
                                    reveal_animation?.cancel()
                                    element.style.opacity = should_reveal
                                        ? "0"
                                        : "1"
                                    pending_reveal = (): void => {
                                        if (pending_reveal !== undefined) {
                                            chart.off(
                                                "rendered",
                                                pending_reveal
                                            )
                                        }
                                        pending_reveal = undefined
                                        element.style.opacity = "1"
                                        revealed_graphs.add(identity)
                                        if (should_reveal) {
                                            reveal_animation = element.animate(
                                                [
                                                    { opacity: 0 },
                                                    { opacity: 1 },
                                                ],
                                                {
                                                    duration: 180,
                                                    easing: "ease-out",
                                                }
                                            )
                                        }
                                    }
                                    if (should_reveal)
                                        chart.on("rendered", pending_reveal)

                                    chart.setOption(
                                        {
                                            animation: false,
                                            aria: { enabled: true },
                                            tooltip: {
                                                trigger: "item",
                                                confine: true,
                                                backgroundColor:
                                                    palette.tooltip_background,
                                                borderColor:
                                                    palette.tooltip_border,
                                                textStyle: {
                                                    color: palette.tooltip_foreground,
                                                },
                                            },
                                            series: [
                                                {
                                                    id: "documentation-graph",
                                                    type: "graph",
                                                    layout: "force",
                                                    roam: true,
                                                    draggable: true,
                                                    force: {
                                                        repulsion:
                                                            settings.repulsion,
                                                        edgeLength:
                                                            settings.edge_length,
                                                        layoutAnimation: false,
                                                    },
                                                    label: {
                                                        show: true,
                                                        color: palette.foreground,
                                                        fontWeight: 600,
                                                        position: "bottom",
                                                        align: "center",
                                                        distance: 6,
                                                    },
                                                    lineStyle: {
                                                        color: palette.muted,
                                                        width: settings.link_width,
                                                        curveness: 0.12,
                                                    },
                                                    categories:
                                                        categories_for_palette(
                                                            palette
                                                        ),
                                                    data: graph.nodes.map(
                                                        (node) => ({
                                                            id: node.href,
                                                            name: node.label,
                                                            href: node.href,
                                                            symbolSize:
                                                                (node.is_current
                                                                    ? 48
                                                                    : node.is_tag
                                                                      ? 24
                                                                      : 34) *
                                                                settings.node_size,
                                                            category:
                                                                node.is_current
                                                                    ? "current"
                                                                    : node.is_tag
                                                                      ? "tag"
                                                                      : "page",
                                                        })
                                                    ),
                                                    links: graph.links.map(
                                                        (link) => ({
                                                            source: link.source,
                                                            target: link.target,
                                                            edgeSymbol:
                                                                settings.show_arrows
                                                                    ? [
                                                                          link.source_arrow
                                                                              ? "arrow"
                                                                              : "none",
                                                                          link.target_arrow
                                                                              ? "arrow"
                                                                              : "none",
                                                                      ]
                                                                    : [
                                                                          "none",
                                                                          "none",
                                                                      ],
                                                        })
                                                    ),
                                                },
                                            ],
                                        },
                                        { notMerge: true }
                                    )
                                    if (!should_reveal)
                                        revealed_graphs.add(identity)
                                }
                                const payload_observer = new MutationObserver(
                                    apply_payload
                                )
                                payload_observer.observe(element, {
                                    attributes: true,
                                    attributeFilter: ["data-graph-payload"],
                                })
                                const theme_observer = new MutationObserver(
                                    apply_graph_palette
                                )
                                theme_observer.observe(
                                    document.documentElement,
                                    {
                                        attributes: true,
                                        attributeFilter: ["data-theme"],
                                    }
                                )
                                apply_payload()
                                chart.on("click", navigate)
                                resize_observer.observe(element)
                                Queue.offerUnsafe(queue, GraphMounted())
                                return (): void => {
                                    payload_observer.disconnect()
                                    theme_observer.disconnect()
                                    resize_observer.disconnect()
                                    if (pending_reveal !== undefined) {
                                        chart.off("rendered", pending_reveal)
                                    }
                                    chart.off("click", navigate)
                                    reveal_animation?.cancel()
                                    chart.dispose()
                                }
                            },
                            catch: (error) =>
                                new DocumentationGraphMountError({
                                    reason:
                                        error instanceof Error
                                            ? error.message
                                            : `Failed to mount documentation graph: ${error}`,
                                }),
                        }).pipe(
                            Effect.catch((error) => {
                                Queue.offerUnsafe(
                                    queue,
                                    GraphMountFailed({ reason: error.reason })
                                )
                                return Effect.succeed((): void => undefined)
                            })
                        ),
                        (cleanup) => Effect.sync(cleanup)
                    )
                    return yield* Effect.never
                })
            ),
    }
)

const mountDocumentationGraph = () => MountDocumentationGraph()

const NavigateGraphLink = Command.define("NavigateGraphLink", {
    args: { href: S.String },
    messages: [GraphNavigationCompleted],
    execute: ({ href }) =>
        Navigation.pushUrl(href).pipe(Effect.as(GraphNavigationCompleted())),
})
export const navigateGraphLink = (href: string) => NavigateGraphLink({ href })

const filteredGraph = (
    graph: DocumentationGraph,
    settings: GraphSettings
): DocumentationGraph => {
    const query = settings.search.trim().toLocaleLowerCase()
    const candidates = graph.nodes.filter(
        (node) =>
            (settings.show_tags || !node.is_tag) &&
            (query === "" ||
                node.label.toLocaleLowerCase().includes(query) ||
                node.href.toLocaleLowerCase().includes(query))
    )
    const candidate_ids = new Set(candidates.map((node) => node.href))
    const links = graph.links.filter(
        (link) =>
            candidate_ids.has(link.source) && candidate_ids.has(link.target)
    )
    const connected_ids = new Set(
        links.flatMap((link) => [link.source, link.target])
    )
    const nodes = settings.show_orphans
        ? candidates
        : candidates.filter(
              (node) => node.is_current || connected_ids.has(node.href)
          )
    const node_ids = new Set(nodes.map((node) => node.href))
    return {
        ...graph,
        nodes,
        links: links.filter(
            (link) => node_ids.has(link.source) && node_ids.has(link.target)
        ),
    }
}

const parsedNumber = (value: string, fallback: number): number => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

const toggle = <ParentMessage>(
    label: string,
    checked: boolean,
    message: GraphMessage,
    to_parent: (message: GraphMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.label(
        [h.Class("flex items-center gap-2 text-sm")],
        [
            h.input([
                h.Type("checkbox"),
                h.Checked(checked),
                h.OnClick(to_parent(message)),
            ]),
            h.span([], [label]),
        ]
    )

const slider = <ParentMessage>(
    label: string,
    value: number,
    minimum: number,
    maximum: number,
    step: number,
    changed: (value: number) => GraphMessage,
    to_parent: (message: GraphMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.label(
        [h.Class("grid gap-1 text-sm")],
        [
            h.span([], [label]),
            h.input([
                h.Type("range"),
                h.Min(String(minimum)),
                h.Max(String(maximum)),
                h.Step(String(step)),
                h.Value(String(value)),
                h.OnInput((next) =>
                    to_parent(changed(parsedNumber(next, value)))
                ),
            ]),
        ]
    )

const settingsPanel = <ParentMessage>(
    settings: GraphSettings,
    is_open: boolean,
    to_parent: (message: GraphMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("mt-4")],
        [
            h.button(
                [
                    h.Type("button"),
                    h.Class(
                        "rounded-md border border-border px-3 py-1.5 text-sm"
                    ),
                    h.AriaExpanded(is_open),
                    h.OnClick(to_parent(ToggledGraphSettings())),
                ],
                ["Graph settings"]
            ),
            ...(is_open
                ? [
                      h.div(
                          [
                              h.Class(
                                  "mt-3 grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2"
                              ),
                          ],
                          [
                              h.label(
                                  [h.Class("grid gap-1 text-sm sm:col-span-2")],
                                  [
                                      h.span([], ["Filter pages"]),
                                      h.input([
                                          h.Type("search"),
                                          h.Class(
                                              "rounded-md border border-border bg-background px-3 py-2"
                                          ),
                                          h.Value(settings.search),
                                          h.OnInput((value) =>
                                              to_parent(
                                                  ChangedGraphSearch({ value })
                                              )
                                          ),
                                      ]),
                                  ]
                              ),
                              toggle(
                                  "Tags",
                                  settings.show_tags,
                                  ToggledGraphTags(),
                                  to_parent,
                                  h
                              ),
                              toggle(
                                  "Orphans",
                                  settings.show_orphans,
                                  ToggledGraphOrphans(),
                                  to_parent,
                                  h
                              ),
                              toggle(
                                  "Arrows",
                                  settings.show_arrows,
                                  ToggledGraphArrows(),
                                  to_parent,
                                  h
                              ),
                              slider(
                                  "Node size",
                                  settings.node_size,
                                  0.5,
                                  2.5,
                                  0.1,
                                  (value) => ChangedGraphNodeSize({ value }),
                                  to_parent,
                                  h
                              ),
                              slider(
                                  "Link width",
                                  settings.link_width,
                                  0.4,
                                  4,
                                  0.1,
                                  (value) => ChangedGraphLinkWidth({ value }),
                                  to_parent,
                                  h
                              ),
                              slider(
                                  "Repulsion",
                                  settings.repulsion,
                                  50,
                                  1000,
                                  25,
                                  (value) => ChangedGraphRepulsion({ value }),
                                  to_parent,
                                  h
                              ),
                              slider(
                                  "Link distance",
                                  settings.edge_length,
                                  30,
                                  250,
                                  5,
                                  (value) => ChangedGraphEdgeLength({ value }),
                                  to_parent,
                                  h
                              ),
                              h.button(
                                  [
                                      h.Type("button"),
                                      h.Class(
                                          "justify-self-start text-sm underline underline-offset-2"
                                      ),
                                      h.OnClick(
                                          to_parent(ResetGraphSettings())
                                      ),
                                  ],
                                  ["Restore defaults"]
                              ),
                          ]
                      ),
                  ]
                : []),
        ]
    )

export const graphView = <ParentMessage>(
    graph: DocumentationGraph,
    settings: GraphSettings,
    is_settings_open: boolean,
    to_parent: (message: GraphMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const active_settings = graph.is_global ? settings : defaultGraphSettings
    const visible_graph = filteredGraph(graph, active_settings)
    return h.section(
        [
            h.Class("documentation-graph-section mt-2 mb-4"),
            h.AriaLabel("Links for this documentation page"),
        ],
        [
            ...(graph.is_global
                ? [settingsPanel(settings, is_settings_open, to_parent, h)]
                : []),
            h.keyed("div")(
                "documentation-graph-host",
                [
                    h.Class("documentation-graph-host mt-2 h-80 w-full"),
                    h.DataAttribute(
                        "graph-payload",
                        JSON.stringify({
                            graph: visible_graph,
                            settings: active_settings,
                        })
                    ),
                    h.OnMount(
                        Mount.mapMessage(mountDocumentationGraph(), to_parent)
                    ),
                ],
                []
            ),
        ]
    )
}
