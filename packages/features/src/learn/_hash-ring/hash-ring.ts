import { HashRing, PrimaryKey, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// NODES
// -----------------------------------------------------------------------------

export class CacheNode implements PrimaryKey.PrimaryKey {
    constructor(
        readonly id: string,
        readonly region: string
    ) {}

    [PrimaryKey.symbol](): string {
        return this.id
    }
}

const node = (id: string, region: string): CacheNode =>
    new CacheNode(id, region)

const node_a = () => node("cache-a", "eu-west")

const node_b = () => node("cache-b", "eu-central")

const node_c = () => node("cache-c", "us-east")

const node_d = () => node("cache-d", "ap-south")

const make_three_node_ring = (
    baseWeight = 16
): HashRing.HashRing<CacheNode> => {
    const ring = HashRing.make<CacheNode>({
        baseWeight,
    })

    HashRing.addMany(ring, [node_a(), node_b(), node_c()])

    return ring
}

const route_label = (value: CacheNode | undefined): string =>
    value === undefined ? "undefined" : `${value.id} · ${value.region}`

const assignment_counts = (nodes: ReadonlyArray<CacheNode>): string => {
    const counts = new Map<string, number>()

    for (const current of nodes) {
        counts.set(current.id, (counts.get(current.id) ?? 0) + 1)
    }

    return Array.from(counts)
        .sort((left: [string, number], right: [string, number]) =>
            left[0].localeCompare(right[0])
        )
        .map((entry: [string, number]) => `${entry[0]}=${entry[1]}`)
        .join(" · ")
}

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Build"),
    S.Literal("Route"),
    S.Literal("Weights"),
    S.Literal("Shards"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Build",
    "Route",
    "Weights",
    "Shards",
]

export const BuildCase = S.Union([
    S.Literal("Add"),
    S.Literal("AddMany"),
    S.Literal("Identity"),
])
export type BuildCase = typeof BuildCase.Type

export const RouteCase = S.Union([
    S.Literal("Single"),
    S.Literal("Remap"),
    S.Literal("Empty"),
])
export type RouteCase = typeof RouteCase.Type

export const WeightCase = S.Union([
    S.Literal("Balanced"),
    S.Literal("Weighted"),
    S.Literal("Clamp"),
])
export type WeightCase = typeof WeightCase.Type

export const ShardCase = S.Union([
    S.Literal("Balanced"),
    S.Literal("Weighted"),
    S.Literal("Counts"),
])
export type ShardCase = typeof ShardCase.Type

export const Model = S.Struct({
    stage: Stage,
    buildCase: BuildCase,
    routeCase: RouteCase,
    weightCase: WeightCase,
    shardCase: ShardCase,
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
        eyebrow: "mutable consistent-hash ring",
        title: "Nodes are registered by PrimaryKey and expanded into virtual points",
        description:
            "make creates an empty ring, add / addMany register PrimaryKey nodes, and isHashRing checks the runtime marker. Node identity is the PrimaryKey string, so a fresh object with the same key updates the same member.",
        code: `const ring =
    HashRing.make<CacheNode>({
        baseWeight: 16
    })

HashRing.addMany(
    ring,
    [
        new CacheNode(
            "cache-a",
            "eu-west"
        ),
        new CacheNode(
            "cache-b",
            "eu-central"
        )
    ]
)

HashRing.has(
    ring,
    new CacheNode(
        "cache-a",
        "other-region"
    )
)
// true`,
        apis: [
            "HashRing.HashRing",
            "HashRing.make",
            "HashRing.add",
            "HashRing.addMany",
            "HashRing.has",
            "HashRing.isHashRing",
            "PrimaryKey.symbol",
            "PrimaryKey.value",
        ],
        notice: "HashRing is mutable. add, addMany, and remove return the same ring instance. baseWeight controls virtual-point density and is clamped to at least 1.",
    },

    Route: {
        eyebrow: "consistent routing",
        title: "get assigns each input string to the closest ring member",
        description:
            "HashRing.get hashes an arbitrary input string and selects a node from the virtual-point ring. Adding a node changes only a subset of routes, which is the core benefit of consistent hashing.",
        code: `const ring =
    makeRing()

HashRing.get(
    ring,
    "user:42"
)
// CacheNode | undefined

const before =
    keys.map(
        (key) =>
            HashRing.get(
                ring,
                key
            )
    )

HashRing.add(
    ring,
    cacheD
)

const after =
    keys.map(
        (key) =>
            HashRing.get(
                ring,
                key
            )
    )

// only a subset remap`,
        apis: ["HashRing.get", "HashRing.add", "HashRing.remove"],
        notice: "get returns undefined when the ring has no virtual points. With a populated ring, routing is deterministic for the current membership, weights, and baseWeight.",
    },

    Weights: {
        eyebrow: "weighted virtual points",
        title: "Weight changes capacity by changing a node's share of the ring",
        description:
            "A weight-1 node receives roughly baseWeight virtual points. Re-adding the same PrimaryKey with a new weight removes its old points and rebuilds its share. Weight is clamped to at least 0.1.",
        code: `const ring =
    HashRing.make<CacheNode>({
        baseWeight: 8
    })

HashRing.add(
    ring,
    cacheA,
    { weight: 1 }
)

HashRing.add(
    ring,
    cacheB,
    { weight: 2 }
)

// virtual points:
// A ≈ 8
// B ≈ 16

HashRing.add(
    ring,
    new CacheNode(
        "cache-a",
        "new-region"
    ),
    { weight: 3 }
)
// updates cache-a`,
        apis: [
            "HashRing.add",
            "HashRing.addMany",
            "HashRing.remove",
            "HashRing.has",
        ],
        notice: "Membership is keyed only by PrimaryKey.value. Re-adding the same key can replace the stored node object and update its weight. The stored weight itself is clamped to at least 0.1.",
    },

    Shards: {
        eyebrow: "fixed shard ownership",
        title: "getShards precomputes a balanced weighted owner for each shard index",
        description:
            "Use get for arbitrary request keys; use getShards when the application already has a fixed number of shard indexes. The algorithm respects weights while trying to keep assignments balanced.",
        code: `const owners =
    HashRing.getShards(
        ring,
        12
    )

owners?.map(
    (node, shard) => ({
        shard,
        owner: node.id
    })
)

// fixed shard → node ownership`,
        apis: ["HashRing.getShards", "HashRing.get"],
        notice: "Finite fractional shard counts are rounded down. NaN and non-positive counts normalize to an empty assignment. An empty ring returns undefined because there is no node that can own a shard.",
    },
}

// -----------------------------------------------------------------------------
// BUILD SNAPSHOT
// -----------------------------------------------------------------------------

export type BuildSnapshot = Readonly<{
    mode: BuildCase
    baseWeight: number
    nodeCount: number
    virtualPoints: number
    isHashRing: boolean
    sameInstance: boolean
    keys: string
    primaryIdentity: boolean
    updatedRegion: string
}>

export const build_snapshot = (model: Model): BuildSnapshot => {
    const ring = HashRing.make<CacheNode>({
        baseWeight: 8,
    })

    let sameInstance = true

    if (model.buildCase === "Add") {
        const returned = HashRing.add(ring, node_a())

        sameInstance = returned === ring

        HashRing.add(ring, node_b())
    } else {
        const returned = HashRing.addMany(ring, [node_a(), node_b()])

        sameInstance = returned === ring
    }

    const equalKeyNode = node("cache-a", "replacement-region")

    const primaryIdentity = HashRing.has(ring, equalKeyNode)

    if (model.buildCase === "Identity") {
        HashRing.add(ring, equalKeyNode)
    }

    const storedA = ring.nodes.get("cache-a")

    return {
        mode: model.buildCase,
        baseWeight: ring.baseWeight,
        nodeCount: ring.nodes.size,
        virtualPoints: ring.ring.length,
        isHashRing: HashRing.isHashRing(ring),
        sameInstance,
        keys: Array.from(ring)
            .map((current: CacheNode) => PrimaryKey.value(current))
            .sort()
            .join(", "),
        primaryIdentity,
        updatedRegion: storedA === undefined ? "—" : storedA[0].region,
    }
}

// -----------------------------------------------------------------------------
// ROUTE SNAPSHOT
// -----------------------------------------------------------------------------

const route_keys: ReadonlyArray<string> = [
    "user:1",
    "user:2",
    "user:3",
    "user:4",
    "order:100",
    "order:101",
    "session:a",
    "session:b",
    "image:hero",
    "image:logo",
    "job:alpha",
    "job:beta",
]

export type RouteSnapshot = Readonly<{
    mode: RouteCase
    input: string
    owner: string
    beforeCounts: string
    afterCounts: string
    unchanged: number
    remapped: number
    total: number
    emptyResult: string
}>

export const route_snapshot = (model: Model): RouteSnapshot => {
    if (model.routeCase === "Empty") {
        const empty = HashRing.make<CacheNode>()

        return {
            mode: model.routeCase,
            input: "user:42",
            owner: "undefined",
            beforeCounts: "—",
            afterCounts: "—",
            unchanged: 0,
            remapped: 0,
            total: 0,
            emptyResult: String(HashRing.get(empty, "user:42")),
        }
    }

    const ring = make_three_node_ring(32)

    const before = route_keys.map((key: string) => HashRing.get(ring, key))

    const owner = HashRing.get(ring, "user:42")

    HashRing.add(ring, node_d())

    const after = route_keys.map((key: string) => HashRing.get(ring, key))

    let unchanged = 0

    for (let index = 0; index < route_keys.length; index++) {
        if (before[index]?.id === after[index]?.id) {
            unchanged++
        }
    }

    const beforeDefined = before.filter(
        (current: CacheNode | undefined): current is CacheNode =>
            current !== undefined
    )

    const afterDefined = after.filter(
        (current: CacheNode | undefined): current is CacheNode =>
            current !== undefined
    )

    return {
        mode: model.routeCase,
        input: "user:42",
        owner: route_label(owner),
        beforeCounts: assignment_counts(beforeDefined),
        afterCounts: assignment_counts(afterDefined),
        unchanged,
        remapped: route_keys.length - unchanged,
        total: route_keys.length,
        emptyResult: "not selected",
    }
}

// -----------------------------------------------------------------------------
// WEIGHTS SNAPSHOT
// -----------------------------------------------------------------------------

const point_counts = (ring: HashRing.HashRing<CacheNode>): string => {
    const counts = new Map<string, number>()

    for (const point of ring.ring) {
        const key = point[1]

        counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    return Array.from(counts)
        .sort((left: [string, number], right: [string, number]) =>
            left[0].localeCompare(right[0])
        )
        .map((entry: [string, number]) => `${entry[0]}=${entry[1]}`)
        .join(" · ")
}

const weight_summary = (ring: HashRing.HashRing<CacheNode>): string =>
    Array.from(ring.nodes)
        .sort(
            (
                left: [string, [CacheNode, number]],
                right: [string, [CacheNode, number]]
            ) => left[0].localeCompare(right[0])
        )
        .map(
            (entry: [string, [CacheNode, number]]) =>
                `${entry[0]}=${entry[1][1]}`
        )
        .join(" · ")

export type WeightSnapshot = Readonly<{
    mode: WeightCase
    baseWeight: number
    weights: string
    pointCounts: string
    totalWeight: number
    totalPoints: number
    sameKeyUpdate: boolean
    regionAfterUpdate: string
    removed: boolean
}>

export const weight_snapshot = (model: Model): WeightSnapshot => {
    const ring = HashRing.make<CacheNode>({
        baseWeight: model.weightCase === "Clamp" ? 0 : 8,
    })

    if (model.weightCase === "Balanced") {
        HashRing.addMany(ring, [node_a(), node_b(), node_c()])
    } else if (model.weightCase === "Clamp") {
        HashRing.add(ring, node_a(), {
            weight: 0,
        })

        HashRing.add(ring, node_b(), {
            weight: -20,
        })
    } else {
        HashRing.add(ring, node_a(), {
            weight: 1,
        })

        HashRing.add(ring, node_b(), {
            weight: 2,
        })

        HashRing.add(ring, node_c(), {
            weight: 0.5,
        })
    }

    const before = ring.nodes.get("cache-a")

    let sameKeyUpdate = false

    if (model.weightCase === "Weighted") {
        const replacement = node("cache-a", "eu-west-2")

        HashRing.add(ring, replacement, {
            weight: 3,
        })

        sameKeyUpdate = ring.nodes.get("cache-a")?.[0] === replacement
    }

    const regionAfterUpdate = ring.nodes.get("cache-a")?.[0].region ?? "—"

    let removed = false

    if (model.weightCase === "Balanced") {
        const countBefore = ring.nodes.size

        HashRing.remove(ring, node("cache-c", "ignored-region"))

        removed = ring.nodes.size === countBefore - 1
    }

    return {
        mode: model.weightCase,
        baseWeight: ring.baseWeight,
        weights: weight_summary(ring),
        pointCounts: point_counts(ring),
        totalWeight: ring.totalWeightCache,
        totalPoints: ring.ring.length,
        sameKeyUpdate:
            model.weightCase === "Weighted"
                ? sameKeyUpdate
                : before !== undefined,
        regionAfterUpdate,
        removed,
    }
}

// -----------------------------------------------------------------------------
// SHARDS SNAPSHOT
// -----------------------------------------------------------------------------

export type ShardSnapshot = Readonly<{
    mode: ShardCase
    requested: string
    assigned: number
    ownership: string
    sequence: string
    emptyRing: string
    zeroCount: string
}>

export const shard_snapshot = (model: Model): ShardSnapshot => {
    const ring = HashRing.make<CacheNode>({
        baseWeight: 32,
    })

    if (model.shardCase === "Weighted") {
        HashRing.add(ring, node_a(), {
            weight: 1,
        })

        HashRing.add(ring, node_b(), {
            weight: 2,
        })

        HashRing.add(ring, node_c(), {
            weight: 1,
        })
    } else {
        HashRing.addMany(ring, [node_a(), node_b(), node_c()])
    }

    const requested = model.shardCase === "Counts" ? 8.9 : 12

    const shards = HashRing.getShards(ring, requested) ?? []

    const empty = HashRing.make<CacheNode>()

    const emptyRing = HashRing.getShards(empty, 4)

    const zero = HashRing.getShards(ring, 0)

    return {
        mode: model.shardCase,
        requested: String(requested),
        assigned: shards.length,
        ownership: assignment_counts(shards),
        sequence: shards
            .map(
                (current: CacheNode, index: number) => `${index}:${current.id}`
            )
            .join("\n"),
        emptyRing: String(emptyRing),
        zeroCount:
            zero === undefined ? "undefined" : `[] length=${zero.length}`,
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedHashRingStage: {
        stage: Stage,
    },
    SelectedHashRingBuildCase: {
        buildCase: BuildCase,
    },
    SelectedHashRingRouteCase: {
        routeCase: RouteCase,
    },
    SelectedHashRingWeightCase: {
        weightCase: WeightCase,
    },
    SelectedHashRingShardCase: {
        shardCase: ShardCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Build",
    buildCase: "Add",
    routeCase: "Single",
    weightCase: "Balanced",
    shardCase: "Balanced",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type BuildCasePayload = Readonly<{
    buildCase: BuildCase
}>

type RouteCasePayload = Readonly<{
    routeCase: RouteCase
}>

type WeightCasePayload = Readonly<{
    weightCase: WeightCase
}>

type ShardCasePayload = Readonly<{
    shardCase: ShardCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedHashRingStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedHashRingBuildCase: ({ buildCase }: BuildCasePayload) => ({
            model: evo(model, {
                buildCase: () => buildCase,
            }),
        }),

        SelectedHashRingRouteCase: ({ routeCase }: RouteCasePayload) => ({
            model: evo(model, {
                routeCase: () => routeCase,
            }),
        }),

        SelectedHashRingWeightCase: ({ weightCase }: WeightCasePayload) => ({
            model: evo(model, {
                weightCase: () => weightCase,
            }),
        }),

        SelectedHashRingShardCase: ({ shardCase }: ShardCasePayload) => ({
            model: evo(model, {
                shardCase: () => shardCase,
            }),
        }),
    })
