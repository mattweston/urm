import { Effect, HashSet, Schema as S, TxHashSet } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL TXHASHSET PROGRAMS
// -----------------------------------------------------------------------------

export const make_program = Effect.gen(function* () {
    const set = yield* TxHashSet.make("red", "green", "blue", "red")
    return [
        yield* TxHashSet.size(set),
        yield* TxHashSet.toHashSet(set),
    ] as const
})

export const from_hash_set_program = Effect.gen(function* () {
    const source = HashSet.make("alpha", "beta")
    const set = yield* TxHashSet.fromHashSet(source)
    yield* TxHashSet.add(set, "gamma")
    return [HashSet.size(source), yield* TxHashSet.size(set)] as const
})

export const add_remove_program = Effect.gen(function* () {
    const set = yield* TxHashSet.make("a", "b")
    yield* TxHashSet.add(set, "c")
    const removed = yield* TxHashSet.remove(set, "b")
    const missing = yield* TxHashSet.remove(set, "missing")
    return [removed, missing, yield* TxHashSet.toHashSet(set)] as const
})

export const transaction_program = Effect.gen(function* () {
    const active = yield* TxHashSet.make("alice", "bob")

    yield* Effect.tx(
        Effect.gen(function* () {
            const hasAlice = yield* TxHashSet.has(active, "alice")
            if (hasAlice) {
                yield* TxHashSet.remove(active, "alice")
                yield* TxHashSet.add(active, "charlie")
            }
        })
    )

    return yield* TxHashSet.toHashSet(active)
})

export const algebra_program = Effect.gen(function* () {
    const left = yield* TxHashSet.make("a", "b", "c")
    const right = yield* TxHashSet.make("b", "c", "d")
    const union = yield* TxHashSet.union(left, right)
    const intersection = yield* TxHashSet.intersection(left, right)
    const difference = yield* TxHashSet.difference(left, right)
    return [
        yield* TxHashSet.toHashSet(union),
        yield* TxHashSet.toHashSet(intersection),
        yield* TxHashSet.toHashSet(difference),
    ] as const
})

export const subset_program = Effect.gen(function* () {
    const small = yield* TxHashSet.make("a", "b")
    const large = yield* TxHashSet.make("a", "b", "c")
    return [
        yield* TxHashSet.isSubset(small, large),
        yield* TxHashSet.isSubset(large, small),
    ] as const
})

export const map_program = Effect.gen(function* () {
    const source = yield* TxHashSet.make("apple", "banana", "cherry")
    const lengths = yield* TxHashSet.map(
        source,
        (value: string) => value.length
    )
    return [
        yield* TxHashSet.size(source),
        yield* TxHashSet.size(lengths),
        yield* TxHashSet.toHashSet(lengths),
    ] as const
})

export const filter_program = Effect.gen(function* () {
    const source = yield* TxHashSet.make(1, 2, 3, 4, 5, 6)
    const evens = yield* TxHashSet.filter(
        source,
        (value: number) => value % 2 === 0
    )
    return yield* TxHashSet.toHashSet(evens)
})

export const reduce_program = Effect.gen(function* () {
    const source = yield* TxHashSet.make(1, 2, 3, 4)
    return yield* TxHashSet.reduce(
        source,
        0,
        (total: number, value: number) => total + value
    )
})

export const snapshot_program = Effect.gen(function* () {
    const set = yield* TxHashSet.make("x", "y")
    const snapshot = yield* TxHashSet.toHashSet(set)
    yield* TxHashSet.add(set, "z")
    return [HashSet.size(snapshot), yield* TxHashSet.size(set)] as const
})

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Create"),
    S.Literal("Mutate"),
    S.Literal("Algebra"),
    S.Literal("Transform"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Create",
    "Mutate",
    "Algebra",
    "Transform",
]

export const CreateCase = S.Union([
    S.Literal("Empty"),
    S.Literal("Make"),
    S.Literal("Iterable"),
    S.Literal("HashSet"),
])
export type CreateCase = typeof CreateCase.Type

export const create_cases: ReadonlyArray<CreateCase> = [
    "Empty",
    "Make",
    "Iterable",
    "HashSet",
]

export const MutateCase = S.Union([
    S.Literal("AddRemove"),
    S.Literal("Membership"),
    S.Literal("Clear"),
    S.Literal("Transaction"),
])
export type MutateCase = typeof MutateCase.Type

export const mutate_cases: ReadonlyArray<MutateCase> = [
    "AddRemove",
    "Membership",
    "Clear",
    "Transaction",
]

export const AlgebraCase = S.Union([
    S.Literal("Union"),
    S.Literal("Intersection"),
    S.Literal("Difference"),
    S.Literal("Subset"),
])
export type AlgebraCase = typeof AlgebraCase.Type

export const algebra_cases: ReadonlyArray<AlgebraCase> = [
    "Union",
    "Intersection",
    "Difference",
    "Subset",
]

export const TransformCase = S.Union([
    S.Literal("Map"),
    S.Literal("Filter"),
    S.Literal("Reduce"),
    S.Literal("Snapshot"),
])
export type TransformCase = typeof TransformCase.Type

export const transform_cases: ReadonlyArray<TransformCase> = [
    "Map",
    "Filter",
    "Reduce",
    "Snapshot",
]

export const Model = S.Struct({
    stage: Stage,
    createCase: CreateCase,
    mutateCase: MutateCase,
    algebraCase: AlgebraCase,
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
            "HashSet values stored inside TxRef-backed transactional state",
        title: "Create transactional unique-value state",
        description:
            "empty, make, fromIterable, and fromHashSet create a TxHashSet whose current immutable HashSet lives inside a TxRef. Duplicate values collapse according to HashSet equality and hashing semantics.",
        code: `const set = yield* TxHashSet.make(
    "red",
    "green",
    "blue",
    "red"
)

const size = yield* TxHashSet.size(set)
// 3`,
        apis: [
            "TxHashSet.empty",
            "TxHashSet.make",
            "TxHashSet.fromIterable",
            "TxHashSet.fromHashSet",
        ],
        notice: "TxHashSet.TxHashSet.Value<T> is the type-level value extractor. The live TxHashSet itself is runtime transactional state, not Foldkit model data.",
    },

    Mutate: {
        eyebrow: "add, remove, and clear mutate the existing transactional set",
        title: "Mutate membership atomically",
        description:
            "add inserts a value if absent; remove reports whether a value actually existed; clear replaces the current HashSet with an empty one. has, size, isEmpty, some, and every inspect the same transactional state.",
        code: `yield* Effect.tx(
    Effect.gen(function*() {
        const hasAlice = yield* TxHashSet.has(active, "alice")
        if (hasAlice) {
            yield* TxHashSet.remove(active, "alice")
            yield* TxHashSet.add(active, "charlie")
        }
    })
)`,
        apis: [
            "TxHashSet.add",
            "TxHashSet.remove",
            "TxHashSet.has",
            "Effect.tx",
        ],
        notice: "Each operation is transactional on its own. Wrap related reads and writes in one Effect.tx when they form a single invariant.",
    },

    Algebra: {
        eyebrow:
            "set algebra reads both transactional sets and builds a fresh result set",
        title: "Union, intersect, subtract, and compare sets",
        description:
            "union, intersection, and difference read their input TxHashSets within one transaction and return a new TxHashSet. isSubset inspects the relation without mutating either side.",
        code: `const common = yield* TxHashSet.intersection(
    left,
    right
)

const values = yield* TxHashSet.toHashSet(common)
// a plain immutable HashSet snapshot`,
        apis: [
            "TxHashSet.union",
            "TxHashSet.intersection",
            "TxHashSet.difference",
            "TxHashSet.isSubset",
        ],
        notice: "Algebra helpers do not mutate either input. They allocate a new transactional set from the combined immutable HashSet value.",
    },

    Transform: {
        eyebrow:
            "whole-set transforms derive new TxHashSets; folds and snapshots return plain values",
        title: "Map, filter, reduce, and snapshot",
        description:
            "map and filter derive new transactional sets while leaving the source unchanged. map may reduce cardinality when several source values map to the same output. reduce returns one plain value; toHashSet returns an immutable snapshot.",
        code: `const lengths = yield* TxHashSet.map(
    words,
    (word: string) => word.length
)

const snapshot = yield* TxHashSet.toHashSet(lengths)`,
        apis: [
            "TxHashSet.map",
            "TxHashSet.filter",
            "TxHashSet.reduce",
            "TxHashSet.toHashSet",
        ],
        notice: "A snapshot is stable: later TxHashSet mutations do not change the HashSet value you already received.",
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
                input: "value type V",
                operation: "TxHashSet.empty<V>()",
                result: "empty transactional set",
                invariant: "size starts at zero",
                implementation: "HashSet.empty → TxRef.make",
                guidance: "Use empty when membership is populated later.",
            }
        case "Make":
            return {
                input: "variadic values",
                operation: "TxHashSet.make(...values)",
                result: "populated TxHashSet",
                invariant: "duplicates collapse",
                implementation: "HashSet.make → TxRef.make",
                guidance:
                    "Use make for a compact literal set of starting values.",
            }
        case "Iterable":
            return {
                input: "Iterable<V>",
                operation: "TxHashSet.fromIterable(values)",
                result: "TxHashSet<V>",
                invariant: "source duplicates collapse",
                implementation: "HashSet.fromIterable → TxRef.make",
                guidance:
                    "Use for arrays, Sets, strings, generators, and other iterable sources.",
            }
        case "HashSet":
            return {
                input: "immutable HashSet<V>",
                operation: "TxHashSet.fromHashSet(set)",
                result: "new transactional wrapper",
                invariant:
                    "later TxHashSet changes do not mutate the source HashSet",
                implementation: "existing HashSet → new TxRef",
                guidance:
                    "Use when transactional ownership begins from an existing HashSet snapshot.",
            }
    }
}

export const mutate_snapshot = (model: Model): Snapshot => {
    switch (model.mutateCase) {
        case "AddRemove":
            return {
                input: "set + value",
                operation: "add / remove",
                result: "same TxHashSet reference",
                invariant:
                    "add deduplicates; remove returns whether value existed",
                implementation: "TxRef update/set around HashSet operations",
                guidance:
                    "Use remove's boolean when the distinction between present and absent matters.",
            }
        case "Membership":
            return {
                input: "current set + predicate",
                operation: "has · size · isEmpty · some · every",
                result: "transactional read values",
                invariant: "reads observe the current committed HashSet",
                implementation: "TxRef.get → HashSet query",
                guidance:
                    "some on empty is false; every on empty is true, matching ordinary universal quantification.",
            }
        case "Clear":
            return {
                input: "live TxHashSet",
                operation: "TxHashSet.clear(set)",
                result: "same reference, now empty",
                invariant: "all previous memberships are removed",
                implementation: "TxRef.set(HashSet.empty())",
                guidance:
                    "Use clear when the transactional identity should stay the same but contents should reset.",
            }
        case "Transaction":
            return {
                input: "related membership check + writes",
                operation: "Effect.tx(Effect.gen(...))",
                result: "one atomic commit",
                invariant: "all steps participate in one transaction",
                implementation: "shared TxRef transaction journal",
                guidance:
                    "Use when a conditional remove/add pair or related TxRefs must change together.",
            }
    }
}

export const algebra_snapshot = (model: Model): Snapshot => {
    switch (model.algebraCase) {
        case "Union":
            return {
                input: "left ∪ right",
                operation: "TxHashSet.union(left, right)",
                result: "new TxHashSet<V0 | V1>",
                invariant: "inputs remain unchanged",
                implementation:
                    "read both sets in Effect.tx → HashSet.union → fromHashSet",
                guidance:
                    "Use to combine memberships without mutating either source.",
            }
        case "Intersection":
            return {
                input: "left ∩ right",
                operation: "TxHashSet.intersection(left, right)",
                result: "new common-members TxHashSet",
                invariant: "only values present in both remain",
                implementation: "HashSet.intersection inside one transaction",
                guidance:
                    "Useful for shared capabilities, tags, roles, or eligibility sets.",
            }
        case "Difference":
            return {
                input: "left − right",
                operation: "TxHashSet.difference(left, right)",
                result: "new left-only TxHashSet",
                invariant: "right-only values never appear",
                implementation: "HashSet.difference inside one transaction",
                guidance:
                    "Use to compute removals, missing memberships, or pending work.",
            }
        case "Subset":
            return {
                input: "candidate + superset",
                operation: "TxHashSet.isSubset(candidate, superset)",
                result: "Effect<boolean>",
                invariant: "neither set is changed",
                implementation: "read both TxRefs then HashSet.isSubset",
                guidance:
                    "Use for containment checks without allocating a derived set.",
            }
    }
}

export const transform_snapshot = (model: Model): Snapshot => {
    switch (model.transformCase) {
        case "Map":
            return {
                input: "current values + V → U",
                operation: "TxHashSet.map(source, f)",
                result: "new TxHashSet<U>",
                invariant: "source is unchanged; output may deduplicate",
                implementation: "HashSet.map snapshot → fromHashSet",
                guidance:
                    "Mapped size can shrink when distinct inputs produce equal outputs.",
            }
        case "Filter":
            return {
                input: "current values + predicate/refinement",
                operation: "TxHashSet.filter(source, predicate)",
                result: "new filtered TxHashSet",
                invariant: "source is unchanged",
                implementation: "HashSet.filter snapshot → fromHashSet",
                guidance:
                    "Refinement overloads can narrow the output TxHashSet value type.",
            }
        case "Reduce":
            return {
                input: "current values + accumulator",
                operation: "TxHashSet.reduce(source, zero, f)",
                result: "plain accumulated value",
                invariant: "set state is not mutated",
                implementation: "TxRef.get → HashSet.reduce",
                guidance:
                    "Do not rely on iteration order for non-commutative reductions unless the value type provides a stable hash iteration order you control.",
            }
        case "Snapshot":
            return {
                input: "live TxHashSet",
                operation: "TxHashSet.toHashSet(source)",
                result: "immutable HashSet snapshot",
                invariant:
                    "later transactional writes cannot mutate the returned snapshot",
                implementation: "direct TxRef.get",
                guidance:
                    "Use when downstream code should leave the transactional world and work with an ordinary HashSet.",
            }
    }
}

export const current_snapshot = (model: Model): Snapshot => {
    switch (model.stage) {
        case "Create":
            return create_snapshot(model)
        case "Mutate":
            return mutate_snapshot(model)
        case "Algebra":
            return algebra_snapshot(model)
        case "Transform":
            return transform_snapshot(model)
    }
}

export const initial_model: Model = {
    stage: "Create",
    createCase: "Make",
    mutateCase: "AddRemove",
    algebraCase: "Union",
    transformCase: "Map",
}

// -----------------------------------------------------------------------------
// MESSAGES + UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedTxHashSetStage: { stage: Stage },
    SelectedTxHashSetCreateCase: { createCase: CreateCase },
    SelectedTxHashSetMutateCase: { mutateCase: MutateCase },
    SelectedTxHashSetAlgebraCase: { algebraCase: AlgebraCase },
    SelectedTxHashSetTransformCase: { transformCase: TransformCase },
})
export type Message = typeof Message.Type

type StagePayload = Readonly<{ stage: Stage }>
type CreateCasePayload = Readonly<{ createCase: CreateCase }>
type MutateCasePayload = Readonly<{ mutateCase: MutateCase }>
type AlgebraCasePayload = Readonly<{ algebraCase: AlgebraCase }>
type TransformCasePayload = Readonly<{ transformCase: TransformCase }>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedTxHashSetStage: ({ stage }: StagePayload) => ({
            model: evo(model, { stage: () => stage }),
        }),
        SelectedTxHashSetCreateCase: ({ createCase }: CreateCasePayload) => ({
            model: evo(model, { createCase: () => createCase }),
        }),
        SelectedTxHashSetMutateCase: ({ mutateCase }: MutateCasePayload) => ({
            model: evo(model, { mutateCase: () => mutateCase }),
        }),
        SelectedTxHashSetAlgebraCase: ({
            algebraCase,
        }: AlgebraCasePayload) => ({
            model: evo(model, { algebraCase: () => algebraCase }),
        }),
        SelectedTxHashSetTransformCase: ({
            transformCase,
        }: TransformCasePayload) => ({
            model: evo(model, { transformCase: () => transformCase }),
        }),
    })
