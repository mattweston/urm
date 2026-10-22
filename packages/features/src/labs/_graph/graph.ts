import { Graph, Option, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// DEMO GRAPHS
// -----------------------------------------------------------------------------

export type ServiceName = "App" | "Auth" | "API" | "Database"

export type SocialName = "Ada" | "Grace" | "Linus"

export const dependency_graph = Graph.directed<string, number>(
    (mutable: Graph.MutableDirectedGraph<string, number>): undefined => {
        const app = Graph.addNode(mutable, "App")

        const auth = Graph.addNode(mutable, "Auth")

        const api = Graph.addNode(mutable, "API")

        const database = Graph.addNode(mutable, "Database")

        Graph.addEdge(mutable, app, auth, 1)

        Graph.addEdge(mutable, app, api, 5)

        Graph.addEdge(mutable, auth, api, 1)

        Graph.addEdge(mutable, api, database, 1)

        Graph.addEdge(mutable, app, database, 10)

        return undefined
    }
)

export const social_graph = Graph.undirected<SocialName, string>(
    (mutable: Graph.MutableUndirectedGraph<SocialName, string>): undefined => {
        const ada = Graph.addNode(mutable, "Ada")

        const grace = Graph.addNode(mutable, "Grace")

        const linus = Graph.addNode(mutable, "Linus")

        Graph.addEdge(mutable, ada, grace, "friends")

        Graph.addEdge(mutable, grace, linus, "friends")

        return undefined
    }
)

export const cycle_graph = Graph.directed<string, number>(
    (mutable: Graph.MutableDirectedGraph<string, number>): undefined => {
        const a = Graph.addNode(mutable, "A")

        const b = Graph.addNode(mutable, "B")

        const c = Graph.addNode(mutable, "C")

        const d = Graph.addNode(mutable, "D")

        Graph.addEdge(mutable, a, b, 1)

        Graph.addEdge(mutable, b, c, 1)

        Graph.addEdge(mutable, c, a, 1)

        Graph.addEdge(mutable, c, d, 1)

        return undefined
    }
)

const node_name = (
    graph: Graph.Graph<string, number, "directed">,
    index: Graph.NodeIndex
): string =>
    Option.match(Graph.getNode(graph, index), {
        onNone: () => `#${index}`,
        onSome: (value: string) => value,
    })

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Build"),
    S.Literal("Traverse"),
    S.Literal("Algorithms"),
    S.Literal("Snapshot"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Build",
    "Traverse",
    "Algorithms",
    "Snapshot",
]

export const BuildCase = S.Union([
    S.Literal("Directed"),
    S.Literal("Undirected"),
])
export type BuildCase = typeof BuildCase.Type

export const TraverseCase = S.Union([
    S.Literal("BFS"),
    S.Literal("DFS"),
    S.Literal("PostOrder"),
    S.Literal("Topo"),
])
export type TraverseCase = typeof TraverseCase.Type

export const AlgorithmCase = S.Union([
    S.Literal("ShortestPath"),
    S.Literal("Cycles"),
    S.Literal("Components"),
])
export type AlgorithmCase = typeof AlgorithmCase.Type

export const SnapshotCase = S.Union([
    S.Literal("Snapshot"),
    S.Literal("Mutate"),
    S.Literal("Mermaid"),
])
export type SnapshotCase = typeof SnapshotCase.Type

export const Model = S.Struct({
    stage: Stage,
    buildCase: BuildCase,
    traverseCase: TraverseCase,
    algorithmCase: AlgorithmCase,
    snapshotCase: SnapshotCase,
})
export type Model = typeof Model.Type

export type StageDetails = Readonly<{
    eyebrow: string
    title: string
    description: string
    code: string
    apis: ReadonlyArray<string>
    notice: string
}>

export const stage_details: Record<Stage, StageDetails> = {
    Build: {
        eyebrow: "immutable graph + scoped mutation",
        title: "Construct directed or undirected graphs from stable node indexes",
        description:
            "Graph constructors expose a temporary MutableGraph callback for efficient setup. addNode and addEdge allocate stable numeric identifiers, while the returned graph is immutable.",
        code: `const graph =
    Graph.directed<
        string,
        number
    >((mutable) => {
        const app =
            Graph.addNode(
                mutable,
                "App"
            )

        const api =
            Graph.addNode(
                mutable,
                "API"
            )

        Graph.addEdge(
            mutable,
            app,
            api,
            5
        )

        return undefined
    })`,
        apis: [
            "Graph.directed",
            "Graph.undirected",
            "Graph.addNode",
            "Graph.addEdge",
            "Graph.nodeCount",
            "Graph.edgeCount",
            "Graph.successors",
            "Graph.predecessors",
            "Graph.neighbors",
            "Graph.isGraph",
        ],
        notice: "NodeIndex and EdgeIndex are identifiers, not array offsets. Removed identifiers are not reused. Directed adjacency distinguishes successors from predecessors; undirected neighbors are symmetric.",
    },

    Traverse: {
        eyebrow: "lazy NodeWalker traversal",
        title: "BFS, DFS, postorder, and topological walks share one iterator model",
        description:
            "Traversal APIs return lazy NodeWalker values. Project their indexes or values, choose starting nodes and direction, and optionally bound searches by edge-distance radius.",
        code: `const bfs =
    Graph.bfs(
        graph,
        {
            start: [0],
            direction:
                "outgoing"
        }
    )

Array.from(
    Graph.indices(bfs)
)
// [0, 1, 2, 3]

Array.from(
    Graph.values(
        Graph.topo(graph)
    )
)
// ["App", "Auth", "API", "Database"]`,
        apis: [
            "Graph.bfs",
            "Graph.dfs",
            "Graph.dfsPostOrder",
            "Graph.topo",
            "Graph.nodes",
            "Graph.edges",
            "Graph.indices",
            "Graph.values",
            "Graph.externals",
            "Graph.SearchConfig",
            "Graph.TopoConfig",
        ],
        notice: "Topological traversal is only valid for directed acyclic graphs. BFS visits in increasing unweighted distance; dfsPostOrder emits descendants before the nodes that lead to them.",
    },

    Algorithms: {
        eyebrow: "analysis + path finding",
        title: "The module includes shortest paths, cycles, connectivity, flow, and graph structure algorithms",
        description:
            "The demo uses Dijkstra for a weighted route and strongly-connected components for a directed cycle. The same module also exposes A*, Bellman–Ford, Floyd–Warshall, spanning forests, cuts, flows, bridges, and more.",
        code: `const route =
    Graph.dijkstra(
        graph,
        {
            source: 0,
            target: 3,
            cost: (
                edge: number
            ) => edge
        }
    )

// distance 3
// App → Auth → API → Database

Graph.isAcyclic(graph)
// true

Graph.stronglyConnectedComponents(
    cyclicGraph
)
// [[0, 1, 2], [3]]`,
        apis: [
            "Graph.dijkstra",
            "Graph.astar",
            "Graph.bellmanFord",
            "Graph.floydWarshall",
            "Graph.isAcyclic",
            "Graph.findCycle",
            "Graph.stronglyConnectedComponents",
            "Graph.connectedComponents",
            "Graph.minimumSpanningForest",
            "Graph.maximumFlow",
            "Graph.minimumCut",
        ],
        notice: "Dijkstra requires non-negative, non-NaN edge costs. Graph algorithms throw GraphError for invalid structural inputs such as missing endpoints or unsupported graph kinds.",
    },

    Snapshot: {
        eyebrow: "persist + evolve + export",
        title: "Snapshots preserve active indexes; mutate creates a new immutable graph",
        description:
            "toSnapshot / fromSnapshot preserve active node and edge identifiers across a boundary. mutate edits a structural copy without changing the original, and toMermaid produces a text diagram.",
        code: `const snapshot =
    Graph.toSnapshot(graph)

const roundTrip =
    Graph.fromSnapshot(
        snapshot
    )

const next =
    Graph.mutate(
        graph,
        (mutable) => {
            const metrics =
                Graph.addNode(
                    mutable,
                    "Metrics"
                )
            return undefined
        }
    )

Graph.toMermaid(graph)`,
        apis: [
            "Graph.toSnapshot",
            "Graph.fromSnapshot",
            "Graph.mutate",
            "Graph.beginMutation",
            "Graph.endMutation",
            "Graph.toMermaid",
            "Graph.Snapshot",
            "Graph.GraphError",
        ],
        notice: "A snapshot contains active indexed structure, not allocator history. mutate finalizes its temporary mutable handle even when the callback throws; the original immutable graph remains structurally unchanged.",
    },
}

// -----------------------------------------------------------------------------
// BUILD SNAPSHOT
// -----------------------------------------------------------------------------

export type BuildSnapshot = Readonly<{
    mode: BuildCase
    kind: string
    nodeCount: number
    edgeCount: number
    nodes: string
    firstRelation: string
    secondRelation: string
    isGraph: boolean
}>

export const build_snapshot = (model: Model): BuildSnapshot => {
    if (model.buildCase === "Undirected") {
        const snapshot = Graph.toSnapshot(social_graph)

        const graceNeighbors = Graph.neighbors(social_graph, 1)

        return {
            mode: model.buildCase,
            kind: social_graph.type,
            nodeCount: Graph.nodeCount(social_graph),
            edgeCount: Graph.edgeCount(social_graph),
            nodes: snapshot.nodes
                .map(
                    (node: Graph.IndexedNode<SocialName>) =>
                        `${node.index}:${node.data}`
                )
                .join(" · "),
            firstRelation: `neighbors(Grace) = [${graceNeighbors.join(", ")}]`,
            secondRelation: `neighbors(Ada) = [${Graph.neighbors(social_graph, 0).join(", ")}]`,
            isGraph: Graph.isGraph(social_graph),
        }
    }

    const snapshot = Graph.toSnapshot(dependency_graph)

    return {
        mode: model.buildCase,
        kind: dependency_graph.type,
        nodeCount: Graph.nodeCount(dependency_graph),
        edgeCount: Graph.edgeCount(dependency_graph),
        nodes: snapshot.nodes
            .map(
                (node: Graph.IndexedNode<string>) =>
                    `${node.index}:${node.data}`
            )
            .join(" · "),
        firstRelation: `successors(App) = [${Graph.successors(dependency_graph, 0).join(", ")}]`,
        secondRelation: `predecessors(API) = [${Graph.predecessors(dependency_graph, 2).join(", ")}]`,
        isGraph: Graph.isGraph(dependency_graph),
    }
}

// -----------------------------------------------------------------------------
// TRAVERSE SNAPSHOT
// -----------------------------------------------------------------------------

export type TraverseSnapshot = Readonly<{
    mode: TraverseCase
    indices: string
    values: string
    start: string
    orderMeaning: string
    sources: string
    sinks: string
}>

export const traverse_snapshot = (model: Model): TraverseSnapshot => {
    const walker =
        model.traverseCase === "DFS"
            ? Graph.dfs(dependency_graph, {
                  start: [0],
              })
            : model.traverseCase === "PostOrder"
              ? Graph.dfsPostOrder(dependency_graph, {
                    start: [0],
                })
              : model.traverseCase === "Topo"
                ? Graph.topo(dependency_graph)
                : Graph.bfs(dependency_graph, {
                      start: [0],
                  })

    const indices = Array.from(Graph.indices(walker))

    const valuesWalker =
        model.traverseCase === "DFS"
            ? Graph.dfs(dependency_graph, {
                  start: [0],
              })
            : model.traverseCase === "PostOrder"
              ? Graph.dfsPostOrder(dependency_graph, {
                    start: [0],
                })
              : model.traverseCase === "Topo"
                ? Graph.topo(dependency_graph)
                : Graph.bfs(dependency_graph, {
                      start: [0],
                  })

    const values = Array.from(Graph.values(valuesWalker))

    const sources = Array.from(
        Graph.values(
            Graph.externals(dependency_graph, {
                direction: "incoming",
            })
        )
    )

    const sinks = Array.from(
        Graph.values(
            Graph.externals(dependency_graph, {
                direction: "outgoing",
            })
        )
    )

    const orderMeaning =
        model.traverseCase === "BFS"
            ? "increasing hop distance"
            : model.traverseCase === "DFS"
              ? "branch-first discovery"
              : model.traverseCase === "PostOrder"
                ? "descendants before parent"
                : "predecessors before dependents"

    return {
        mode: model.traverseCase,
        indices: `[${indices.join(", ")}]`,
        values: values.join(" → "),
        start:
            model.traverseCase === "Topo"
                ? "all zero in-degree nodes"
                : "node 0 · App",
        orderMeaning,
        sources: sources.join(", "),
        sinks: sinks.join(", "),
    }
}

// -----------------------------------------------------------------------------
// ALGORITHM SNAPSHOT
// -----------------------------------------------------------------------------

const component_text = (
    components: ReadonlyArray<ReadonlyArray<number>>
): string =>
    components
        .map(
            (component: ReadonlyArray<number>) =>
                `[${[...component]
                    .sort((left: number, right: number) => left - right)
                    .join(", ")}]`
        )
        .sort()
        .join(" · ")

export type AlgorithmSnapshot = Readonly<{
    mode: AlgorithmCase
    primaryLabel: string
    primary: string
    secondaryLabel: string
    secondary: string
    acyclic: boolean
    cycleAcyclic: boolean
    note: string
}>

export const algorithm_snapshot = (model: Model): AlgorithmSnapshot => {
    const acyclic = Graph.isAcyclic(dependency_graph)

    const cycleAcyclic = Graph.isAcyclic(cycle_graph)

    if (model.algorithmCase === "Cycles") {
        return {
            mode: model.algorithmCase,
            primaryLabel: "isAcyclic(dependency)",
            primary: String(acyclic),
            secondaryLabel: "isAcyclic(cycleGraph)",
            secondary: String(cycleAcyclic),
            acyclic,
            cycleAcyclic,
            note: "A→B→C→A makes the second graph cyclic; findCycle can return a concrete cycle witness when the path itself is needed",
        }
    }

    if (model.algorithmCase === "Components") {
        const components = Graph.stronglyConnectedComponents(cycle_graph)

        return {
            mode: model.algorithmCase,
            primaryLabel: "stronglyConnectedComponents",
            primary: component_text(components),
            secondaryLabel: "component count",
            secondary: String(components.length),
            acyclic,
            cycleAcyclic,
            note: "A, B, C share a directed cycle; D is its own SCC",
        }
    }

    const route = Graph.dijkstra(dependency_graph, {
        source: 0,
        target: 3,
        cost: (edgeData: number) => edgeData,
    })

    return Option.match(route, {
        onNone: () => ({
            mode: model.algorithmCase,
            primaryLabel: "Dijkstra route",
            primary: "None",
            secondaryLabel: "distance",
            secondary: "—",
            acyclic,
            cycleAcyclic,
            note: "target unreachable",
        }),
        onSome: (result: Graph.PathResult<number>) => ({
            mode: model.algorithmCase,
            primaryLabel: "Dijkstra route",
            primary: result.path
                .map((index: Graph.NodeIndex) =>
                    node_name(dependency_graph, index)
                )
                .join(" → "),
            secondaryLabel: "distance",
            secondary: String(result.distance),
            acyclic,
            cycleAcyclic,
            note: `edge indexes [${result.edges.join(", ")}]`,
        }),
    })
}

// -----------------------------------------------------------------------------
// SNAPSHOT / MUTATION SNAPSHOT
// -----------------------------------------------------------------------------

export type SnapshotSnapshot = Readonly<{
    mode: SnapshotCase
    snapshotType: string
    nodeIds: string
    edgeIds: string
    roundTripNodes: number
    originalNodes: number
    mutatedNodes: number
    originalEdges: number
    mutatedEdges: number
    mermaid: string
}>

export const snapshot_snapshot = (model: Model): SnapshotSnapshot => {
    const snapshot = Graph.toSnapshot(dependency_graph)

    const roundTrip = Graph.fromSnapshot(snapshot)

    const mutated = Graph.mutate(
        dependency_graph,
        (mutable: Graph.MutableDirectedGraph<string, number>): undefined => {
            const metrics = Graph.addNode(mutable, "Metrics")

            Graph.addEdge(mutable, 3, metrics, 2)

            return undefined
        }
    )

    return {
        mode: model.snapshotCase,
        snapshotType: snapshot.type,
        nodeIds: snapshot.nodes
            .map((node: Graph.IndexedNode<string>) => String(node.index))
            .join(", "),
        edgeIds: snapshot.edges
            .map((edge: Graph.IndexedEdge<number>) => String(edge.index))
            .join(", "),
        roundTripNodes: Graph.nodeCount(roundTrip),
        originalNodes: Graph.nodeCount(dependency_graph),
        mutatedNodes: Graph.nodeCount(mutated),
        originalEdges: Graph.edgeCount(dependency_graph),
        mutatedEdges: Graph.edgeCount(mutated),
        mermaid: Graph.toMermaid(dependency_graph),
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedGraphStage: {
        stage: Stage,
    },
    SelectedGraphBuildCase: {
        buildCase: BuildCase,
    },
    SelectedGraphTraverseCase: {
        traverseCase: TraverseCase,
    },
    SelectedGraphAlgorithmCase: {
        algorithmCase: AlgorithmCase,
    },
    SelectedGraphSnapshotCase: {
        snapshotCase: SnapshotCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Build",
    buildCase: "Directed",
    traverseCase: "BFS",
    algorithmCase: "ShortestPath",
    snapshotCase: "Snapshot",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type BuildCasePayload = Readonly<{
    buildCase: BuildCase
}>

type TraverseCasePayload = Readonly<{
    traverseCase: TraverseCase
}>

type AlgorithmCasePayload = Readonly<{
    algorithmCase: AlgorithmCase
}>

type SnapshotCasePayload = Readonly<{
    snapshotCase: SnapshotCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedGraphStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedGraphBuildCase: ({ buildCase }: BuildCasePayload) => ({
            model: modifyFields(model, {
                buildCase: () => buildCase,
            }),
        }),

        SelectedGraphTraverseCase: ({ traverseCase }: TraverseCasePayload) => ({
            model: modifyFields(model, {
                traverseCase: () => traverseCase,
            }),
        }),

        SelectedGraphAlgorithmCase: ({
            algorithmCase,
        }: AlgorithmCasePayload) => ({
            model: modifyFields(model, {
                algorithmCase: () => algorithmCase,
            }),
        }),

        SelectedGraphSnapshotCase: ({ snapshotCase }: SnapshotCasePayload) => ({
            model: modifyFields(model, {
                snapshotCase: () => snapshotCase,
            }),
        }),
    })
