import {
    Cache,
    Deferred,
    Effect,
    Exit,
    Fiber,
    Match as M,
    Schema as S,
} from "effect"
import type { Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 Cache examples
// -----------------------------------------------------------------------------

export const basic_cache = Effect.gen(function* () {
    let lookupCount = 0

    const cache = yield* Cache.make<string, string>({
        capacity: 3,
        timeToLive: "30 seconds",
        lookup: (key) =>
            Effect.sync(() => {
                lookupCount += 1
                return `${key}:v${lookupCount}`
            }),
    })

    const first = yield* Cache.get(cache, "ada")
    const second = yield* Cache.get(cache, "ada")
    const size = yield* Cache.size(cache)

    return {
        first,
        second,
        size,
        lookupCount,
    }
})

// Concurrent gets for one missing key share the same in-flight lookup.
export const shared_in_flight_lookup = Effect.gen(function* () {
    let lookupCount = 0
    const gate = yield* Deferred.make<void>()

    const cache = yield* Cache.make<string, number>({
        capacity: 10,
        lookup: (key) =>
            Effect.gen(function* () {
                lookupCount += 1
                yield* Deferred.await(gate)
                return key.length
            }),
    })

    const fiber = yield* Effect.forkChild(
        Effect.all(
            [
                Cache.get(cache, "hello"),
                Cache.get(cache, "hello"),
                Cache.get(cache, "hello"),
            ],
            { concurrency: "unbounded" }
        )
    )

    yield* Effect.yieldNow
    yield* Deferred.succeed(gate, undefined)

    const values = yield* Fiber.join(fiber)

    return {
        values,
        lookupCount,
    }
})

// makeWith can compute TTL from the lookup Exit and key.
export const dynamic_ttl_cache = Cache.makeWith(
    (key: string) =>
        Effect.succeed({
            key,
            active: key.startsWith("active:"),
        }),
    {
        capacity: 100,
        timeToLive(exit) {
            return Exit.isSuccess(exit) && exit.value.active
                ? "1 minute"
                : "5 seconds"
        },
    }
)

// Read / control APIs.
export const cache_controls = Effect.gen(function* () {
    let lookupCount = 0

    const cache = yield* Cache.make<string, string>({
        capacity: 10,
        lookup: (key) =>
            Effect.sync(() => {
                lookupCount += 1
                return `${key}:lookup-${lookupCount}`
            }),
    })

    // Missing read: does not call lookup.
    const before = yield* Cache.getOption(cache, "user")

    // get populates the key.
    const loaded = yield* Cache.get(cache, "user")

    // Already-resolved successful read.
    const success = yield* Cache.getSuccess(cache, "user")

    // set bypasses lookup.
    yield* Cache.set(cache, "user", "user:manual")

    // refresh always invokes lookup and replaces the entry on success.
    const refreshed = yield* Cache.refresh(cache, "user")

    // Invalidate removes it.
    yield* Cache.invalidate(cache, "user")

    const after = yield* Cache.getOption(cache, "user")

    return {
        before,
        loaded,
        success,
        refreshed,
        after,
        lookupCount,
    }
})

// Capacity is access-sensitive: get moves a live entry to the back of the
// insertion-ordered cache map, so adding beyond capacity evicts older entries.
export const capacity_example = Effect.gen(function* () {
    const cache = yield* Cache.make<string, number>({
        capacity: 3,
        lookup: (key) => Effect.succeed(key.length),
    })

    yield* Cache.set(cache, "a", 1)
    yield* Cache.set(cache, "b", 2)
    yield* Cache.set(cache, "c", 3)

    // Touch b: a, c, b is now the freshness order.
    yield* Cache.get(cache, "b")

    // d pushes the cache over capacity, so the oldest key a is evicted.
    yield* Cache.set(cache, "d", 4)

    const keys = yield* Cache.keys(cache)

    return Array.from(keys)
})

// -----------------------------------------------------------------------------
// Visual teaching model
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Lookup"),
    S.Literal("TTL"),
    S.Literal("Capacity"),
    S.Literal("Control"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Lookup",
    "TTL",
    "Capacity",
    "Control",
]

export const LookupKey = S.Union([S.Literal("ada"), S.Literal("grace")])
export type LookupKey = typeof LookupKey.Type

export const Model = S.Struct({
    stage: Stage,

    lookup_key: LookupKey,
    lookup_ada_cached: S.Boolean,
    lookup_grace_cached: S.Boolean,
    lookup_count: S.Number,
    lookup_log: S.Array(S.String),

    ttl_now: S.Number,
    ttl_cached: S.Boolean,
    ttl_expires_at: S.Number,
    ttl_version: S.Number,
    ttl_lookup_count: S.Number,

    capacity_keys: S.Array(S.String),
    capacity_log: S.Array(S.String),

    control_cached: S.Boolean,
    control_value: S.String,
    control_version: S.Number,
    control_lookup_count: S.Number,
    control_log: S.Array(S.String),
})
export type Model = typeof Model.Type

export const SelectedCacheStage = taggedStruct("SelectedCacheStage", {
    stage: Stage,
})

export const SelectedCacheLookupKey = taggedStruct("SelectedCacheLookupKey", {
    lookup_key: LookupKey,
})
export const ClickedCacheGet = taggedStruct("ClickedCacheGet")
export const ClickedCacheConcurrentGet = taggedStruct(
    "ClickedCacheConcurrentGet"
)
export const ClickedResetCacheLookup = taggedStruct("ClickedResetCacheLookup")

export const ClickedCacheTTLGet = taggedStruct("ClickedCacheTTLGet")
export const ClickedAdvanceCacheTTL20 = taggedStruct("ClickedAdvanceCacheTTL20")
export const ClickedAdvanceCacheTTL15 = taggedStruct("ClickedAdvanceCacheTTL15")
export const ClickedResetCacheTTL = taggedStruct("ClickedResetCacheTTL")

export const ClickedFillCacheCapacity = taggedStruct("ClickedFillCacheCapacity")
export const ClickedTouchCacheB = taggedStruct("ClickedTouchCacheB")
export const ClickedAddCacheD = taggedStruct("ClickedAddCacheD")
export const ClickedResetCacheCapacity = taggedStruct(
    "ClickedResetCacheCapacity"
)

export const ClickedCacheGetOption = taggedStruct("ClickedCacheGetOption")
export const ClickedCacheGetSuccess = taggedStruct("ClickedCacheGetSuccess")
export const ClickedControlCacheGet = taggedStruct("ClickedControlCacheGet")
export const ClickedCacheSet = taggedStruct("ClickedCacheSet")
export const ClickedCacheRefresh = taggedStruct("ClickedCacheRefresh")
export const ClickedCacheInvalidate = taggedStruct("ClickedCacheInvalidate")
export const ClickedResetCacheControl = taggedStruct("ClickedResetCacheControl")

export const Message = S.Union([
    SelectedCacheStage,

    SelectedCacheLookupKey,
    ClickedCacheGet,
    ClickedCacheConcurrentGet,
    ClickedResetCacheLookup,

    ClickedCacheTTLGet,
    ClickedAdvanceCacheTTL20,
    ClickedAdvanceCacheTTL15,
    ClickedResetCacheTTL,

    ClickedFillCacheCapacity,
    ClickedTouchCacheB,
    ClickedAddCacheD,
    ClickedResetCacheCapacity,

    ClickedCacheGetOption,
    ClickedCacheGetSuccess,
    ClickedControlCacheGet,
    ClickedCacheSet,
    ClickedCacheRefresh,
    ClickedCacheInvalidate,
    ClickedResetCacheControl,
])
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Lookup",

    lookup_key: "ada",
    lookup_ada_cached: false,
    lookup_grace_cached: false,
    lookup_count: 0,
    lookup_log: [],

    ttl_now: 0,
    ttl_cached: false,
    ttl_expires_at: 0,
    ttl_version: 0,
    ttl_lookup_count: 0,

    capacity_keys: [],
    capacity_log: [],

    control_cached: false,
    control_value: "",
    control_version: 0,
    control_lookup_count: 0,
    control_log: [],
})

type UpdateReturn = Update.Return<Model, Message>

const lookup_is_cached = (model: Model, key: LookupKey): boolean =>
    key === "ada" ? model.lookup_ada_cached : model.lookup_grace_cached

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedCacheStage: ({ stage }) => ({
                model: modifyFields(model, {
                    stage: () => stage,
                }),
                commands: [],
            }),

            SelectedCacheLookupKey: ({ lookup_key }) => ({
                model: modifyFields(model, {
                    lookup_key: () => lookup_key,
                }),
                commands: [],
            }),

            ClickedCacheGet: () => {
                const key = model.lookup_key
                const cached = lookup_is_cached(model, key)

                return {
                    model: modifyFields(model, {
                        lookup_ada_cached: (value) =>
                            key === "ada" ? true : value,
                        lookup_grace_cached: (value) =>
                            key === "grace" ? true : value,
                        lookup_count: (count) => (cached ? count : count + 1),
                        lookup_log: (log) => [
                            ...log,
                            cached
                                ? `get(${key}) → HIT`
                                : `get(${key}) → MISS → lookup`,
                        ],
                    }),
                    commands: [],
                }
            },

            ClickedCacheConcurrentGet: () => {
                const key = model.lookup_key
                const cached = lookup_is_cached(model, key)

                return {
                    model: modifyFields(model, {
                        lookup_ada_cached: (value) =>
                            key === "ada" ? true : value,
                        lookup_grace_cached: (value) =>
                            key === "grace" ? true : value,
                        lookup_count: (count) => (cached ? count : count + 1),
                        lookup_log: (log) => [
                            ...log,
                            cached
                                ? `3 × get(${key}) → 3 HITS`
                                : `3 × concurrent get(${key}) → 1 shared lookup`,
                        ],
                    }),
                    commands: [],
                }
            },

            ClickedResetCacheLookup: () => ({
                model: modifyFields(model, {
                    lookup_ada_cached: () => false,
                    lookup_grace_cached: () => false,
                    lookup_count: () => 0,
                    lookup_log: () => [],
                }),
                commands: [],
            }),

            ClickedCacheTTLGet: () => {
                const valid =
                    model.ttl_cached && model.ttl_now < model.ttl_expires_at

                if (valid) {
                    return { model, commands: [] }
                }

                return {
                    model: modifyFields(model, {
                        ttl_cached: () => true,
                        ttl_expires_at: () => model.ttl_now + 30,
                        ttl_version: (version) => version + 1,
                        ttl_lookup_count: (count) => count + 1,
                    }),
                    commands: [],
                }
            },

            ClickedAdvanceCacheTTL20: () => ({
                model: modifyFields(model, {
                    ttl_now: (now) => now + 20,
                }),
                commands: [],
            }),

            ClickedAdvanceCacheTTL15: () => ({
                model: modifyFields(model, {
                    ttl_now: (now) => now + 15,
                }),
                commands: [],
            }),

            ClickedResetCacheTTL: () => ({
                model: modifyFields(model, {
                    ttl_now: () => 0,
                    ttl_cached: () => false,
                    ttl_expires_at: () => 0,
                    ttl_version: () => 0,
                    ttl_lookup_count: () => 0,
                }),
                commands: [],
            }),

            ClickedFillCacheCapacity: () => ({
                model: modifyFields(model, {
                    capacity_keys: () => ["a", "b", "c"],
                    capacity_log: () => [
                        "set a → [a]",
                        "set b → [a, b]",
                        "set c → [a, b, c]",
                    ],
                }),
                commands: [],
            }),

            ClickedTouchCacheB: () => {
                if (!model.capacity_keys.includes("b")) {
                    return { model, commands: [] }
                }

                return {
                    model: modifyFields(model, {
                        capacity_keys: (keys) => [
                            ...keys.filter((key) => key !== "b"),
                            "b",
                        ],
                        capacity_log: (log) => [
                            ...log,
                            "get b → move b to freshest position",
                        ],
                    }),
                    commands: [],
                }
            },

            ClickedAddCacheD: () => {
                if (model.capacity_keys.includes("d")) {
                    return { model, commands: [] }
                }

                const appended = [...model.capacity_keys, "d"]
                const evicted = appended.length > 3 ? appended[0] : undefined
                const next = appended.length > 3 ? appended.slice(1) : appended

                return {
                    model: modifyFields(model, {
                        capacity_keys: () => next,
                        capacity_log: (log) => [
                            ...log,
                            evicted === undefined
                                ? "set d"
                                : `set d → capacity 3 → evict oldest ${evicted}`,
                        ],
                    }),
                    commands: [],
                }
            },

            ClickedResetCacheCapacity: () => ({
                model: modifyFields(model, {
                    capacity_keys: () => [],
                    capacity_log: () => [],
                }),
                commands: [],
            }),

            ClickedCacheGetOption: () => ({
                model: modifyFields(model, {
                    control_log: (log) => [
                        ...log,
                        model.control_cached
                            ? `getOption(user) → Some(${model.control_value})`
                            : "getOption(user) → None · no lookup",
                    ],
                }),
                commands: [],
            }),

            ClickedCacheGetSuccess: () => ({
                model: modifyFields(model, {
                    control_log: (log) => [
                        ...log,
                        model.control_cached
                            ? `getSuccess(user) → Some(${model.control_value})`
                            : "getSuccess(user) → None",
                    ],
                }),
                commands: [],
            }),

            ClickedControlCacheGet: () => {
                if (model.control_cached) {
                    return {
                        model: modifyFields(model, {
                            control_log: (log) => [
                                ...log,
                                `get(user) → HIT ${model.control_value}`,
                            ],
                        }),
                        commands: [],
                    }
                }

                const version = model.control_version + 1

                return {
                    model: modifyFields(model, {
                        control_cached: () => true,
                        control_version: () => version,
                        control_lookup_count: (count) => count + 1,
                        control_value: () => `user:lookup-${version}`,
                        control_log: (log) => [
                            ...log,
                            `get(user) → MISS → lookup-${version}`,
                        ],
                    }),
                    commands: [],
                }
            },

            ClickedCacheSet: () => ({
                model: modifyFields(model, {
                    control_cached: () => true,
                    control_value: () => "user:manual",
                    control_log: (log) => [
                        ...log,
                        "set(user, manual) → overwrite without lookup",
                    ],
                }),
                commands: [],
            }),

            ClickedCacheRefresh: () => {
                const version = model.control_version + 1

                return {
                    model: modifyFields(model, {
                        control_cached: () => true,
                        control_version: () => version,
                        control_lookup_count: (count) => count + 1,
                        control_value: () => `user:lookup-${version}`,
                        control_log: (log) => [
                            ...log,
                            `refresh(user) → force lookup-${version}`,
                        ],
                    }),
                    commands: [],
                }
            },

            ClickedCacheInvalidate: () => ({
                model: modifyFields(model, {
                    control_cached: () => false,
                    control_value: () => "",
                    control_log: (log) => [
                        ...log,
                        "invalidate(user) → remove entry",
                    ],
                }),
                commands: [],
            }),

            ClickedResetCacheControl: () => ({
                model: modifyFields(model, {
                    control_cached: () => false,
                    control_value: () => "",
                    control_version: () => 0,
                    control_lookup_count: () => 0,
                    control_log: () => [],
                }),
                commands: [],
            }),
        })
    )

export const ttl_is_valid = (model: Model): boolean =>
    model.ttl_cached && model.ttl_now < model.ttl_expires_at

export const ttl_status = (model: Model): string => {
    if (!model.ttl_cached) {
        return "empty"
    }
    if (ttl_is_valid(model)) {
        return `valid · ${model.ttl_expires_at - model.ttl_now}s remaining`
    }
    return `expired · ${model.ttl_now - model.ttl_expires_at}s ago`
}
