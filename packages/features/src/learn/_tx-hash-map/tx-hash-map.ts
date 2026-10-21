import {
    Effect,
    Hash,
    HashMap,
    Option,
    Result,
    Schema as S,
    TxHashMap,
} from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL TXHASHMAP PROGRAMS
// -----------------------------------------------------------------------------

export const make_program = Effect.gen(function* () {
    const map = yield* TxHashMap.make(["alice", 2], ["bob", 5])
    return yield* TxHashMap.entries(map)
})

export const get_program = Effect.gen(function* () {
    const map = yield* TxHashMap.make(["alice", 2])
    return [
        yield* TxHashMap.get(map, "alice"),
        yield* TxHashMap.get(map, "missing"),
    ] as const
})

export const snapshot_program = Effect.gen(function* () {
    const map = yield* TxHashMap.make(["count", 1])
    const snapshot = yield* TxHashMap.snapshot(map)
    yield* TxHashMap.set(map, "count", 2)
    return [
        HashMap.get(snapshot, "count"),
        yield* TxHashMap.get(map, "count"),
    ] as const
})

export const hash_lookup_program = Effect.gen(function* () {
    const map = yield* TxHashMap.make(["session", 42])
    const hash = Hash.string("session")
    return [
        yield* TxHashMap.getHash(map, "session", hash),
        yield* TxHashMap.hasHash(map, "session", hash),
    ] as const
})

export const modify_program = Effect.gen(function* () {
    const map = yield* TxHashMap.make(["views", 10])
    const previous = yield* TxHashMap.modify(map, "views", (n: number) => n + 1)
    const current = yield* TxHashMap.get(map, "views")
    return [previous, current] as const
})

export const modify_at_program = Effect.gen(function* () {
    const map = yield* TxHashMap.make<string, number>(["keep", 1])
    yield* TxHashMap.modifyAt(map, "added", () => Option.some(2))
    yield* TxHashMap.modifyAt(map, "keep", () => Option.none())
    return yield* TxHashMap.entries(map)
})

export const atomic_transfer_program = Effect.gen(function* () {
    const balances = yield* TxHashMap.make(["alice", 10], ["bob", 0])

    yield* Effect.tx(
        Effect.gen(function* () {
            const alice = yield* TxHashMap.get(balances, "alice")
            const bob = yield* TxHashMap.get(balances, "bob")
            if (
                Option.isSome(alice) &&
                Option.isSome(bob) &&
                alice.value >= 3
            ) {
                yield* TxHashMap.set(balances, "alice", alice.value - 3)
                yield* TxHashMap.set(balances, "bob", bob.value + 3)
            }
        })
    )

    return yield* TxHashMap.entries(balances)
})

export const transform_program = Effect.gen(function* () {
    const source = yield* TxHashMap.make(
        ["alice", 2],
        ["bob", 5],
        ["charlie", 8]
    )
    const doubled = yield* TxHashMap.map(source, (value: number) => value * 2)
    const large = yield* TxHashMap.filter(
        doubled,
        (value: number) => value >= 10
    )
    return [
        yield* TxHashMap.entries(source),
        yield* TxHashMap.entries(large),
    ] as const
})

export const filter_map_program = Effect.gen(function* () {
    const source = yield* TxHashMap.make(["good", "42"], ["bad", "nope"])
    return yield* TxHashMap.filterMap(source, (value: string) => {
        const parsed = Number(value)
        return Number.isFinite(parsed)
            ? Result.succeed(parsed)
            : Result.failVoid
    })
})

export const compact_program = Effect.gen(function* () {
    const source = yield* TxHashMap.make(
        ["ready", Option.some(1)],
        ["missing", Option.none<number>()]
    )
    return yield* TxHashMap.compact(source)
})

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Create"),
    S.Literal("Read"),
    S.Literal("Mutate"),
    S.Literal("Transform"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Create",
    "Read",
    "Mutate",
    "Transform",
]

export const CreateCase = S.Union([
    S.Literal("Empty"),
    S.Literal("Make"),
    S.Literal("Iterable"),
    S.Literal("Types"),
])
export type CreateCase = typeof CreateCase.Type

export const create_cases: ReadonlyArray<CreateCase> = [
    "Empty",
    "Make",
    "Iterable",
    "Types",
]

export const ReadCase = S.Union([
    S.Literal("Get"),
    S.Literal("Enumerate"),
    S.Literal("Snapshot"),
    S.Literal("Predicates"),
])
export type ReadCase = typeof ReadCase.Type

export const read_cases: ReadonlyArray<ReadCase> = [
    "Get",
    "Enumerate",
    "Snapshot",
    "Predicates",
]

export const MutateCase = S.Union([
    S.Literal("Set"),
    S.Literal("Modify"),
    S.Literal("ModifyAt"),
    S.Literal("Transaction"),
])
export type MutateCase = typeof MutateCase.Type

export const mutate_cases: ReadonlyArray<MutateCase> = [
    "Set",
    "Modify",
    "ModifyAt",
    "Transaction",
]

export const TransformCase = S.Union([
    S.Literal("Map"),
    S.Literal("Filter"),
    S.Literal("Search"),
    S.Literal("Flatten"),
])
export type TransformCase = typeof TransformCase.Type

export const transform_cases: ReadonlyArray<TransformCase> = [
    "Map",
    "Filter",
    "Search",
    "Flatten",
]

export const Model = S.Struct({
    stage: Stage,
    createCase: CreateCase,
    readCase: ReadCase,
    mutateCase: MutateCase,
    transformCase: TransformCase,
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
    Create: {
        eyebrow:
            "HashMap values stored inside TxRef-backed transactional state",
        title: "Create transactional key-value state",
        description:
            "empty, make, and fromIterable create a TxHashMap whose current immutable HashMap is stored in a TxRef. The TxHashMap reference is mutable transactional state even though each underlying HashMap value is immutable.",
        code: `const map = yield* TxHashMap.make(
    ["alice", 2],
    ["bob", 5]
)

const size = yield* TxHashMap.size(map)`,
        apis: [
            "TxHashMap.empty",
            "TxHashMap.make",
            "TxHashMap.fromIterable",
            "TxHashMap.TxHashMap.Key",
        ],
        notice: "The namespace exposes Key, Value, and Entry type utilities. Keep the live TxHashMap itself out of a serializable Foldkit model.",
    },

    Read: {
        eyebrow: "transactional reads plus immutable snapshots",
        title: "Read keys, values, entries, and snapshots",
        description:
            "get and has read the current map transactionally. keys, values, entries, and aliases materialize arrays. snapshot returns the current immutable HashMap value, so later TxHashMap mutations do not change the snapshot you already received.",
        code: `const snapshot = yield* TxHashMap.snapshot(map)

yield* TxHashMap.set(map, "count", 2)

HashMap.get(snapshot, "count")
// still the old snapshot value`,
        apis: [
            "TxHashMap.get",
            "TxHashMap.entries",
            "TxHashMap.snapshot",
            "TxHashMap.getHash",
        ],
        notice: "getHash and hasHash are expert hot-path helpers: the supplied hash must correspond to the same key or a real entry can be missed.",
    },

    Mutate: {
        eyebrow:
            "single operations are transactional; multi-step invariants belong in Effect.tx",
        title: "Mutate the existing transactional map",
        description:
            "set, remove, clear, bulk operations, modify, and modifyAt all update the existing TxHashMap. modify updates only an existing value and returns its previous Option; modifyAt can insert, update, or remove through an Option-to-Option transition.",
        code: `yield* Effect.tx(
    Effect.gen(function*() {
        const alice = yield* TxHashMap.get(balances, "alice")
        const bob = yield* TxHashMap.get(balances, "bob")

        // commit both balance changes together
    })
)`,
        apis: [
            "TxHashMap.set",
            "TxHashMap.modify",
            "TxHashMap.modifyAt",
            "Effect.tx",
        ],
        notice: "Use one explicit Effect.tx when several reads and writes together form one invariant. A sequence of separately-run transactional operations is not the same atomic unit.",
    },

    Transform: {
        eyebrow: "whole-map transforms derive new TxHashMap references",
        title: "Map, filter, search, fold, and flatten snapshots",
        description:
            "map, filter, filterMap, compact, and flatMap read the current map and build a new TxHashMap, leaving the source unchanged. reduce, findFirst, hasBy, some, every, and forEach inspect the current snapshot without replacing the source.",
        code: `const doubled = yield* TxHashMap.map(
    source,
    (value: number) => value * 2
)

const large = yield* TxHashMap.filter(
    doubled,
    (value: number) => value >= 10
)`,
        apis: [
            "TxHashMap.map",
            "TxHashMap.filter",
            "TxHashMap.filterMap",
            "TxHashMap.flatMap",
        ],
        notice: "Derived-map helpers allocate a new transactional reference. They are not in-place map mutations, even though their inputs and outputs are both TxHashMap values.",
    },
}

// -----------------------------------------------------------------------------
// VISUAL SNAPSHOTS
// -----------------------------------------------------------------------------

export type Snapshot = Readonly<{
    input: string
    operation: string
    result: string
    invariant: string
    implementation: string
    guidance: string
}>

export const create_snapshot = (model: Model): Snapshot => {
    switch (model.createCase) {
        case "Empty":
            return {
                input: "key/value types",
                operation: "TxHashMap.empty<K, V>()",
                result: "empty transactional map",
                invariant: "initial HashMap has zero entries",
                implementation: "TxRef.make(HashMap.empty())",
                guidance: "Use empty when entries arrive after construction.",
            }
        case "Make":
            return {
                input: "entry tuples",
                operation: "TxHashMap.make(...entries)",
                result: "populated TxHashMap",
                invariant:
                    "duplicate HashMap keys follow HashMap replacement semantics",
                implementation: "HashMap.make → TxRef.make",
                guidance:
                    "Use make for a compact literal set of initial entries.",
            }
        case "Iterable":
            return {
                input: "Iterable<readonly [K, V]>",
                operation: "TxHashMap.fromIterable(entries)",
                result: "TxHashMap<K, V>",
                invariant: "all entries become one initial HashMap snapshot",
                implementation: "HashMap.fromIterable → TxRef.make",
                guidance:
                    "Use for arrays, Maps, generators, and other iterable entry sources.",
            }
        case "Types":
            return {
                input: "TxHashMap<K, V> type",
                operation: "TxHashMap.Key / Value / Entry",
                result: "reusable extracted types",
                invariant: "type-only helpers add no runtime work",
                implementation: "conditional namespace types",
                guidance:
                    "Useful when helper functions should reuse the exact key/value types of a map.",
            }
    }
}

export const read_snapshot = (model: Model): Snapshot => {
    switch (model.readCase) {
        case "Get":
            return {
                input: "map + key",
                operation: "TxHashMap.get(map, key)",
                result: "Effect<Option<V>>",
                invariant: "missing keys are Option.none",
                implementation: "TxRef.get → HashMap.get",
                guidance:
                    "Prefer get for ordinary safe lookup; has is the boolean membership variant.",
            }
        case "Enumerate":
            return {
                input: "current map",
                operation: "keys / values / entries",
                result: "materialized arrays",
                invariant:
                    "ordering follows HashMap iteration, not sorted-key order",
                implementation: "TxRef.get + HashMap iterators",
                guidance:
                    "Sort explicitly when deterministic presentation order matters.",
            }
        case "Snapshot":
            return {
                input: "live TxHashMap",
                operation: "TxHashMap.snapshot(map)",
                result: "immutable HashMap<K, V>",
                invariant:
                    "later TxHashMap writes do not mutate the returned HashMap value",
                implementation: "direct TxRef.get",
                guidance:
                    "Use snapshot when downstream work should use a stable plain HashMap value.",
            }
        case "Predicates":
            return {
                input: "map / key / predicate",
                operation: "has · isEmpty · some · every",
                result: "transactional booleans",
                invariant:
                    "getHash/hasHash require the matching hash for the same key",
                implementation: "read snapshot then delegate to HashMap",
                guidance:
                    "Use hash-aware variants only when you already own a correctly precomputed key hash.",
            }
    }
}

export const mutate_snapshot = (model: Model): Snapshot => {
    switch (model.mutateCase) {
        case "Set":
            return {
                input: "key + value",
                operation: "TxHashMap.set(map, key, value)",
                result: "same map reference, updated state",
                invariant: "set inserts or replaces",
                implementation: "TxRef.update(HashMap.set)",
                guidance:
                    "Bulk inserts use setMany; union merges a plain HashMap with right-side replacement.",
            }
        case "Modify":
            return {
                input: "existing key + V → V",
                operation: "TxHashMap.modify(map, key, f)",
                result: "Option<previous V>",
                invariant: "missing key is left unchanged",
                implementation:
                    "read current map → set updated HashMap in one transaction",
                guidance:
                    "Use when the old value is useful and insertion on absence is not desired.",
            }
        case "ModifyAt":
            return {
                input: "Option<V> → Option<V>",
                operation: "TxHashMap.modifyAt(map, key, f)",
                result: "insert · update · remove · no-op",
                invariant: "Some stores; None removes an existing entry",
                implementation:
                    "Option-driven HashMap set/remove inside Effect.tx",
                guidance:
                    "This is the most general single-key pure transition in the module.",
            }
        case "Transaction":
            return {
                input: "multiple related reads/writes",
                operation: "Effect.tx(Effect.gen(...))",
                result: "one atomic commit",
                invariant:
                    "all steps observe one transactional state transition",
                implementation: "shared transaction over TxRef access",
                guidance:
                    "Use for transfers, conditional updates, or invariants spanning several keys/TxRefs.",
            }
    }
}

export const transform_snapshot = (model: Model): Snapshot => {
    switch (model.transformCase) {
        case "Map":
            return {
                input: "current entries + V,K → A",
                operation: "TxHashMap.map(source, f)",
                result: "new TxHashMap<K, A>",
                invariant: "source map is unchanged",
                implementation: "HashMap.map snapshot → new TxRef",
                guidance:
                    "Use for whole-map value type changes while preserving keys.",
            }
        case "Filter":
            return {
                input: "current entries + predicate",
                operation: "filter / filterMap / compact",
                result: "new derived TxHashMap",
                invariant: "source map is unchanged",
                implementation: "snapshot transform → fromHashMap",
                guidance:
                    "filterMap uses Result success/failure as keep/drop; compact unwraps Some and drops None.",
            }
        case "Search":
            return {
                input: "current entries + predicate",
                operation: "findFirst · hasBy · some · every",
                result: "Option entry or boolean",
                invariant: "these inspect rather than replace the map",
                implementation: "TxRef.get → HashMap query",
                guidance:
                    "Use findFirst when you need the matching key/value pair, not just a boolean.",
            }
        case "Flatten":
            return {
                input: "each entry → Effect<TxHashMap<K, A>>",
                operation: "TxHashMap.flatMap(source, f)",
                result: "new flattened TxHashMap<K, A>",
                invariant:
                    "later produced entries replace earlier duplicate keys",
                implementation: "single Effect.tx builds a fresh result map",
                guidance:
                    "Use when each source entry expands into zero or many keyed results.",
            }
    }
}

export const current_snapshot = (model: Model): Snapshot => {
    switch (model.stage) {
        case "Create":
            return create_snapshot(model)
        case "Read":
            return read_snapshot(model)
        case "Mutate":
            return mutate_snapshot(model)
        case "Transform":
            return transform_snapshot(model)
    }
}

export const initial_model: Model = {
    stage: "Create",
    createCase: "Make",
    readCase: "Get",
    mutateCase: "Set",
    transformCase: "Map",
}

// -----------------------------------------------------------------------------
// MESSAGES + UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedTxHashMapStage: { stage: Stage },
    SelectedTxHashMapCreateCase: { createCase: CreateCase },
    SelectedTxHashMapReadCase: { readCase: ReadCase },
    SelectedTxHashMapMutateCase: { mutateCase: MutateCase },
    SelectedTxHashMapTransformCase: { transformCase: TransformCase },
})
export type Message = typeof Message.Type

type StagePayload = Readonly<{ stage: Stage }>
type CreateCasePayload = Readonly<{ createCase: CreateCase }>
type ReadCasePayload = Readonly<{ readCase: ReadCase }>
type MutateCasePayload = Readonly<{ mutateCase: MutateCase }>
type TransformCasePayload = Readonly<{ transformCase: TransformCase }>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedTxHashMapStage: ({ stage }: StagePayload) => ({
            model: evo(model, { stage: () => stage }),
        }),
        SelectedTxHashMapCreateCase: ({ createCase }: CreateCasePayload) => ({
            model: evo(model, { createCase: () => createCase }),
        }),
        SelectedTxHashMapReadCase: ({ readCase }: ReadCasePayload) => ({
            model: evo(model, { readCase: () => readCase }),
        }),
        SelectedTxHashMapMutateCase: ({ mutateCase }: MutateCasePayload) => ({
            model: evo(model, { mutateCase: () => mutateCase }),
        }),
        SelectedTxHashMapTransformCase: ({
            transformCase,
        }: TransformCasePayload) => ({
            model: evo(model, { transformCase: () => transformCase }),
        }),
    })
