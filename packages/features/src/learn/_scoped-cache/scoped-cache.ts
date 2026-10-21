import { Effect, Option, Schema as S, ScopedCache } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL SCOPED CACHE PROGRAMS
// -----------------------------------------------------------------------------

export const reuse_program = Effect.scoped(
    Effect.gen(function* () {
        let lookups = 0

        const cache = yield* ScopedCache.make({
            capacity: 8,
            timeToLive: "1 minute",
            lookup: (key: string) =>
                Effect.sync(() => {
                    lookups += 1
                    return `${key}:value-${String(lookups)}`
                }),
        })

        const first = yield* ScopedCache.get(cache, "profile")
        const second = yield* ScopedCache.get(cache, "profile")
        const other = yield* ScopedCache.get(cache, "settings")

        return {
            first,
            second,
            other,
            lookups,
        } as const
    })
)

export const in_flight_program = Effect.scoped(
    Effect.gen(function* () {
        let lookups = 0

        const cache = yield* ScopedCache.make({
            capacity: 8,
            lookup: (key: string) =>
                Effect.gen(function* () {
                    lookups += 1
                    yield* Effect.sleep("10 millis")
                    return `${key}:${String(lookups)}`
                }),
        })

        const values = yield* Effect.all(
            [
                ScopedCache.get(cache, "same"),
                ScopedCache.get(cache, "same"),
            ] as const,
            { concurrency: "unbounded" }
        )

        return {
            values,
            lookups,
        } as const
    })
)

export const lifecycle_program = Effect.scoped(
    Effect.gen(function* () {
        const events: Array<string> = []
        let nextId = 0

        const cache = yield* ScopedCache.make({
            capacity: 2,
            timeToLive: "1 minute",
            lookup: (key: string) =>
                Effect.acquireRelease(
                    Effect.sync(() => {
                        nextId += 1
                        const value = { key, id: nextId } as const
                        events.push(`acquire:${key}:${String(value.id)}`)
                        return value
                    }),
                    (value: Readonly<{ key: string; id: number }>) =>
                        Effect.sync(() => {
                            events.push(
                                `release:${value.key}:${String(value.id)}`
                            )
                        })
                ),
        })

        const first = yield* ScopedCache.get(cache, "db")
        const refreshed = yield* ScopedCache.refresh(cache, "db")
        const current = yield* ScopedCache.get(cache, "db")

        return {
            first: first.id,
            refreshed: refreshed.id,
            current: current.id,
            events,
        } as const
    })
)

export const failed_refresh_program = Effect.scoped(
    Effect.gen(function* () {
        let attempts = 0

        const cache = yield* ScopedCache.make({
            capacity: 2,
            timeToLive: "1 minute",
            lookup: (_key: string) =>
                Effect.suspend(() => {
                    attempts += 1
                    return attempts === 1
                        ? Effect.succeed("stable-value")
                        : Effect.fail("refresh failed" as const)
                }),
        })

        const before = yield* ScopedCache.get(cache, "service")
        const refreshExit = yield* Effect.exit(
            ScopedCache.refresh(cache, "service")
        )
        const afterExit = yield* Effect.exit(ScopedCache.get(cache, "service"))

        return {
            before,
            refreshTag: refreshExit._tag,
            afterTag: afterExit._tag,
            attempts,
        } as const
    })
)

export const expiry_program = Effect.scoped(
    Effect.gen(function* () {
        let lookups = 0

        const cache = yield* ScopedCache.make({
            capacity: 4,
            timeToLive: "10 millis",
            lookup: (key: string) =>
                Effect.sync(() => {
                    lookups += 1
                    return `${key}:${String(lookups)}`
                }),
        })

        const first = yield* ScopedCache.get(cache, "token")
        yield* Effect.sleep("20 millis")
        const second = yield* ScopedCache.get(cache, "token")

        return {
            first,
            second,
            lookups,
        } as const
    })
)

export const capacity_program = Effect.scoped(
    Effect.gen(function* () {
        const cache = yield* ScopedCache.make({
            capacity: 2,
            lookup: (key: string) => Effect.succeed(key.toUpperCase()),
        })

        yield* ScopedCache.get(cache, "a")
        yield* ScopedCache.get(cache, "b")
        yield* ScopedCache.get(cache, "a")
        yield* ScopedCache.get(cache, "c")

        return {
            keys: yield* ScopedCache.keys(cache),
            entries: yield* ScopedCache.entries(cache),
            size: yield* ScopedCache.size(cache),
        } as const
    })
)

export const inspection_program = Effect.scoped(
    Effect.gen(function* () {
        const cache = yield* ScopedCache.make({
            capacity: 4,
            lookup: (key: string) => Effect.succeed(`lookup:${key}`),
        })

        const before = yield* ScopedCache.getOption(cache, "manual")
        yield* ScopedCache.set(cache, "manual", "seeded")
        const has = yield* ScopedCache.has(cache, "manual")
        const success = yield* ScopedCache.getSuccess(cache, "manual")
        const after = yield* ScopedCache.getOption(cache, "manual")

        return {
            beforeIsNone: Option.isNone(before),
            has,
            success,
            after,
        } as const
    })
)

export const invalidate_program = Effect.scoped(
    Effect.gen(function* () {
        const events: Array<string> = []

        const cache = yield* ScopedCache.make({
            capacity: 4,
            lookup: (key: string) =>
                Effect.acquireRelease(
                    Effect.succeed({ key }),
                    (value: Readonly<{ key: string }>) =>
                        Effect.sync(() => {
                            events.push(`release:${value.key}`)
                        })
                ),
        })

        yield* ScopedCache.get(cache, "socket")
        yield* ScopedCache.invalidate(cache, "socket")

        return {
            present: yield* ScopedCache.has(cache, "socket"),
            events,
        } as const
    })
)

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Acquire"),
    S.Literal("Reuse"),
    S.Literal("Refresh"),
    S.Literal("Release"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Acquire",
    "Reuse",
    "Refresh",
    "Release",
]

export const AcquireCase = S.Union([
    S.Literal("FixedTTL"),
    S.Literal("DynamicTTL"),
    S.Literal("Services"),
    S.Literal("Boundary"),
])
export type AcquireCase = typeof AcquireCase.Type

export const acquire_cases: ReadonlyArray<AcquireCase> = [
    "FixedTTL",
    "DynamicTTL",
    "Services",
    "Boundary",
]

export const ReuseCase = S.Union([
    S.Literal("Hit"),
    S.Literal("InFlight"),
    S.Literal("Peek"),
    S.Literal("Failure"),
])
export type ReuseCase = typeof ReuseCase.Type

export const reuse_cases: ReadonlyArray<ReuseCase> = [
    "Hit",
    "InFlight",
    "Peek",
    "Failure",
]

export const RefreshCase = S.Union([
    S.Literal("Replace"),
    S.Literal("Failure"),
    S.Literal("Set"),
    S.Literal("Expiry"),
])
export type RefreshCase = typeof RefreshCase.Type

export const refresh_cases: ReadonlyArray<RefreshCase> = [
    "Replace",
    "Failure",
    "Set",
    "Expiry",
]

export const ReleaseCase = S.Union([
    S.Literal("Invalidate"),
    S.Literal("Capacity"),
    S.Literal("Inspect"),
    S.Literal("OuterScope"),
])
export type ReleaseCase = typeof ReleaseCase.Type

export const release_cases: ReadonlyArray<ReleaseCase> = [
    "Invalidate",
    "Capacity",
    "Inspect",
    "OuterScope",
]

export const Model = S.Struct({
    stage: Stage,
    acquireCase: AcquireCase,
    reuseCase: ReuseCase,
    refreshCase: RefreshCase,
    releaseCase: ReleaseCase,
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
    Acquire: {
        eyebrow: "each cache entry owns the Scope used by its lookup",
        title: "Create the cache in an outer Scope",
        description:
            "ScopedCache.make creates a capacity-bounded cache with one TTL for every exit. makeWith computes TTL per key or lookup exit. Each miss gets a dedicated entry Scope, so resources acquired by lookup stay alive only while that entry remains cached.",
        code: `const cache =
    yield* ScopedCache.make({
        capacity: 32,
        timeToLive: "5 minutes",
        lookup: (key: string) =>
            openScopedResource(key)
    })

const value =
    yield* ScopedCache.get(
        cache,
        "account:42"
    )`,
        apis: [
            "ScopedCache.make",
            "ScopedCache.makeWith",
            "Scope.Scope",
            "requireServicesAt",
        ],
        notice: "The cache itself must live in a Scope, and each cached lookup gets another Scope beneath it. Keep the live cache on the runtime/service side of a Foldkit feature; store only plain UI-visible data in the pure Model.",
    },

    Reuse: {
        eyebrow:
            "one key maps to one shared deferred exit until expiry or replacement",
        title: "Reuse hits and coalesce concurrent misses",
        description:
            "get reuses an unexpired entry and moves it to the end of access order. Concurrent callers for the same missing key await the same Deferred, so only one lookup runs. Both successful and failed lookup exits can be cached according to TTL.",
        code: `const [a, b] =
    yield* Effect.all(
        [
            ScopedCache.get(cache, key),
            ScopedCache.get(cache, key)
        ],
        { concurrency: "unbounded" }
    )

// one missing key
// one lookup
// two waiters`,
        apis: [
            "ScopedCache.get",
            "ScopedCache.getOption",
            "ScopedCache.getSuccess",
            "ScopedCache.has",
            "Deferred",
        ],
        notice: "getOption never starts a missing lookup but will await an existing cached entry. getSuccess is even more observational: it only returns an already-completed successful value and reports None for pending or failed entries.",
    },

    Refresh: {
        eyebrow: "refresh always runs lookup again and installs its new exit",
        title: "Replace entries deliberately, including failure results",
        description:
            "refresh bypasses a valid cached value and always invokes lookup. The replacement gets its own Scope; once the new exit is installed, the previous entry Scope is closed. Unlike Resource.refresh, a failed ScopedCache refresh can replace a previously successful entry with a cached failure.",
        code: `const before =
    yield* ScopedCache.get(
        cache,
        key
    )

const refreshed =
    yield* Effect.exit(
        ScopedCache.refresh(
            cache,
            key
        )
    )

// refreshed failure is now
// the cached exit for key`,
        apis: [
            "ScopedCache.refresh",
            "ScopedCache.set",
            "ScopedCache.get",
            "timeToLive",
        ],
        notice: "Use refresh when replacing the current cached result is intentional. If stale-on-error behavior is required, model that policy above ScopedCache instead of assuming refresh preserves the previous success.",
    },

    Release: {
        eyebrow:
            "removing an entry means closing the resources owned by its Scope",
        title: "Release on invalidation, expiry, eviction, or cache shutdown",
        description:
            "invalidate and invalidateAll close entry scopes explicitly. Expired entries are closed when APIs encounter and remove them. Capacity eviction removes the oldest access-order entries, while closing the cache's outer Scope closes every remaining entry.",
        code: `yield* ScopedCache.invalidate(
    cache,
    key
)

const active =
    yield* ScopedCache.keys(cache)

// capacity eviction, expiry,
// invalidateAll, and outer
// Scope closure also finalize entries`,
        apis: [
            "ScopedCache.invalidate",
            "ScopedCache.invalidateWhen",
            "ScopedCache.invalidateAll",
            "ScopedCache.keys",
            "ScopedCache.entries",
            "ScopedCache.size",
        ],
        notice: "size is intentionally approximate: expired entries remain counted until another operation removes them. keys, values, and entries filter expired entries and close their scopes while doing so.",
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

export const acquire_snapshot = (model: Model): Snapshot => {
    switch (model.acquireCase) {
        case "FixedTTL":
            return {
                input: "lookup + capacity 32 + TTL 5 minutes",
                operation: "ScopedCache.make(options)",
                result: "ScopedCache<Key, A, E>",
                invariant: "cache construction requires an outer Scope",
                implementation:
                    "every lookup result is owned by a per-entry Scope",
                guidance:
                    "Use make when all success and failure exits should share one lifetime.",
            }

        case "DynamicTTL":
            return {
                input: "(exit, key) => TTL",
                operation: "ScopedCache.makeWith(options)",
                result: "per-result / per-key expiry",
                invariant: "TTL is calculated after lookup completes",
                implementation: "timeToLive receives the Exit and key",
                guidance:
                    "Use makeWith when failures, hot keys, or different resources need different lifetimes.",
            }

        case "Services":
            return {
                input: 'requireServicesAt: "construction" | "lookup"',
                operation: "choose where lookup dependencies are required",
                result: "captured Context or lookup-time R",
                invariant: "Scope ownership remains required either way",
                implementation:
                    "default behavior captures construction Context",
                guidance:
                    'Use "lookup" when each caller should provide current services; otherwise capture them when building the cache.',
            }

        case "Boundary":
            return {
                input: "ScopedCache object + Foldkit Model",
                operation: "runtime owns cache; UI stores plain snapshots",
                result: "resource-safe runtime + serializable feature state",
                invariant: "a live cache is not application model data",
                implementation:
                    "service/command layer performs cache operations",
                guidance:
                    "Keep ScopedCache out of Schema-backed Foldkit Model values and expose only the state the view needs.",
            }
    }
}

export const reuse_snapshot = (model: Model): Snapshot => {
    switch (model.reuseCase) {
        case "Hit":
            return {
                input: "unexpired key already cached",
                operation: "ScopedCache.get(cache, key)",
                result: "reuse cached Exit",
                invariant: "lookup does not run again on a hit",
                implementation: "entry moves to the end of access order",
                guidance:
                    "Repeated reads extend LRU freshness through access order, not TTL duration.",
            }

        case "InFlight":
            return {
                input: "two concurrent misses for the same key",
                operation: "both call get",
                result: "one lookup · two waiters",
                invariant: "same-key misses share one Deferred",
                implementation: "entry is inserted before lookup completes",
                guidance:
                    "Rely on the cache for same-key request coalescing rather than adding a second deduplication layer.",
            }

        case "Peek":
            return {
                input: "key may or may not be cached",
                operation: "getOption / getSuccess / has",
                result: "observe without starting a miss lookup",
                invariant: "inspection APIs do not compute absent entries",
                implementation:
                    "getSuccess also refuses pending and failed entries",
                guidance:
                    "Choose getOption when waiting for an existing in-flight result is okay; choose getSuccess for a non-awaiting success peek.",
            }

        case "Failure":
            return {
                input: "lookup returns Exit.fail(error)",
                operation: "get caches deferred failure by TTL",
                result: "later get fails with cached error",
                invariant: "failure exits participate in caching",
                implementation:
                    "TTL receives Exit<A, E>, not only successful A",
                guidance:
                    "Choose failure TTL deliberately so transient errors do not remain cached longer than intended.",
            }
    }
}

export const refresh_snapshot = (model: Model): Snapshot => {
    switch (model.refreshCase) {
        case "Replace":
            return {
                input: "working cached value",
                operation: "ScopedCache.refresh(cache, key)",
                result: "new lookup Exit becomes current",
                invariant: "refresh always invokes lookup",
                implementation:
                    "replacement gets a new entry Scope; old Scope closes",
                guidance:
                    "Use refresh when callers explicitly want a replacement now rather than normal cache reuse.",
            }

        case "Failure":
            return {
                input: "success cached · refresh lookup fails",
                operation: "Effect.exit(ScopedCache.refresh(...))",
                result: "Failure · subsequent get sees cached failure",
                invariant:
                    "refresh overwrites with the new exit even when it fails",
                implementation:
                    "Deferred is completed with refresh Exit before replacement",
                guidance:
                    "If last-known-good behavior is required, keep that value separately or wrap refresh in a higher-level policy.",
            }

        case "Set":
            return {
                input: 'key + already available value "seeded"',
                operation: "ScopedCache.set(cache, key, value)",
                result: "successful entry without running lookup",
                invariant: "existing entry Scope is closed when overwritten",
                implementation: "TTL is computed from Exit.succeed(value)",
                guidance:
                    "Use set for priming or synchronizing a successful value that is already available elsewhere.",
            }

        case "Expiry":
            return {
                input: "entry whose expiresAt <= now",
                operation: "get / has / keys encounters it",
                result: "remove + close old Scope; get may reacquire",
                invariant: "expiry is lazy rather than a timer per entry",
                implementation: "operations compare expiresAt with ClockRef",
                guidance:
                    "TTL marks validity; cleanup occurs when cache operations encounter expired entries or the outer Scope closes.",
            }
    }
}

export const release_snapshot = (model: Model): Snapshot => {
    switch (model.releaseCase) {
        case "Invalidate":
            return {
                input: "cached scoped resource",
                operation: "invalidate(cache, key)",
                result: "entry removed · finalizer runs",
                invariant: "invalidation is also resource release",
                implementation: "Scope.close(entry.scope, exitVoid)",
                guidance:
                    "Invalidate as soon as a cached resource is known to be unusable or stale beyond policy.",
            }

        case "Capacity":
            return {
                input: "capacity 2 · access a,b,a,c",
                operation: "insert c after a was recently read",
                result: "b evicted · a,c remain",
                invariant: "capacity eviction follows access order",
                implementation:
                    "hits remove + reinsert entries to refresh ordering",
                guidance:
                    "Treat capacity as a resource budget: eviction immediately closes scopes owned by displaced entries.",
            }

        case "Inspect":
            return {
                input: "open cache with success, failure, expired entries",
                operation: "entries / values / keys / size",
                result: "different observational views",
                invariant:
                    "entries and values expose only successful active results",
                implementation:
                    "size may still include expired entries until cleanup occurs",
                guidance:
                    "Use keys/entries for active-state inspection; do not treat size as an exact count of currently valid values.",
            }

        case "OuterScope":
            return {
                input: "ScopedCache with remaining entries",
                operation: "owning Scope closes",
                result: 'state = "Closed" + all entry scopes finalized',
                invariant: "cached resources cannot outlive cache ownership",
                implementation:
                    "constructor registers an outer-scope finalizer",
                guidance:
                    "Place cache creation in the Scope that should own every resource cached beneath it.",
            }
    }
}

// -----------------------------------------------------------------------------
// MESSAGE / UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedScopedCacheStage: {
        stage: Stage,
    },
    SelectedScopedCacheAcquireCase: {
        acquireCase: AcquireCase,
    },
    SelectedScopedCacheReuseCase: {
        reuseCase: ReuseCase,
    },
    SelectedScopedCacheRefreshCase: {
        refreshCase: RefreshCase,
    },
    SelectedScopedCacheReleaseCase: {
        releaseCase: ReleaseCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Acquire",
    acquireCase: "FixedTTL",
    reuseCase: "InFlight",
    refreshCase: "Failure",
    releaseCase: "Capacity",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type AcquireCasePayload = Readonly<{
    acquireCase: AcquireCase
}>

type ReuseCasePayload = Readonly<{
    reuseCase: ReuseCase
}>

type RefreshCasePayload = Readonly<{
    refreshCase: RefreshCase
}>

type ReleaseCasePayload = Readonly<{
    releaseCase: ReleaseCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedScopedCacheStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedScopedCacheAcquireCase: ({
            acquireCase,
        }: AcquireCasePayload) => ({
            model: evo(model, {
                acquireCase: () => acquireCase,
            }),
        }),

        SelectedScopedCacheReuseCase: ({ reuseCase }: ReuseCasePayload) => ({
            model: evo(model, {
                reuseCase: () => reuseCase,
            }),
        }),

        SelectedScopedCacheRefreshCase: ({
            refreshCase,
        }: RefreshCasePayload) => ({
            model: evo(model, {
                refreshCase: () => refreshCase,
            }),
        }),

        SelectedScopedCacheReleaseCase: ({
            releaseCase,
        }: ReleaseCasePayload) => ({
            model: evo(model, {
                releaseCase: () => releaseCase,
            }),
        }),
    })
