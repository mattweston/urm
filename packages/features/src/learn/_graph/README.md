# Graph

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/Graph

The current API page is Effect `4.0.0-rc.116` and reports **136 exports**.
`Graph` is one of the broadest core modules, spanning immutable and
scoped-mutable graph structures, traversal, analysis, path finding, set
operations, transformations, snapshots, and diagram export.

The implementation was also checked against the current
`packages/effect/src/Graph.ts`.

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `graph.ts` — directed / undirected graph construction, walkers, algorithms,
  snapshots, mutation, and Mermaid export.
- `graph.view.ts` — interactive visual demo.
- `graph-preview.png` — static preview of the default Build stage.

## Intended location

```text
packages/features/src/learn/graph/
├── graph.ts
└── graph.view.ts
```

No parent router/model/message/update files are modified.

## Why this demo is selective

The module currently exposes 136 API entries, so a useful teaching surface is
better than one control for every export.

The four stages cover the concepts that organize the wider API:

```text
Build
  immutable graph + scoped mutation + indexes

Traverse
  lazy Walker / NodeWalker iteration

Algorithms
  path finding + cycle / connectivity analysis

Snapshot
  persistence + immutable evolution + diagram export
```

The README also maps those examples to the larger API families.

## 1. Build

The demo creates two graphs.

### Directed dependency graph

```text
App ─1→ Auth ─1→ API ─1→ Database
 │                 ▲
 ├──────5──────────┘
 └────────────10────────────→ Database
```

Construction uses:

```ts
Graph.directed<string, number>(
    (mutable) => {
        const app =
            Graph.addNode(
                mutable,
                "App"
            )

        const auth =
            Graph.addNode(
                mutable,
                "Auth"
            )

        Graph.addEdge(
            mutable,
            app,
            auth,
            1
        )

        return undefined
    }
)
```

The constructor callback receives a temporary mutable graph. When the callback
returns, the public result is immutable.

The demo then shows:

```ts
Graph.nodeCount(graph)
Graph.edgeCount(graph)
Graph.successors(graph, app)
Graph.predecessors(graph, api)
Graph.isGraph(graph)
```

### Undirected social graph

```text
Ada — Grace — Linus
```

For undirected graphs:

```ts
Graph.neighbors(
    graph,
    grace
)
```

returns both adjacent endpoints.

### Stable indexes

`NodeIndex` and `EdgeIndex` are numeric identifiers, not array positions.

Graph allocates new identifiers as nodes and edges are added. Removed
identifiers are not reused.

That makes an index suitable for retaining as an identity across later queries
on the same graph lineage.

## 2. Traverse

Traversal APIs return lazy Walker values rather than eagerly allocating an
array.

Covered examples:

```ts
Graph.bfs
Graph.dfs
Graph.dfsPostOrder
Graph.topo
```

A traversal can be projected with:

```ts
Graph.indices(walker)
Graph.values(walker)
```

### BFS

Breadth-first traversal visits nodes by increasing unweighted edge distance from
the configured start nodes.

```ts
Graph.bfs(
    graph,
    {
        start: [0],
        direction: "outgoing"
    }
)
```

Search configuration also supports bounded radius.

### DFS

Depth-first traversal follows a branch before returning to siblings.

### DFS postorder

```ts
Graph.dfsPostOrder(...)
```

emits reachable descendants before their parents.

### Topological order

```ts
Graph.topo(graph)
```

uses Kahn's algorithm and requires a directed acyclic graph.

The demo dependency graph gives the conceptual dependency order:

```text
App
Auth
API
Database
```

`TopoConfig.initials` can prioritize specific eligible zero-in-degree nodes.

### External nodes

The stage also shows:

```ts
Graph.externals(
    graph,
    {
        direction: "incoming"
    }
)
```

to find source-like nodes with no incoming edges, and:

```ts
Graph.externals(
    graph,
    {
        direction: "outgoing"
    }
)
```

to find sink-like nodes with no outgoing edges.

Other iterator APIs include:

- `nodes`
- `edges`
- `entries`
- `indices`
- `values`

## 3. Algorithms

### Dijkstra

The demo performs a weighted shortest-path query:

```ts
Graph.dijkstra(
    dependencyGraph,
    {
        source: 0,
        target: 3,
        cost: (
            edgeData: number
        ) =>
            edgeData
    }
)
```

The minimum route is:

```text
App → Auth → API → Database
```

with total distance:

```text
3
```

A successful `PathResult<E>` contains:

```text
path      ordered node indexes
edges     ordered edge indexes
distance  numeric total
costs     original traversed edge payloads
```

The `costs` field stores original edge data, not necessarily the numeric value
returned by the cost function.

Dijkstra rejects invalid negative or `NaN` edge costs with `GraphError`.

### Cycles

The demo compares:

```ts
Graph.isAcyclic(
    dependencyGraph
)
// true
```

against a graph containing:

```text
A → B → C → A
```

which reports `false`.

`findCycle` is available when a concrete `CycleResult` witness is needed. Its
`path` is closed: the first node appears again at the end.

### Strongly connected components

For:

```text
A → B → C → A
        │
        └→ D
```

`stronglyConnectedComponents` groups:

```text
[0, 1, 2]
[3]
```

up to component / member ordering.

### Wider algorithm surface

The module also exposes:

- `allShortestPaths`
- `simplePaths`
- `astar`
- `bellmanFord`
- `floydWarshall`
- `unweightedDistances`
- `connectedComponents`
- `weaklyConnectedComponents`
- `articulationPoints`
- `bridges`
- `biconnectedComponents`
- `isBipartite`
- `maximumBipartiteMatching`
- `minimumSpanningForest`
- `maximumFlow`
- `minimumCut`
- `transitiveReduction`

The APIs throw `GraphError` when the requested algorithm does not accept the
graph kind or structural input.

## 4. Snapshot

### `toSnapshot` / `fromSnapshot`

```ts
const snapshot =
    Graph.toSnapshot(graph)

const roundTrip =
    Graph.fromSnapshot(
        snapshot
    )
```

A snapshot stores:

```text
type
active indexed nodes
active indexed edges
```

and therefore preserves the active `NodeIndex` and `EdgeIndex` identifiers.

Snapshot arrays must contain strictly increasing, non-negative safe integer
indexes, and every edge endpoint must reference a node in the snapshot.

Snapshots do **not** retain allocator history for identifiers that were removed.

### Immutable mutation

```ts
const next =
    Graph.mutate(
        graph,
        (mutable) => {
            const metrics =
                Graph.addNode(
                    mutable,
                    "Metrics"
                )

            Graph.addEdge(
                mutable,
                database,
                metrics,
                2
            )

            return undefined
        }
    )
```

The original graph remains structurally unchanged.

For mutation scopes that need to span several functions there are also:

```ts
Graph.beginMutation
Graph.endMutation
```

The mutable handle is terminal after finalization and must not be reused.

### Mermaid export

```ts
Graph.toMermaid(graph)
```

produces a Mermaid flowchart representation.

The module also provides:

```ts
Graph.toGraphViz
```

for GraphViz output.

## Major API families

The current reference groups the 136 exports into these families.

### Algorithms

Shortest paths, components, cycles, connectivity, spanning structures, flow,
cut, bipartite matching, reductions, and reachability.

### Configuration

Includes:

- `DijkstraConfig`
- `AstarConfig`
- `BellmanFordConfig`
- `SearchConfig`
- `TopoConfig`
- `ReachabilityConfig`
- `SimplePathsConfig`
- `MaximumFlowConfig`
- `MermaidOptions`
- `GraphVizOptions`
- identity / neighborhood configuration

### Constructors / converting

- `directed`
- `undirected`
- `make`
- `fromSnapshot`
- `toSnapshot`
- `toMermaid`
- `toGraphViz`

### Filtering / mapping

- `filterNodes`
- `filterEdges`
- `filterMapNodes`
- `filterMapEdges`
- `mapNodes`
- `mapEdges`

### Getters

Counts, degrees, neighbor queries, edge queries, safe node / edge lookup, and
find operations.

### Iterators

- `bfs`
- `dfs`
- `dfsPostOrder`
- `topo`
- `nodes`
- `edges`
- `entries`
- `externals`
- `indices`
- `values`

### Mutations

- `addNode`
- `addEdge`
- `removeNode`
- `removeNodes`
- `removeEdge`
- `removeEdges`
- `mutate`
- `beginMutation`
- `endMutation`

### Predicates

- `hasNode`
- `hasEdge`
- `hasPath`
- connectivity / tree predicates

### Set operations

- `complement`
- `compose`
- `difference`
- `intersection`
- `symmetricDifference`
- `sum`
- `inducedSubgraph`
- `neighborhood`

### Transforming

- `reverse`
- `updateNode`
- `updateEdge`

## Type discipline

The generated demo has no explicit `any` annotations.

All constructor / mutation callbacks have explicit Graph mutable types rather
than relying on contextual typing.

Every `Message.match` payload is explicitly typed, and Button attributes are
derived from `HtmlBuilder` so the demo remains clean under `noImplicitAny`.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `GraphDemo.Message` to the parent Message union,
3. initialize `GraphDemo.init`,
4. delegate child messages to `GraphDemo.update`,
5. render `GraphDemo.view(...)` from the Graph route.

This artifact intentionally performs none of those edits.
