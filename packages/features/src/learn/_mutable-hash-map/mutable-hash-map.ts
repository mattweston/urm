import { Equal, Hash, MutableHashMap, Option, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// DOMAIN KEY
// -----------------------------------------------------------------------------

export class UserId implements Equal.Equal {
    constructor(readonly value: string) {}

    [Equal.symbol](that: Equal.Equal): boolean {
        return that instanceof UserId && this.value === that.value
    }

    [Hash.symbol](): number {
        return Hash.string(this.value)
    }

    toString(): string {
        return `UserId(${this.value})`
    }
}

const option_text = <A>(option: Option.Option<A>): string =>
    Option.match(option, {
        onNone: () => "None",
        onSome: (value: A) => `Some(${String(value)})`,
    })

const entries_text = <K, V>(map: MutableHashMap.MutableHashMap<K, V>): string =>
    Array.from(map)
        .map(([key, value]: [K, V]) => `${String(key)}=${String(value)}`)
        .join(" · ")

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Create"),
    S.Literal("Lookup"),
    S.Literal("Mutate"),
    S.Literal("Equality"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Create",
    "Lookup",
    "Mutate",
    "Equality",
]

export const CreateCase = S.Union([
    S.Literal("Empty"),
    S.Literal("Make"),
    S.Literal("Iterable"),
])
export type CreateCase = typeof CreateCase.Type

export const LookupCase = S.Union([
    S.Literal("Get"),
    S.Literal("Iterate"),
    S.Literal("Size"),
])
export type LookupCase = typeof LookupCase.Type

export const MutateCase = S.Union([
    S.Literal("Set"),
    S.Literal("Modify"),
    S.Literal("ModifyAt"),
    S.Literal("RemoveClear"),
])
export type MutateCase = typeof MutateCase.Type

export const EqualityCase = S.Union([
    S.Literal("Primitive"),
    S.Literal("Structural"),
    S.Literal("Reference"),
])
export type EqualityCase = typeof EqualityCase.Type

export const Model = S.Struct({
    stage: Stage,
    createCase: CreateCase,
    lookupCase: LookupCase,
    mutateCase: MutateCase,
    equalityCase: EqualityCase,
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
        eyebrow: "mutable key / value storage",
        title: "Create an empty map, explicit entries, or any iterable of pairs",
        description:
            "MutableHashMap is an in-place key/value collection. empty creates a fresh instance, make accepts variadic entries, and fromIterable consumes any iterable of readonly key/value pairs.",
        code: `const empty =
    MutableHashMap.empty<
        string,
        number
    >()

const made =
    MutableHashMap.make(
        ["one", 1],
        ["two", 2]
    )

const fromIterable =
    MutableHashMap.fromIterable(
        new Map([
            ["a", 10],
            ["b", 20]
        ])
    )`,
        apis: [
            "MutableHashMap.MutableHashMap",
            "MutableHashMap.empty",
            "MutableHashMap.make",
            "MutableHashMap.fromIterable",
            "MutableHashMap.isMutableHashMap",
        ],
        notice: "Every mutation updates the same MutableHashMap instance. Use it when localized mutation is intentional; use immutable HashMap when previous versions must remain stable.",
    },

    Lookup: {
        eyebrow: "Option reads + iterable views",
        title: "Read safely with Option, test membership, and iterate keys, values, or entries",
        description:
            "get returns Option<V>, has answers membership, keys and values expose Iterables, and the map itself is Iterable<[K, V]>. size is constant-time over the backing map and isEmpty checks whether size is zero.",
        code: `const map =
    MutableHashMap.make(
        ["alpha", 1],
        ["beta", 2]
    )

MutableHashMap.get(
    map,
    "alpha"
)
// Some(1)

MutableHashMap.has(
    map,
    "missing"
)
// false

Array.from(
    MutableHashMap.keys(
        map
    )
)
// ["alpha", "beta"]

Array.from(
    map
)
// [["alpha", 1], ["beta", 2]]`,
        apis: [
            "MutableHashMap.get",
            "MutableHashMap.has",
            "MutableHashMap.keys",
            "MutableHashMap.values",
            "MutableHashMap.size",
            "MutableHashMap.isEmpty",
            "MutableHashMap.forEach",
        ],
        notice: "forEach follows Map.prototype.forEach argument order: callback(value, key). Iteration follows the backing Map's order.",
    },

    Mutate: {
        eyebrow: "same instance, new contents",
        title: "Set, transform, conditionally insert/remove, delete, or clear in place",
        description:
            "set inserts or replaces. modify changes only an existing key. modifyAt receives Option<V> and can insert, update, keep, or remove by returning Some or None. remove and clear delete entries while preserving the map object.",
        code: `const map =
    MutableHashMap.make(
        ["count", 2]
    )

const same =
    MutableHashMap.set(
        map,
        "total",
        10
    )

same === map
// true

MutableHashMap.modify(
    map,
    "count",
    (
        value: number
    ) =>
        value + 1
)

MutableHashMap.modifyAt(
    map,
    "maybe",
    () =>
        Option.some(
            42
        )
)

MutableHashMap.remove(
    map,
    "total"
)`,
        apis: [
            "MutableHashMap.set",
            "MutableHashMap.modify",
            "MutableHashMap.modifyAt",
            "MutableHashMap.remove",
            "MutableHashMap.clear",
        ],
        notice: "modify is intentionally non-inserting: a missing key stays missing. modifyAt is the general optional-value operation—return Some to keep/set a value or None to remove / remain absent.",
    },

    Equality: {
        eyebrow: "native lookup + Effect hash/equality",
        title: "Primitive keys use ordinary Map behavior; custom Equal / Hash keys can match by value",
        description:
            "MutableHashMap keeps a native backing Map and hash buckets. A custom key implementing Equal and Hash can be found using a distinct but equal object, as long as equal values obey the same hash contract.",
        code: `class UserId
    implements Equal.Equal
{
    constructor(
        readonly value: string
    ) {}

    [Equal.symbol](
        that: Equal.Equal
    ): boolean {
        return (
            that instanceof UserId &&
            this.value ===
                that.value
        )
    }

    [Hash.symbol](): number {
        return Hash.string(
            this.value
        )
    }
}

const map =
    MutableHashMap.make(
        [
            new UserId("42"),
            "Ada"
        ]
    )

MutableHashMap.get(
    map,
    new UserId("42")
)
// Some("Ada")`,
        apis: [
            "MutableHashMap.get",
            "MutableHashMap.set",
            "Equal.Equal",
            "Equal.symbol",
            "Hash.symbol",
            "Hash.string",
        ],
        notice: "Hash-based keys must be stable after insertion. Equal values must produce equal hashes; mutating fields that participate in equality / hashing can make later lookup unreliable.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

export type CreateSnapshot = Readonly<{
    mode: CreateCase
    emptySize: number
    made: string
    iterable: string
    guard: boolean
    identity: string
}>

export const create_snapshot = (model: Model): CreateSnapshot => {
    const empty = MutableHashMap.empty<string, number>()

    const made = MutableHashMap.make(["one", 1] as const, ["two", 2] as const)

    const fromIterable = MutableHashMap.fromIterable(
        new Map<string, number>([
            ["a", 10],
            ["b", 20],
        ])
    )

    return {
        mode: model.createCase,
        emptySize: MutableHashMap.size(empty),
        made: entries_text(made),
        iterable: entries_text(fromIterable),
        guard: MutableHashMap.isMutableHashMap(made),
        identity: "each constructor call creates a fresh mutable map",
    }
}

export type LookupSnapshot = Readonly<{
    mode: LookupCase
    hit: string
    miss: string
    has: boolean
    keys: string
    values: string
    entries: string
    size: number
    empty: boolean
    forEachOrder: string
}>

export const lookup_snapshot = (model: Model): LookupSnapshot => {
    const map = MutableHashMap.make(
        ["alpha", 1] as const,
        ["beta", 2] as const,
        ["gamma", 3] as const
    )

    const seen: Array<string> = []

    MutableHashMap.forEach(map, (value: number, key: string): void => {
        seen.push(`${key}:${value}`)
    })

    return {
        mode: model.lookupCase,
        hit: option_text(MutableHashMap.get(map, "beta")),
        miss: option_text(MutableHashMap.get(map, "missing")),
        has: MutableHashMap.has(map, "alpha"),
        keys: Array.from(MutableHashMap.keys(map)).join(" · "),
        values: Array.from(MutableHashMap.values(map))
            .map((value: number) => String(value))
            .join(" · "),
        entries: entries_text(map),
        size: MutableHashMap.size(map),
        empty: MutableHashMap.isEmpty(map),
        forEachOrder: seen.join(" · "),
    }
}

export type MutateSnapshot = Readonly<{
    mode: MutateCase
    before: string
    after: string
    sameReference: boolean
    missingModify: string
    modifyAtInsert: string
    modifyAtRemove: string
    clearSameReference: boolean
}>

export const mutate_snapshot = (model: Model): MutateSnapshot => {
    const map = MutableHashMap.make(["count", 2] as const, ["keep", 9] as const)

    const before = entries_text(map)

    const returned = MutableHashMap.set(map, "total", 10)

    MutableHashMap.modify(map, "count", (value: number): number => value + 3)

    MutableHashMap.modify(map, "missing", (value: number): number => value + 1)

    const afterMissing = option_text(MutableHashMap.get(map, "missing"))

    MutableHashMap.modifyAt(
        map,
        "inserted",
        (current: Option.Option<number>): Option.Option<number> =>
            Option.isNone(current) ? Option.some(42) : current
    )

    const afterInsert = option_text(MutableHashMap.get(map, "inserted"))

    MutableHashMap.modifyAt(
        map,
        "keep",
        (_current: Option.Option<number>): Option.Option<number> =>
            Option.none()
    )

    const afterRemove = option_text(MutableHashMap.get(map, "keep"))

    MutableHashMap.remove(map, "total")

    const after = entries_text(map)

    const clearReturned = MutableHashMap.clear(map)

    return {
        mode: model.mutateCase,
        before,
        after,
        sameReference: returned === map,
        missingModify: afterMissing,
        modifyAtInsert: afterInsert,
        modifyAtRemove: afterRemove,
        clearSameReference:
            clearReturned === map && MutableHashMap.isEmpty(map),
    }
}

export type EqualitySnapshot = Readonly<{
    mode: EqualityCase
    primitive: string
    structuralHit: string
    equal: boolean
    hashEqual: boolean
    different: string
    warning: string
}>

export const equality_snapshot = (model: Model): EqualitySnapshot => {
    const stored = new UserId("42")

    const equalLookup = new UserId("42")

    const differentLookup = new UserId("43")

    const map = MutableHashMap.make([stored, "Ada"] as const)

    return {
        mode: model.equalityCase,
        primitive:
            "string / number / symbol primitives use native Map key semantics",
        structuralHit: option_text(MutableHashMap.get(map, equalLookup)),
        equal: Equal.equals(stored, equalLookup),
        hashEqual: Hash.hash(stored) === Hash.hash(equalLookup),
        different: option_text(MutableHashMap.get(map, differentLookup)),
        warning: "keep fields used by Equal / Hash immutable after insertion",
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedMutableHashMapStage: {
        stage: Stage,
    },
    SelectedMutableHashMapCreateCase: {
        createCase: CreateCase,
    },
    SelectedMutableHashMapLookupCase: {
        lookupCase: LookupCase,
    },
    SelectedMutableHashMapMutateCase: {
        mutateCase: MutateCase,
    },
    SelectedMutableHashMapEqualityCase: {
        equalityCase: EqualityCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Create",
    createCase: "Empty",
    lookupCase: "Get",
    mutateCase: "Set",
    equalityCase: "Structural",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type CreateCasePayload = Readonly<{
    createCase: CreateCase
}>

type LookupCasePayload = Readonly<{
    lookupCase: LookupCase
}>

type MutateCasePayload = Readonly<{
    mutateCase: MutateCase
}>

type EqualityCasePayload = Readonly<{
    equalityCase: EqualityCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedMutableHashMapStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedMutableHashMapCreateCase: ({
            createCase,
        }: CreateCasePayload) => ({
            model: evo(model, {
                createCase: () => createCase,
            }),
        }),

        SelectedMutableHashMapLookupCase: ({
            lookupCase,
        }: LookupCasePayload) => ({
            model: evo(model, {
                lookupCase: () => lookupCase,
            }),
        }),

        SelectedMutableHashMapMutateCase: ({
            mutateCase,
        }: MutateCasePayload) => ({
            model: evo(model, {
                mutateCase: () => mutateCase,
            }),
        }),

        SelectedMutableHashMapEqualityCase: ({
            equalityCase,
        }: EqualityCasePayload) => ({
            model: evo(model, {
                equalityCase: () => equalityCase,
            }),
        }),
    })
