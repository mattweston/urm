import { Effect, Exit, Request, RequestResolver, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL REQUEST RESOLVER PROGRAMS
// -----------------------------------------------------------------------------

export type LookupError = "NotFound" | "Offline"

export interface GetUser extends Request.Request<string, LookupError> {
    readonly _tag: "GetUser"
    readonly id: number
    readonly region: "eu" | "us"
}

export const GetUser = Request.tagged<GetUser>("GetUser")

export interface GetPost extends Request.Request<string, LookupError> {
    readonly _tag: "GetPost"
    readonly id: number
}

export const GetPost = Request.tagged<GetPost>("GetPost")

export type LookupRequest = GetUser | GetPost

export const function_resolver = RequestResolver.fromFunction<GetUser>(
    (entry: Request.Entry<GetUser>): string => `user:${entry.request.id}`
)

export const batched_resolver = RequestResolver.fromFunctionBatched<GetUser>(
    (
        entries: readonly [
            Request.Entry<GetUser>,
            ...Array<Request.Entry<GetUser>>,
        ]
    ): Iterable<string> =>
        entries.map(
            (entry: Request.Entry<GetUser>): string =>
                `user:${entry.request.id}`
        )
)

export const effect_resolver = RequestResolver.fromEffect<GetUser>(
    (entry: Request.Entry<GetUser>): Effect.Effect<string, LookupError> =>
        entry.request.id > 0
            ? Effect.succeed(`user:${entry.request.id}`)
            : Effect.fail("NotFound")
)

export const tagged_resolver =
    RequestResolver.fromEffectTagged<LookupRequest>()({
        GetUser: (
            entries: Array<Request.Entry<GetUser>>
        ): Effect.Effect<Iterable<string>, LookupError> =>
            Effect.succeed(
                entries.map(
                    (entry: Request.Entry<GetUser>): string =>
                        `user:${entry.request.id}`
                )
            ),
        GetPost: (
            entries: Array<Request.Entry<GetPost>>
        ): Effect.Effect<Iterable<string>, LookupError> =>
            Effect.succeed(
                entries.map(
                    (entry: Request.Entry<GetPost>): string =>
                        `post:${entry.request.id}`
                )
            ),
    })

export const manual_resolver = RequestResolver.make<GetUser>(
    (
        entries: readonly [
            Request.Entry<GetUser>,
            ...Array<Request.Entry<GetUser>>,
        ]
    ): Effect.Effect<void, LookupError> =>
        Effect.sync(() => {
            for (const entry of entries) {
                entry.completeUnsafe(Exit.succeed(`user:${entry.request.id}`))
            }
        })
)

export const grouped_constructor_resolver = RequestResolver.makeGrouped<
    GetUser,
    GetUser["region"]
>({
    key: (entry: Request.Entry<GetUser>): GetUser["region"] =>
        entry.request.region,
    resolver: (
        entries: readonly [
            Request.Entry<GetUser>,
            ...Array<Request.Entry<GetUser>>,
        ],
        region: GetUser["region"]
    ): Effect.Effect<void, LookupError> =>
        Effect.sync(() => {
            for (const entry of entries) {
                entry.completeUnsafe(
                    Exit.succeed(`${region}:user:${entry.request.id}`)
                )
            }
        }),
})

export const custom_resolver = RequestResolver.makeWith<GetUser>({
    batchKey: (entry: Request.Entry<GetUser>): GetUser["region"] =>
        entry.request.region,
    preCheck: (_entry: Request.Entry<GetUser>): boolean => true,
    delay: Effect.yieldNow,
    collectWhile: (entries: ReadonlySet<Request.Entry<GetUser>>): boolean =>
        entries.size < 8,
    runAll: (
        entries: readonly [
            Request.Entry<GetUser>,
            ...Array<Request.Entry<GetUser>>,
        ],
        key: unknown
    ): Effect.Effect<void, LookupError> =>
        Effect.sync(() => {
            for (const entry of entries) {
                entry.completeUnsafe(
                    Exit.succeed(`${String(key)}:user:${entry.request.id}`)
                )
            }
        }),
})

export const never_resolver = RequestResolver.never

export const limited_resolver = RequestResolver.batchN(manual_resolver, 3)

export const grouped_resolver = RequestResolver.grouped(
    manual_resolver,
    (entry: Request.Entry<GetUser>): GetUser["region"] => entry.request.region
)

export const delayed_resolver = RequestResolver.setDelay(
    manual_resolver,
    "25 millis"
)

export const effect_delayed_resolver = RequestResolver.setDelayEffect(
    manual_resolver,
    Effect.yieldNow
)

export const around_resolver = RequestResolver.around(
    manual_resolver,
    (
        entries: readonly [
            Request.Entry<GetUser>,
            ...Array<Request.Entry<GetUser>>,
        ]
    ): Effect.Effect<number, LookupError> => Effect.succeed(entries.length),
    (
        _entries: readonly [
            Request.Entry<GetUser>,
            ...Array<Request.Entry<GetUser>>,
        ],
        _size: number
    ): Effect.Effect<void, LookupError> => Effect.void
)

export const fallback_resolver = RequestResolver.fromEffect<GetUser>(
    (entry: Request.Entry<GetUser>): Effect.Effect<string, LookupError> =>
        Effect.succeed(`fallback:${entry.request.id}`)
)

export const racing_resolver = RequestResolver.race(
    manual_resolver,
    fallback_resolver
)

export const traced_resolver = RequestResolver.withSpan(
    manual_resolver,
    "learn.request-resolver",
    {
        attributes: {
            lesson: "RequestResolver",
        },
    }
)

export const resolver_guard_probe = {
    resolver: RequestResolver.isRequestResolver(manual_resolver),
    plain: RequestResolver.isRequestResolver({
        runAll: () => Effect.void,
    }),
} as const

export const with_cache_effect = RequestResolver.withCache(manual_resolver, {
    capacity: 32,
    strategy: "lru",
})

export const as_cache_effect = RequestResolver.asCache(manual_resolver, {
    capacity: 32,
    timeToLive: () => "30 seconds",
})

// persisted is demonstrated in stage_details rather than instantiated here.
// Its request type must implement Persistable.Any and include persistence /
// schema errors in the request error type, while construction requires the
// Persistence and Scope services.

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Build"),
    S.Literal("Batch"),
    S.Literal("Decorate"),
    S.Literal("Cache"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Build",
    "Batch",
    "Decorate",
    "Cache",
]

export const BuildCase = S.Union([
    S.Literal("Function"),
    S.Literal("Batched"),
    S.Literal("Effect"),
    S.Literal("Tagged"),
    S.Literal("Manual"),
])
export type BuildCase = typeof BuildCase.Type

export const build_cases: ReadonlyArray<BuildCase> = [
    "Function",
    "Batched",
    "Effect",
    "Tagged",
    "Manual",
]

export const BatchCase = S.Union([
    S.Literal("Grouped"),
    S.Literal("Limit"),
    S.Literal("Delay"),
    S.Literal("Custom"),
])
export type BatchCase = typeof BatchCase.Type

export const batch_cases: ReadonlyArray<BatchCase> = [
    "Grouped",
    "Limit",
    "Delay",
    "Custom",
]

export const DecorateCase = S.Union([
    S.Literal("Around"),
    S.Literal("Race"),
    S.Literal("Span"),
    S.Literal("Guard"),
    S.Literal("Never"),
])
export type DecorateCase = typeof DecorateCase.Type

export const decorate_cases: ReadonlyArray<DecorateCase> = [
    "Around",
    "Race",
    "Span",
    "Guard",
    "Never",
]

export const CacheCase = S.Union([
    S.Literal("WithCache"),
    S.Literal("AsCache"),
    S.Literal("Persisted"),
    S.Literal("Equality"),
])
export type CacheCase = typeof CacheCase.Type

export const cache_cases: ReadonlyArray<CacheCase> = [
    "WithCache",
    "AsCache",
    "Persisted",
    "Equality",
]

export const Model = S.Struct({
    stage: Stage,
    buildCase: BuildCase,
    batchCase: BatchCase,
    decorateCase: DecorateCase,
    cacheCase: CacheCase,
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
        eyebrow: "request values describe work · resolvers perform it",
        title: "Choose the smallest resolver constructor that matches the backend",
        description:
            "RequestResolver turns pending Request.Entry values into completed results. Pure, batched, effectful, tagged-union, grouped, and fully manual constructors let the resolver match the shape of the backend instead of forcing every data source through one abstraction.",
        code: `const resolver =
    RequestResolver.fromEffect<GetUser>(
        (entry) =>
            loadUser(
                entry.request.id
            )
    )

const program =
    Effect.request(
        GetUser({
            id: 42,
            region: "eu"
        }),
        resolver
    )`,
        apis: [
            "RequestResolver.fromFunction",
            "RequestResolver.fromFunctionBatched",
            "RequestResolver.fromEffect",
            "RequestResolver.fromEffectTagged",
            "RequestResolver.make",
            "RequestResolver.makeGrouped",
        ],
        notice: "A resolver must complete every accepted entry. Request describes what is needed; RequestResolver owns how entries are collected, executed, and completed.",
    },

    Batch: {
        eyebrow: "batch key · collection window · cutoff · non-empty runAll",
        title: "Shape when requests join the same backend batch",
        description:
            "grouped/makeGrouped separate entries by key, batchN caps each collected batch, and setDelay or setDelayEffect changes the collection window. makeWith exposes all primitives directly: batchKey, preCheck, delay, collectWhile, and runAll.",
        code: `const tuned = resolver.pipe(
    RequestResolver.grouped(
        ({ request }) =>
            request.region
    ),
    RequestResolver.batchN(8),
    RequestResolver.setDelay(
        "5 millis"
    )
)`,
        apis: [
            "RequestResolver.grouped",
            "RequestResolver.batchN",
            "RequestResolver.setDelay",
            "RequestResolver.setDelayEffect",
            "RequestResolver.makeWith",
        ],
        notice: "preCheck is not just a filter. Returning false means the entry is not sent to runAll, so that branch must already complete it or connect it to another completion path.",
    },

    Decorate: {
        eyebrow: "wrap execution without changing request values",
        title: "Add lifecycle hooks, racing, tracing, and runtime guards",
        description:
            "around brackets each resolver run with before/after Effects. race sends the batch to two resolvers and interrupts the loser after the winner completes. withSpan adds a resolver span plus request parent-span links and batch-size metadata.",
        code: `const observed = resolver.pipe(
    RequestResolver.around(
        beforeBatch,
        afterBatch
    ),
    RequestResolver.withSpan(
        "users.batch"
    )
)

const fastest =
    RequestResolver.race(
        cacheResolver,
        databaseResolver
    )`,
        apis: [
            "RequestResolver.around",
            "RequestResolver.race",
            "RequestResolver.withSpan",
            "RequestResolver.isRequestResolver",
            "RequestResolver.never",
        ],
        notice: "race races resolver runs, not request construction. The losing run is interrupted. RequestResolver.never is only for statically impossible request types—using it for a real request waits forever until interruption.",
    },

    Cache: {
        eyebrow: "request equality becomes the cache key contract",
        title: "Choose resolver-local caching, a first-class Cache, or persistence",
        description:
            "withCache keeps caching behind a RequestResolver. asCache exposes Cache operations such as refresh and invalidation and supports TTL/service lookup policy. persisted reuses Persistable request results through a Persistence store and can stale-while-revalidate.",
        code: `const cached =
    yield* RequestResolver.withCache(
        resolver,
        {
            capacity: 256,
            strategy: "lru"
        }
    )

const cache =
    yield* RequestResolver.asCache(
        resolver,
        {
            capacity: 256,
            timeToLive:
                () => "30 seconds"
        }
    )`,
        apis: [
            "RequestResolver.withCache",
            "RequestResolver.asCache",
            "RequestResolver.persisted",
        ],
        notice: "Cache hits use request equality. withCache has no TTL and caches completed successes and non-interruption failures; asCache adds TTL and Cache operations; persisted additionally requires Persistable requests, Persistence, and Scope.",
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
        case "Function":
            return {
                input: "one Entry<GetUser>",
                operation: "fromFunction(entry => value)",
                result: "pure success · resolver completes entry",
                invariant:
                    "callback cannot express typed failure or Effect requirements",
                implementation: "one synchronous function per entry",
                guidance:
                    "Use fromFunction for deterministic in-memory lookups or pure derivations.",
            }

        case "Batched":
            return {
                input: "non-empty batch of entries",
                operation: "fromFunctionBatched(entries => results)",
                result: "result[i] completes entry[i]",
                invariant:
                    "result order and cardinality must correspond to input",
                implementation: "one pure function for the whole batch",
                guidance:
                    "Use when a pure backend operation naturally accepts many requests together.",
            }

        case "Effect":
            return {
                input: "Entry<GetUser>",
                operation: "fromEffect(entry => Effect<A, E>)",
                result: "each entry gets the Effect Exit",
                invariant:
                    "per-entry effects may succeed or fail with Request.Error",
                implementation:
                    "child fibers are observed and entries completed from each Exit",
                guidance:
                    "Use fromEffect when each request is effectful but does not need backend-level batching.",
            }

        case "Tagged":
            return {
                input: "GetUser | GetPost",
                operation: "fromEffectTagged<LookupRequest>()({...})",
                result: "one batch handler per _tag",
                invariant:
                    "each handler returns results aligned with its entries",
                implementation:
                    "tagged requests are partitioned before handler execution",
                guidance:
                    "Use for heterogeneous request unions with tag-specific batch loaders.",
            }

        case "Manual":
            return {
                input: "NonEmptyArray<Request.Entry<GetUser>>",
                operation: "RequestResolver.make(runAll)",
                result: "runAll must complete every entry",
                invariant:
                    "successful runAll with an incomplete entry is a resolver bug",
                implementation:
                    "default key · yieldNow delay · collectWhile true",
                guidance:
                    "Use make when the backend needs direct control over a whole collected batch.",
            }
    }
}

export const batch_snapshot = (model: Model): Snapshot => {
    switch (model.batchCase) {
        case "Grouped":
            return {
                input: "eu, eu, us requests",
                operation: "grouped(resolver, entry => region)",
                result: "one eu batch · one us batch",
                invariant: "equal keys share a batch key",
                implementation:
                    "group keys are canonicalized with Effect equality semantics",
                guidance:
                    "Group by a backend partition key such as tenant, region, shard, or table.",
            }

        case "Limit":
            return {
                input: "8 waiting requests · batchN(3)",
                operation: "collect while batch size < 3",
                result: "3 · 3 · 2",
                invariant: "every produced batch remains non-empty",
                implementation: "collectWhile is replaced with a size cutoff",
                guidance:
                    "Use batchN to respect backend limits such as SQL IN sizes or API batch caps.",
            }

        case "Delay":
            return {
                input: "requests arriving close together",
                operation: "setDelay / setDelayEffect",
                result: "wider or custom collection window",
                invariant:
                    "delay affects collection timing, not request result semantics",
                implementation: "resolver.delay is replaced",
                guidance:
                    "Trade a little latency for larger batches only when the backend benefits from aggregation.",
            }

        case "Custom":
            return {
                input: "makeWith options",
                operation:
                    "batchKey + preCheck + delay + collectWhile + runAll",
                result: "fully specified batching policy",
                invariant: "preCheck false entries do not reach runAll",
                implementation:
                    "options become the resolver protocol fields directly",
                guidance:
                    "Reach for makeWith only when the higher-level combinators cannot express the collection policy.",
            }
    }
}

export const decorate_snapshot = (model: Model): Snapshot => {
    switch (model.decorateCase) {
        case "Around":
            return {
                input: "resolver batch",
                operation: "around(before, after)",
                result: "before → runAll → after",
                invariant: "hooks participate in the resolver error channel",
                implementation: "before result is passed into after",
                guidance:
                    "Use for resource accounting, metrics, logging, or batch-scoped setup/teardown.",
            }

        case "Race":
            return {
                input: "cache resolver + database resolver",
                operation: "race(left, right)",
                result: "first completing resolver wins",
                invariant: "losing resolver run is interrupted",
                implementation: "both receive the same batch",
                guidance:
                    "Use only when both resolvers are safe to start concurrently and first-result semantics are intentional.",
            }

        case "Span":
            return {
                input: "resolver + span name/options",
                operation: "withSpan",
                result: "batch span with batchSize + request links",
                invariant:
                    "request parent spans are linked without duplicating equal span objects",
                implementation: "wraps runAll in Effect.withSpan",
                guidance:
                    "Use for observability at the backend batch boundary rather than adding ad-hoc spans per helper.",
            }

        case "Guard":
            return {
                input: "resolver · plain look-alike",
                operation: "isRequestResolver(value)",
                result: `${String(resolver_guard_probe.resolver)} · ${String(resolver_guard_probe.plain)}`,
                invariant: "shape alone is not the runtime marker",
                implementation:
                    "checks Effect's RequestResolver TypeId property",
                guidance:
                    "Use the guard when a resolver arrives through an unknown/plugin boundary.",
            }

        case "Never":
            return {
                input: "RequestResolver.never",
                operation: "runAll => Effect.never",
                result: "no request completion",
                invariant: "real requests wait until interruption",
                implementation: "resolver is typed for Request<never>",
                guidance:
                    "Reserve never for impossible request types and exhaustiveness plumbing, not as a stub backend.",
            }
    }
}

export const cache_snapshot = (model: Model): Snapshot => {
    switch (model.cacheCase) {
        case "WithCache":
            return {
                input: "resolver + capacity/strategy",
                operation: "withCache",
                result: "Effect<RequestResolver<A>>",
                invariant: "request equality decides hits",
                implementation: "bounded in-memory resolver wrapper · no TTL",
                guidance:
                    "Use when callers should keep using Effect.request and do not need direct Cache operations.",
            }

        case "AsCache":
            return {
                input: "resolver + capacity + optional TTL",
                operation: "asCache",
                result: "Effect<Cache<Request, Success, Error, ...>>",
                invariant: "request is the Cache key",
                implementation:
                    "cache misses execute Effect.request through the resolver",
                guidance:
                    "Use when refresh, invalidation, lookup, or cache inspection should be first-class.",
            }

        case "Persisted":
            return {
                input: "Persistable request + Persistence + Scope",
                operation:
                    "persisted({ storeId, timeToLive, staleWhileRevalidate })",
                result: "RequestResolver backed by persistent results",
                invariant:
                    "request error type must include persistence/schema errors",
                implementation:
                    "read store → resolve misses/stale → write refreshed exits",
                guidance:
                    "Use when results must survive process lifetime and the request has a stable Persistable representation.",
            }

        case "Equality":
            return {
                input: "two request values",
                operation: "cache key comparison",
                result: "equal requests may reuse one completed result",
                invariant:
                    "cache correctness depends on request equality matching backend identity",
                implementation:
                    "withCache/asCache key directly by request value",
                guidance:
                    "Include every field that changes the backend result in the request's equality identity.",
            }
    }
}

// -----------------------------------------------------------------------------
// MESSAGE / UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedRequestResolverStage: {
        stage: Stage,
    },
    SelectedRequestResolverBuildCase: {
        buildCase: BuildCase,
    },
    SelectedRequestResolverBatchCase: {
        batchCase: BatchCase,
    },
    SelectedRequestResolverDecorateCase: {
        decorateCase: DecorateCase,
    },
    SelectedRequestResolverCacheCase: {
        cacheCase: CacheCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Build",
    buildCase: "Function",
    batchCase: "Grouped",
    decorateCase: "Around",
    cacheCase: "WithCache",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type BuildCasePayload = Readonly<{
    buildCase: BuildCase
}>

type BatchCasePayload = Readonly<{
    batchCase: BatchCase
}>

type DecorateCasePayload = Readonly<{
    decorateCase: DecorateCase
}>

type CacheCasePayload = Readonly<{
    cacheCase: CacheCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedRequestResolverStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedRequestResolverBuildCase: ({
            buildCase,
        }: BuildCasePayload) => ({
            model: modifyFields(model, {
                buildCase: () => buildCase,
            }),
        }),

        SelectedRequestResolverBatchCase: ({
            batchCase,
        }: BatchCasePayload) => ({
            model: modifyFields(model, {
                batchCase: () => batchCase,
            }),
        }),

        SelectedRequestResolverDecorateCase: ({
            decorateCase,
        }: DecorateCasePayload) => ({
            model: modifyFields(model, {
                decorateCase: () => decorateCase,
            }),
        }),

        SelectedRequestResolverCacheCase: ({
            cacheCase,
        }: CacheCasePayload) => ({
            model: modifyFields(model, {
                cacheCase: () => cacheCase,
            }),
        }),
    })
