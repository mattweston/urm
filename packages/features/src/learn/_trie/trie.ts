import { Option, Result, Schema as S, Trie } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL TRIE PROGRAMS
// -----------------------------------------------------------------------------

export const route_trie = Trie.make(
    ["app", "application root"],
    ["apple", "fruit"],
    ["application", "software"],
    ["apply", "verb"],
    ["banana", "fruit"]
)

export const empty_trie = Trie.empty<string>()

export const inserted_trie = Trie.insert(route_trie, "appetite", "noun")
export const inserted_many_trie = Trie.insertMany(route_trie, [
    ["ape", "animal"],
    ["apex", "peak"],
])
export const removed_trie = Trie.remove(route_trie, "banana")
export const modified_trie = Trie.modify(route_trie, "app", (value: string) =>
    value.toUpperCase()
)

export const exact_apple = Trie.get(route_trie, "apple")
export const exact_missing = Trie.get(route_trie, "apples")
export const unsafe_app = Trie.getUnsafe(route_trie, "app")
export const route_count = Trie.size(route_trie)
export const ordered_entries = Trie.toEntries(route_trie)

export const app_keys = Array.from(Trie.keysWithPrefix(route_trie, "app"))
export const app_values = Array.from(Trie.valuesWithPrefix(route_trie, "app"))
export const app_entries = Trie.toEntriesWithPrefix(route_trie, "app")
export const longest_route = Trie.longestPrefixOf(
    route_trie,
    "application/json"
)

export const labelled_trie = Trie.map(
    route_trie,
    (value: string, key: string) => `${key}: ${value}`
)
export const app_only_trie = Trie.filter(
    route_trie,
    (_value: string, key: string) => key.startsWith("app")
)
export const long_key_lengths = Trie.filterMap(
    route_trie,
    (value: string, key: string) =>
        key.length >= 6 ? Result.succeed(value.length) : Result.failVoid
)
export const compacted_trie = Trie.compact(
    Trie.make(
        ["alpha", Option.some(1)],
        ["beta", Option.none<number>()],
        ["gamma", Option.some(3)]
    )
)
export const total_label_length = Trie.reduce(
    route_trie,
    0,
    (total: number, value: string) => total + value.length
)

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Build"),
    S.Literal("Lookup"),
    S.Literal("Prefix"),
    S.Literal("Transform"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Build",
    "Lookup",
    "Prefix",
    "Transform",
]

export const BuildCase = S.Union([
    S.Literal("Empty"),
    S.Literal("Make"),
    S.Literal("Insert"),
    S.Literal("Persistent"),
])
export type BuildCase = typeof BuildCase.Type

export const build_cases: ReadonlyArray<BuildCase> = [
    "Empty",
    "Make",
    "Insert",
    "Persistent",
]

export const LookupCase = S.Union([
    S.Literal("Exact"),
    S.Literal("Unsafe"),
    S.Literal("Presence"),
    S.Literal("Order"),
])
export type LookupCase = typeof LookupCase.Type

export const lookup_cases: ReadonlyArray<LookupCase> = [
    "Exact",
    "Unsafe",
    "Presence",
    "Order",
]

export const PrefixCase = S.Union([
    S.Literal("Keys"),
    S.Literal("Entries"),
    S.Literal("Longest"),
    S.Literal("Direction"),
])
export type PrefixCase = typeof PrefixCase.Type

export const prefix_cases: ReadonlyArray<PrefixCase> = [
    "Keys",
    "Entries",
    "Longest",
    "Direction",
]

export const TransformCase = S.Union([
    S.Literal("Map"),
    S.Literal("Filter"),
    S.Literal("FilterMap"),
    S.Literal("Reduce"),
])
export type TransformCase = typeof TransformCase.Type

export const transform_cases: ReadonlyArray<TransformCase> = [
    "Map",
    "Filter",
    "FilterMap",
    "Reduce",
]

export const Model = S.Struct({
    stage: Stage,
    buildCase: BuildCase,
    lookupCase: LookupCase,
    prefixCase: PrefixCase,
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
    Build: {
        eyebrow: "immutable prefix tree · path-copying updates",
        title: "Build a string-keyed prefix index",
        description:
            "Trie stores values behind non-empty string keys. Constructors create persistent tries, and insert/remove/modify return new values rather than mutating the original structure.",
        code: `const trie = Trie.make(
    ["app", "root"],
    ["apple", "fruit"],
    ["application", "software"]
)

const next = Trie.insert(trie, "apply", "verb")`,
        apis: ["Trie.empty", "Trie.make", "Trie.fromIterable", "Trie.insert"],
        notice: "Updates use path-copying immutability. Keep the old trie when historical versions matter; otherwise replace your reference with the returned trie.",
    },

    Lookup: {
        eyebrow: "exact lookup · sorted iteration · safe and unsafe access",
        title: "Read exact keys and inspect ordered contents",
        description:
            "get returns Option for safe exact lookup, while getUnsafe throws on a missing key. keys, values, entries, and toEntries iterate in alphabetical key order, independent of insertion order.",
        code: `Trie.get(trie, "apple")
// Option.some("fruit")

Trie.get(trie, "apples")
// Option.none()

Trie.toEntries(trie)
// sorted by key`,
        apis: ["Trie.get", "Trie.getUnsafe", "Trie.has", "Trie.toEntries"],
        notice: "Exact lookup is not prefix lookup. A key that merely starts with a stored key still returns None unless that full key is present.",
    },

    Prefix: {
        eyebrow: "prefix enumeration · longest stored prefix",
        title: "Search both directions of the prefix relationship",
        description:
            "keysWithPrefix and entriesWithPrefix find stored keys that begin with a query prefix. longestPrefixOf does the opposite: it finds the longest stored key that is itself a prefix of the query string.",
        code: `Trie.toEntriesWithPrefix(trie, "app")
// app, apple, application, apply

Trie.longestPrefixOf(
    trie,
    "application/json"
)
// Option.some(["application", "software"])`,
        apis: [
            "Trie.keysWithPrefix",
            "Trie.entriesWithPrefix",
            "Trie.longestPrefixOf",
        ],
        notice: "Direction matters: prefix enumeration asks 'which stored keys start here?'; longestPrefixOf asks 'which stored key best matches the start of this query?'.",
    },

    Transform: {
        eyebrow: "whole-trie transforms preserve key ordering",
        title: "Map, filter, compact, reduce, and traverse",
        description:
            "map transforms values, filter keeps matching entries, filterMap combines selection with transformation through Result, compact drops None values, and reduce/forEach traverse in key order.",
        code: `const labels = Trie.map(
    trie,
    (value, key) => \`\${key}: \${value}\`
)

const onlyApp = Trie.filter(
    trie,
    (_, key) => key.startsWith("app")
)`,
        apis: [
            "Trie.map",
            "Trie.filter",
            "Trie.filterMap",
            "Trie.compact",
            "Trie.reduce",
        ],
        notice: "Transforms return new tries and keep the same prefix-tree semantics. filterMap keeps Result successes and drops failures.",
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

export const build_snapshot = (model: Model): Snapshot => {
    switch (model.buildCase) {
        case "Empty":
            return {
                input: "no entries",
                operation: "Trie.empty<string>()",
                result: "Trie<string> · size 0",
                invariant: "empty-string keys are not stored",
                implementation: "immutable prefix-tree root = undefined",
                guidance:
                    "Use empty when entries arrive incrementally through later persistent updates.",
            }
        case "Make":
            return {
                input: "entry tuples",
                operation: "Trie.make(...entries)",
                result: "one populated Trie",
                invariant: "duplicate keys keep the latest inserted value",
                implementation:
                    "delegates through repeated immutable insertion",
                guidance:
                    "Use make for small literal tables and fromIterable for an existing collection.",
            }
        case "Insert":
            return {
                input: 'trie + ["appetite", "noun"]',
                operation: "Trie.insert(...) / insertMany(...) ",
                result: "new Trie with extra keys",
                invariant: "the original trie remains usable",
                implementation: "copies only the changed search path",
                guidance:
                    "Batch additions with insertMany when the values already share one value type.",
            }
        case "Persistent":
            return {
                input: "existing trie",
                operation: "remove / modify",
                result: "new version of the trie",
                invariant: "missing remove/modify returns the original trie",
                implementation: "path-copying persistent update",
                guidance:
                    "Keep previous versions for snapshots, undo, or branch-like configuration states.",
            }
    }
}

export const lookup_snapshot = (model: Model): Snapshot => {
    switch (model.lookupCase) {
        case "Exact":
            return {
                input: 'key "apple"',
                operation: "Trie.get(trie, key)",
                result: 'Option.some("fruit")',
                invariant: "only the full key counts as a match",
                implementation: "safe lookup returns Option<V>",
                guidance:
                    "Use get for application lookups where absence is an expected branch.",
            }
        case "Unsafe":
            return {
                input: 'known key "app"',
                operation: "Trie.getUnsafe(trie, key)",
                result: '"application root"',
                invariant: "missing keys throw",
                implementation: "unwraps get or throws Error",
                guidance:
                    "Reserve getUnsafe for invariants already proven elsewhere.",
            }
        case "Presence":
            return {
                input: '"app" / "apples"',
                operation: "Trie.has + Trie.size + Trie.isEmpty",
                result: "true / false · count 5",
                invariant: "size counts stored entries, not internal nodes",
                implementation: "has is based on exact Option lookup",
                guidance:
                    "Use predicates when only membership or emptiness matters and the value is irrelevant.",
            }
        case "Order":
            return {
                input: "entries inserted in any order",
                operation: "keys / values / entries / toEntries",
                result: "alphabetical key order",
                invariant: "iteration order is key order, not insertion order",
                implementation:
                    "Trie iterator walks the prefix tree in lexical order",
                guidance:
                    "Rely on the documented sorted iteration when deterministic output matters.",
            }
    }
}

export const prefix_snapshot = (model: Model): Snapshot => {
    switch (model.prefixCase) {
        case "Keys":
            return {
                input: 'prefix "app"',
                operation: "keysWithPrefix / valuesWithPrefix",
                result: "app, apple, application, apply",
                invariant: "the exact prefix key is included when stored",
                implementation: "lazy IterableIterator over matching entries",
                guidance:
                    "Use lazy prefix iterators for autocomplete or command completion without materializing arrays.",
            }
        case "Entries":
            return {
                input: 'prefix "app"',
                operation: "entriesWithPrefix / toEntriesWithPrefix",
                result: "ordered [key, value] matches",
                invariant:
                    "only stored keys starting with the prefix are returned",
                implementation: "array helper materializes the lazy iterator",
                guidance:
                    "Use toEntriesWithPrefix at UI/API boundaries that need an eager list.",
            }
        case "Longest":
            return {
                input: 'query "application/json"',
                operation: "Trie.longestPrefixOf(...) ",
                result: '["application", "software"]',
                invariant: "returns at most one best stored prefix",
                implementation:
                    "remembers the deepest value-bearing node encountered",
                guidance:
                    "This is useful for route tables, namespace dispatch, and longest-command-prefix matching.",
            }
        case "Direction":
            return {
                input: "stored keys: app, apple, application",
                operation: "prefix enumeration vs longestPrefixOf",
                result: "many descendants vs one ancestor",
                invariant:
                    "the two APIs traverse opposite prefix relationships",
                implementation: "startsWith filtering vs deepest matched node",
                guidance:
                    "Choose based on which side of the prefix relation is the query: a short prefix or a longer candidate string.",
            }
    }
}

export const transform_snapshot = (model: Model): Snapshot => {
    switch (model.transformCase) {
        case "Map":
            return {
                input: "Trie<string>",
                operation: "Trie.map(value, key => ...)",
                result: "Trie<new value type>",
                invariant: "keys are preserved",
                implementation: "rebuilds a trie from transformed entries",
                guidance:
                    "Map when the key index is right but the stored representation must change.",
            }
        case "Filter":
            return {
                input: "all route entries",
                operation: 'Trie.filter((_, key) => key.startsWith("app"))',
                result: "only app-prefixed entries",
                invariant: "matching keys retain their values",
                implementation: "rebuilds from entries whose predicate passes",
                guidance:
                    "Filter can also narrow a union value type through a refinement predicate.",
            }
        case "FilterMap":
            return {
                input: "entry value + key",
                operation: "Trie.filterMap(... => Result)",
                result: "successes transformed; failures dropped",
                invariant:
                    "Result failure is selection, not a returned error channel",
                implementation: "Result.isSuccess controls reinsertion",
                guidance:
                    "Use filterMap when validation/selection naturally produces Result rather than boolean.",
            }
        case "Reduce":
            return {
                input: "ordered entries",
                operation: "reduce / forEach / compact",
                result: "summary, side effect, or compacted trie",
                invariant: "traversal follows alphabetical key order",
                implementation: "reduce powers map/filter/compact internally",
                guidance:
                    "Use reduce for deterministic summaries and compact for Trie<Option<A>> cleanup.",
            }
    }
}

export const initial_model: Model = {
    stage: "Build",
    buildCase: "Make",
    lookupCase: "Exact",
    prefixCase: "Entries",
    transformCase: "Map",
}

// -----------------------------------------------------------------------------
// MESSAGES + UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedTrieStage: { stage: Stage },
    SelectedTrieBuildCase: { buildCase: BuildCase },
    SelectedTrieLookupCase: { lookupCase: LookupCase },
    SelectedTriePrefixCase: { prefixCase: PrefixCase },
    SelectedTrieTransformCase: { transformCase: TransformCase },
})
export type Message = typeof Message.Type

type StagePayload = Readonly<{ stage: Stage }>
type BuildCasePayload = Readonly<{ buildCase: BuildCase }>
type LookupCasePayload = Readonly<{ lookupCase: LookupCase }>
type PrefixCasePayload = Readonly<{ prefixCase: PrefixCase }>
type TransformCasePayload = Readonly<{ transformCase: TransformCase }>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedTrieStage: ({ stage }: StagePayload) => ({
            model: evo(model, { stage: () => stage }),
        }),
        SelectedTrieBuildCase: ({ buildCase }: BuildCasePayload) => ({
            model: evo(model, { buildCase: () => buildCase }),
        }),
        SelectedTrieLookupCase: ({ lookupCase }: LookupCasePayload) => ({
            model: evo(model, { lookupCase: () => lookupCase }),
        }),
        SelectedTriePrefixCase: ({ prefixCase }: PrefixCasePayload) => ({
            model: evo(model, { prefixCase: () => prefixCase }),
        }),
        SelectedTrieTransformCase: ({
            transformCase,
        }: TransformCasePayload) => ({
            model: evo(model, { transformCase: () => transformCase }),
        }),
    })
