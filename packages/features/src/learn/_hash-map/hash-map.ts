import { Hash, HashMap, Option, Result, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// DOMAIN TYPES
// -----------------------------------------------------------------------------

export type ServiceKey = Readonly<{
    id: number
    scope: string
}>

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Build"),
    S.Literal("Lookup"),
    S.Literal("Transform"),
    S.Literal("Batch"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Build",
    "Lookup",
    "Transform",
    "Batch",
]

export const BuildCase = S.Union([
    S.Literal("Construct"),
    S.Literal("StructuralKeys"),
    S.Literal("Iterate"),
])
export type BuildCase = typeof BuildCase.Type

export const LookupCase = S.Union([
    S.Literal("Safe"),
    S.Literal("Prehashed"),
    S.Literal("Search"),
])
export type LookupCase = typeof LookupCase.Type

export const TransformCase = S.Union([
    S.Literal("Update"),
    S.Literal("Filter"),
    S.Literal("Combine"),
    S.Literal("Fold"),
])
export type TransformCase = typeof TransformCase.Type

export const BatchCase = S.Union([S.Literal("Mutate"), S.Literal("Manual")])
export type BatchCase = typeof BatchCase.Type

export const Model = S.Struct({
    stage: Stage,
    buildCase: BuildCase,
    lookupCase: LookupCase,
    transformCase: TransformCase,
    batchCase: BatchCase,
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
        eyebrow: "immutable HAMT",
        title: "Build maps from entries and use Effect hashing for key identity",
        description:
            "HashMap is an immutable Hash Array Mapped Trie. Constructors accept entries, lookups hash keys with Effect Hash, and equality resolves matching buckets with Effect structural equality.",
        code: `const map =
    HashMap.make(
        ["a", 1],
        ["b", 2]
    )

const structural =
    HashMap.fromIterable<
        ServiceKey,
        string
    >([
        [
            {
                id: 1,
                scope: "prod"
            },
            "primary"
        ]
    ])

HashMap.get(
    structural,
    {
        id: 1,
        scope: "prod"
    }
)
// Some("primary")`,
        apis: [
            "HashMap.empty",
            "HashMap.make",
            "HashMap.fromIterable",
            "HashMap.isHashMap",
            "HashMap.isEmpty",
            "HashMap.size",
            "HashMap.keys",
            "HashMap.values",
            "HashMap.entries",
            "HashMap.toValues",
            "HashMap.toEntries",
        ],
        notice: "Object keys are hashed structurally and must be treated as immutable after their first hash computation because Effect caches object hashes. Use reference-based hashing when mutable identity is the intended key semantics.",
    },

    Lookup: {
        eyebrow: "safe, unsafe, pre-hashed",
        title: "Choose Option lookup, known-present access, or cached-hash hot paths",
        description:
            "get returns Option, getUnsafe throws when a key is absent, and getHash / hasHash avoid recomputing a hash you already have. Predicate helpers search across entries without converting the map.",
        code: `const map =
    HashMap.make(
        ["downloads", 100],
        ["views", 250]
    )

HashMap.get(
    map,
    "downloads"
)
// Some(100)

const hash =
    Hash.string(
        "downloads"
    )

HashMap.getHash(
    map,
    "downloads",
    hash
)
// Some(100)

HashMap.hasBy(
    map,
    (value) => value > 200
)
// true`,
        apis: [
            "HashMap.get",
            "HashMap.getUnsafe",
            "HashMap.getHash",
            "HashMap.has",
            "HashMap.hasHash",
            "HashMap.hasBy",
            "HashMap.findFirst",
            "HashMap.some",
            "HashMap.every",
            "Hash.hash",
        ],
        notice: "A supplied hash is only the bucket hint; key equality still has to match. A matching hash cannot make a different key equal, and a wrong hash cannot find the existing key.",
    },

    Transform: {
        eyebrow: "persistent transformation",
        title: "Every ordinary update returns an immutable map value",
        description:
            "Set, modify, remove, mapping, filtering, flattening, union, and folds work without exposing mutable implementation state. The original map remains usable after each derived result.",
        code: `const base =
    HashMap.make(
        ["a", 1],
        ["b", 2],
        ["c", 3]
    )

const next =
    base.pipe(
        HashMap.set(
            "d",
            4
        ),
        HashMap.modify(
            "a",
            (value) => value * 10
        ),
        HashMap.remove(
            "b"
        )
    )

HashMap.size(base)
// 3

HashMap.size(next)
// 3`,
        apis: [
            "HashMap.set",
            "HashMap.setMany",
            "HashMap.modify",
            "HashMap.modifyAt",
            "HashMap.modifyHash",
            "HashMap.remove",
            "HashMap.removeMany",
            "HashMap.union",
            "HashMap.map",
            "HashMap.flatMap",
            "HashMap.filter",
            "HashMap.filterMap",
            "HashMap.compact",
            "HashMap.reduce",
            "HashMap.forEach",
        ],
        notice: "union is right-biased for equal keys. modify changes only existing values; modifyAt receives Option so it can insert, update, or delete. filterMap keeps only Result successes.",
    },

    Batch: {
        eyebrow: "transient mutation window",
        title: "Use mutate or beginMutation / endMutation for efficient batches",
        description:
            "HashMap stays persistent at the public boundary, but batch helpers open a temporary editable HAMT. Multiple set/remove operations can reuse that transient structure before it is finalized.",
        code: `const original =
    HashMap.make(
        ["a", 1],
        ["b", 2]
    )

const next =
    HashMap.mutate(
        original,
        (mutable) => {
            HashMap.set(
                mutable,
                "c",
                3
            )
            HashMap.remove(
                mutable,
                "a"
            )
        }
    )

HashMap.toEntries(original)
// a=1, b=2

HashMap.toEntries(next)
// b=2, c=3`,
        apis: [
            "HashMap.mutate",
            "HashMap.beginMutation",
            "HashMap.endMutation",
            "HashMap.set",
            "HashMap.remove",
            "HashMap.setMany",
        ],
        notice: "Inside the editable window, mutation-oriented helpers update the transient map in place. endMutation finalizes that same transient value. Keep the finalized result and do not treat the transient handle as an ongoing mutable collection.",
    },
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

const option_number = (value: Option.Option<number>): string =>
    Option.match(value, {
        onNone: () => "None",
        onSome: (number: number) => `Some(${number})`,
    })

const option_string = (value: Option.Option<string>): string =>
    Option.match(value, {
        onNone: () => "None",
        onSome: (text: string) => `Some(${JSON.stringify(text)})`,
    })

const sorted_entries = <K, V>(
    map: HashMap.HashMap<K, V>,
    format: (key: K, value: V) => string
): string =>
    HashMap.toEntries(map)
        .map((entry: [K, V]) => {
            const [key, value] = entry

            return format(key, value)
        })
        .sort()
        .join(" · ")

// -----------------------------------------------------------------------------
// BUILD SNAPSHOT
// -----------------------------------------------------------------------------

export type BuildSnapshot = Readonly<{
    mode: BuildCase
    size: number
    empty: boolean
    isHashMap: boolean
    entries: string
    keys: string
    values: string
    structuralLookup: string
    structuralHashMatch: boolean
}>

export const build_snapshot = (model: Model): BuildSnapshot => {
    if (model.buildCase === "StructuralKeys") {
        const storedKey: ServiceKey = {
            id: 1,
            scope: "prod",
        }

        const equalKey: ServiceKey = {
            id: 1,
            scope: "prod",
        }

        const map = HashMap.fromIterable<ServiceKey, string>([
            [storedKey, "primary"],
        ])

        return {
            mode: model.buildCase,
            size: HashMap.size(map),
            empty: HashMap.isEmpty(map),
            isHashMap: HashMap.isHashMap(map),
            entries: sorted_entries(
                map,
                (key: ServiceKey, value: string) =>
                    `${key.id}/${key.scope}=${value}`
            ),
            keys: Array.from(HashMap.keys(map))
                .map((key: ServiceKey) => `${key.id}/${key.scope}`)
                .join(", "),
            values: HashMap.toValues(map).join(", "),
            structuralLookup: option_string(HashMap.get(map, equalKey)),
            structuralHashMatch: Hash.hash(storedKey) === Hash.hash(equalKey),
        }
    }

    const map =
        model.buildCase === "Iterate"
            ? HashMap.fromIterable<string, number>([
                  ["a", 1],
                  ["b", 2],
                  ["c", 3],
              ])
            : HashMap.make(["a", 1], ["b", 2], ["c", 3])

    return {
        mode: model.buildCase,
        size: HashMap.size(map),
        empty: HashMap.isEmpty(map),
        isHashMap: HashMap.isHashMap(map),
        entries: sorted_entries(
            map,
            (key: string, value: number) => `${key}=${value}`
        ),
        keys: Array.from(HashMap.keys(map)).sort().join(", "),
        values: Array.from(HashMap.values(map))
            .sort((left: number, right: number) => left - right)
            .join(", "),
        structuralLookup: "not selected",
        structuralHashMatch: false,
    }
}

// -----------------------------------------------------------------------------
// LOOKUP SNAPSHOT
// -----------------------------------------------------------------------------

export type LookupSnapshot = Readonly<{
    mode: LookupCase
    getExisting: string
    getMissing: string
    unsafeExisting: number
    hasExisting: boolean
    hash: string
    getHash: string
    hasHash: boolean
    hasBy: boolean
    findFirst: string
    some: boolean
    every: boolean
}>

export const lookup_snapshot = (model: Model): LookupSnapshot => {
    const map = HashMap.make(["downloads", 100], ["views", 250], ["errors", 3])

    const key = "downloads"

    const hash = Hash.string(key)

    const found = HashMap.findFirst(
        map,
        (value: number, entryKey: string) => entryKey === "views" && value > 200
    )

    return {
        mode: model.lookupCase,
        getExisting: option_number(HashMap.get(map, key)),
        getMissing: option_number(HashMap.get(map, "missing")),
        unsafeExisting: HashMap.getUnsafe(map, "views"),
        hasExisting: HashMap.has(map, "errors"),
        hash: String(hash),
        getHash: option_number(HashMap.getHash(map, key, hash)),
        hasHash: HashMap.hasHash(map, key, hash),
        hasBy: HashMap.hasBy(map, (value: number) => value > 200),
        findFirst: Option.match(found, {
            onNone: () => "None",
            onSome: (entry: [string, number]) =>
                `Some(${entry[0]}=${entry[1]})`,
        }),
        some: HashMap.some(map, (value: number) => value === 3),
        every: HashMap.every(map, (value: number) => value > 0),
    }
}

// -----------------------------------------------------------------------------
// TRANSFORM SNAPSHOT
// -----------------------------------------------------------------------------

export type TransformSnapshot = Readonly<{
    mode: TransformCase
    original: string
    result: string
    originalSize: number
    resultSize: number
    detail: string
    aggregate: string
}>

export const transform_snapshot = (model: Model): TransformSnapshot => {
    const base = HashMap.make(["a", 1], ["b", 2], ["c", 3], ["d", 4])

    if (model.transformCase === "Filter") {
        const filtered = HashMap.filter(
            base,
            (value: number) => value % 2 === 0
        )

        const mapped = HashMap.filterMap(base, (value: number) =>
            value % 2 === 0 ? Result.succeed(value * 10) : Result.fail("odd")
        )

        const compacted = HashMap.compact(
            HashMap.make(
                ["x", Option.some(1)],
                ["y", Option.none<number>()],
                ["z", Option.some(3)]
            )
        )

        return {
            mode: model.transformCase,
            original: sorted_entries(
                base,
                (key: string, value: number) => `${key}=${value}`
            ),
            result: sorted_entries(
                mapped,
                (key: string, value: number) => `${key}=${value}`
            ),
            originalSize: HashMap.size(base),
            resultSize: HashMap.size(mapped),
            detail: `filter even=${sorted_entries(filtered, (key: string, value: number) => `${key}=${value}`)} · compact=${sorted_entries(compacted, (key: string, value: number) => `${key}=${value}`)}`,
            aggregate: "filterMap keeps Result successes",
        }
    }

    if (model.transformCase === "Combine") {
        const right = HashMap.make(["b", 20], ["e", 5])

        const union = HashMap.union(base, right)

        const flatMapped = HashMap.flatMap(
            HashMap.make(["x", 1], ["y", 2]),
            (value: number, key: string) =>
                HashMap.make([`${key}1`, value], [`${key}2`, value * 2])
        )

        return {
            mode: model.transformCase,
            original: sorted_entries(
                base,
                (key: string, value: number) => `${key}=${value}`
            ),
            result: sorted_entries(
                union,
                (key: string, value: number) => `${key}=${value}`
            ),
            originalSize: HashMap.size(base),
            resultSize: HashMap.size(union),
            detail: `flatMap=${sorted_entries(flatMapped, (key: string, value: number) => `${key}=${value}`)}`,
            aggregate: "union is right-biased: b=20",
        }
    }

    if (model.transformCase === "Fold") {
        const mapped = HashMap.map(
            base,
            (value: number, key: string) => `${key}:${value * 2}`
        )

        const total = HashMap.reduce(
            base,
            0,
            (sum: number, value: number) => sum + value
        )

        const visited: Array<string> = []

        HashMap.forEach(base, (value: number, key: string) => {
            visited.push(`${key}:${value}`)
        })

        return {
            mode: model.transformCase,
            original: sorted_entries(
                base,
                (key: string, value: number) => `${key}=${value}`
            ),
            result: sorted_entries(
                mapped,
                (key: string, value: string) => `${key}=${value}`
            ),
            originalSize: HashMap.size(base),
            resultSize: HashMap.size(mapped),
            detail: `forEach=${visited.sort().join(", ")}`,
            aggregate: `reduce total=${total}`,
        }
    }

    const updated = HashMap.set(base, "e", 5)

    const modified = HashMap.modify(updated, "a", (value: number) => value * 10)

    const modifyAt = HashMap.modifyAt(
        modified,
        "b",
        (current: Option.Option<number>) =>
            Option.isSome(current)
                ? Option.some(current.value + 100)
                : Option.some(100)
    )

    const setMany = HashMap.setMany(modifyAt, [
        ["c", 30],
        ["f", 6],
    ])

    const removed = HashMap.removeMany(setMany, ["d", "e"])

    return {
        mode: model.transformCase,
        original: sorted_entries(
            base,
            (key: string, value: number) => `${key}=${value}`
        ),
        result: sorted_entries(
            removed,
            (key: string, value: number) => `${key}=${value}`
        ),
        originalSize: HashMap.size(base),
        resultSize: HashMap.size(removed),
        detail: "set e=5 · modify a×10 · modifyAt b+100 · setMany c/f · removeMany d/e",
        aggregate: "original remains unchanged",
    }
}

// -----------------------------------------------------------------------------
// BATCH SNAPSHOT
// -----------------------------------------------------------------------------

export type BatchSnapshot = Readonly<{
    mode: BatchCase
    original: string
    result: string
    originalSize: number
    resultSize: number
    sameTransientAfterSet: boolean
    finalizedSameObject: boolean
    originalHasA: boolean
    resultHasA: boolean
}>

export const batch_snapshot = (model: Model): BatchSnapshot => {
    const original = HashMap.make(["a", 1], ["b", 2])

    if (model.batchCase === "Manual") {
        const mutable = HashMap.beginMutation(original)

        const afterSet = HashMap.set(mutable, "c", 3)

        HashMap.setMany(mutable, [
            ["d", 4],
            ["e", 5],
        ])

        HashMap.remove(mutable, "a")

        const finalized = HashMap.endMutation(mutable)

        return {
            mode: model.batchCase,
            original: sorted_entries(
                original,
                (key: string, value: number) => `${key}=${value}`
            ),
            result: sorted_entries(
                finalized,
                (key: string, value: number) => `${key}=${value}`
            ),
            originalSize: HashMap.size(original),
            resultSize: HashMap.size(finalized),
            sameTransientAfterSet: afterSet === mutable,
            finalizedSameObject: finalized === mutable,
            originalHasA: HashMap.has(original, "a"),
            resultHasA: HashMap.has(finalized, "a"),
        }
    }

    const result = HashMap.mutate(
        original,
        (mutable: HashMap.HashMap<string, number>) => {
            HashMap.set(mutable, "c", 3)

            HashMap.set(mutable, "d", 4)

            HashMap.remove(mutable, "a")
        }
    )

    return {
        mode: model.batchCase,
        original: sorted_entries(
            original,
            (key: string, value: number) => `${key}=${value}`
        ),
        result: sorted_entries(
            result,
            (key: string, value: number) => `${key}=${value}`
        ),
        originalSize: HashMap.size(original),
        resultSize: HashMap.size(result),
        sameTransientAfterSet: true,
        finalizedSameObject: true,
        originalHasA: HashMap.has(original, "a"),
        resultHasA: HashMap.has(result, "a"),
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedHashMapStage: {
        stage: Stage,
    },
    SelectedHashMapBuildCase: {
        buildCase: BuildCase,
    },
    SelectedHashMapLookupCase: {
        lookupCase: LookupCase,
    },
    SelectedHashMapTransformCase: {
        transformCase: TransformCase,
    },
    SelectedHashMapBatchCase: {
        batchCase: BatchCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Build",
    buildCase: "Construct",
    lookupCase: "Safe",
    transformCase: "Update",
    batchCase: "Mutate",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type BuildCasePayload = Readonly<{
    buildCase: BuildCase
}>

type LookupCasePayload = Readonly<{
    lookupCase: LookupCase
}>

type TransformCasePayload = Readonly<{
    transformCase: TransformCase
}>

type BatchCasePayload = Readonly<{
    batchCase: BatchCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedHashMapStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedHashMapBuildCase: ({ buildCase }: BuildCasePayload) => ({
            model: modifyFields(model, {
                buildCase: () => buildCase,
            }),
        }),

        SelectedHashMapLookupCase: ({ lookupCase }: LookupCasePayload) => ({
            model: modifyFields(model, {
                lookupCase: () => lookupCase,
            }),
        }),

        SelectedHashMapTransformCase: ({
            transformCase,
        }: TransformCasePayload) => ({
            model: modifyFields(model, {
                transformCase: () => transformCase,
            }),
        }),

        SelectedHashMapBatchCase: ({ batchCase }: BatchCasePayload) => ({
            model: modifyFields(model, {
                batchCase: () => batchCase,
            }),
        }),
    })
