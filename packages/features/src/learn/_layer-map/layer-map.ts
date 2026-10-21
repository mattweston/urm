import { Context, Effect, Layer, LayerMap, Option, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// DOMAIN SERVICE
// -----------------------------------------------------------------------------

export type TenantClientApi = Readonly<{
    tenant: string
    request: (path: string) => Effect.Effect<string>
}>

export const TenantClient = Context.Service<TenantClientApi>("TenantClient")

export const tenant_layer = (
    tenant: string
): Layer.Layer<typeof TenantClient> =>
    Layer.succeed(TenantClient)({
        tenant,
        request: (path: string): Effect.Effect<string> =>
            Effect.succeed(`${tenant}:${path}`),
    })

// -----------------------------------------------------------------------------
// REAL PROGRAMS
// -----------------------------------------------------------------------------

export const dynamic_map_program = Effect.scoped(
    Effect.gen(function* () {
        const map = yield* LayerMap.make(
            (tenant: string) => tenant_layer(tenant),
            {
                idleTimeToLive: (tenant: string) =>
                    tenant === "hot" ? "30 seconds" : "5 seconds",
                preloadKeys: ["hot"],
            }
        )

        const context = yield* map.contextEffect("acme")

        const client = Context.get(context, TenantClient)

        return yield* client.request("/health")
    })
)

export const layer_access_program = Effect.scoped(
    Effect.gen(function* () {
        const map = yield* LayerMap.make((tenant: string) =>
            tenant_layer(tenant)
        )

        return yield* TenantClient.use((client: TenantClientApi) =>
            client.request("/version")
        ).pipe(Effect.provide(map.get("acme")))
    })
)

export const cache_probe_program = Effect.scoped(
    Effect.gen(function* () {
        const map = yield* LayerMap.make(
            (tenant: string) => tenant_layer(tenant),
            {
                idleTimeToLive: "30 seconds",
            }
        )

        const before = yield* map.contextEffectOption("cold")

        yield* map.contextEffect("cold")

        const cached = yield* map.contextEffectOption("cold")

        yield* map.invalidate("cold")

        const invalidated = yield* map.contextEffectOption("cold")

        return {
            before: Option.isSome(before),
            cached: Option.isSome(cached),
            invalidated: Option.isSome(invalidated),
        } as const
    })
)

export const predefined_map_program = Effect.scoped(
    Effect.gen(function* () {
        const map = yield* LayerMap.fromRecord(
            {
                development: tenant_layer("development"),
                production: tenant_layer("production"),
            } as const,
            {
                preload: true,
                idleTimeToLive: "10 seconds",
            }
        )

        const context = yield* map.contextEffect("production")

        return Context.get(context, TenantClient).tenant
    })
)

// -----------------------------------------------------------------------------
// SERVICE WRAPPER
// -----------------------------------------------------------------------------

export class TenantClients extends LayerMap.Service<TenantClients>()(
    "TenantClients",
    {
        lookup: (tenant: string) => tenant_layer(tenant),
        idleTimeToLive: "30 seconds",
        preloadKeys: ["alpha"],
    }
) {}

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Build"),
    S.Literal("Access"),
    S.Literal("Cache"),
    S.Literal("Service"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Build",
    "Access",
    "Cache",
    "Service",
]

export const BuildCase = S.Union([
    S.Literal("Dynamic"),
    S.Literal("Record"),
    S.Literal("Preload"),
])
export type BuildCase = typeof BuildCase.Type

export const AccessCase = S.Union([
    S.Literal("Layer"),
    S.Literal("Context"),
    S.Literal("CachedOnly"),
])
export type AccessCase = typeof AccessCase.Type

export const CacheCase = S.Union([
    S.Literal("Miss"),
    S.Literal("Invalidate"),
    S.Literal("IdleTTL"),
])
export type CacheCase = typeof CacheCase.Type

export const ServiceCase = S.Union([
    S.Literal("Wrapper"),
    S.Literal("Layers"),
    S.Literal("Types"),
])
export type ServiceCase = typeof ServiceCase.Type

export const Model = S.Struct({
    stage: Stage,
    buildCase: BuildCase,
    accessCase: AccessCase,
    cacheCase: CacheCase,
    serviceCase: ServiceCase,
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
        eyebrow: "key → layer → cached context",
        title: "Build dynamic or predefined keyed service families",
        description:
            "LayerMap.make turns a key-to-Layer function into a scoped cache. fromRecord does the same for a fixed record of layers. Optional preloading builds selected entries up front, while idleTimeToLive controls how long unused entries remain cached.",
        code: `const map =
    yield* LayerMap.make(
        (
            tenant: string
        ) =>
            tenantLayer(
                tenant
            ),
        {
            idleTimeToLive:
                (
                    tenant
                ) =>
                    tenant === "hot"
                        ? "30 seconds"
                        : "5 seconds",
            preloadKeys: [
                "hot"
            ]
        }
    )

const fixed =
    yield* LayerMap.fromRecord(
        {
            development:
                devLayer,
            production:
                prodLayer
        },
        {
            preload: true
        }
    )`,
        apis: ["LayerMap.LayerMap", "LayerMap.make", "LayerMap.fromRecord"],
        notice: "LayerMap is scoped because cached layers may own resources. make captures the surrounding layer context and a memo map so keyed layers can build against the same dependency environment.",
    },

    Access: {
        eyebrow: "three retrieval surfaces",
        title: "Retrieve a Layer, acquire a Context, or ask only for an existing cached entry",
        description:
            "get(key) returns a Layer suitable for Effect.provide. contextEffect(key) acquires the keyed Context directly. contextEffectOption(key) retains an entry only when it is already cached and never builds a missing key.",
        code: `const layer =
    map.get(
        "acme"
    )

const result =
    yield* TenantClient.use(
        (
            client
        ) =>
            client.request(
                "/version"
            )
    ).pipe(
        Effect.provide(
            layer
        )
    )

const context =
    yield* map.contextEffect(
        "acme"
    )

const cachedOnly =
    yield* map
        .contextEffectOption(
            "acme"
        )`,
        apis: [
            "LayerMap.get",
            "LayerMap.contextEffect",
            "LayerMap.contextEffectOption",
            "LayerMap.rcMap",
        ],
        notice: "contextEffect and contextEffectOption both require Scope because acquiring a cached resource retains it for that scope. contextEffectOption returns None for a miss or closed map and does not invoke the layer lookup.",
    },

    Cache: {
        eyebrow: "reference-counted lifecycle",
        title: "Invalidate explicitly or let idle entries expire after their last active reference",
        description:
            "LayerMap delegates cache ownership to RcMap. invalidate removes the current entry from the map; the next acquisition builds a fresh one. If an invalidated entry is still retained by a scope, its resource is released when that active reference is gone.",
        code: `const before =
    yield* map
        .contextEffectOption(
            "cold"
        )
// None — no build

yield* map.contextEffect(
    "cold"
)

const cached =
    yield* map
        .contextEffectOption(
            "cold"
        )
// Some(context)

yield* map.invalidate(
    "cold"
)

const after =
    yield* map
        .contextEffectOption(
            "cold"
        )
// None`,
        apis: [
            "LayerMap.contextEffect",
            "LayerMap.contextEffectOption",
            "LayerMap.invalidate",
            "LayerMap.make",
        ],
        notice: "idleTimeToLive starts mattering once an entry has no active references. A zero TTL closes it immediately; a finite TTL schedules release; an infinite TTL can keep an unused cached entry until invalidation or map shutdown.",
    },

    Service: {
        eyebrow: "Context service wrapper",
        title: "LayerMap.Service packages a keyed map behind a service class with static helpers",
        description:
            "Service creates a Context service class exposing layer, layerNoDeps, get, contextEffect, contextEffectOption, and invalidate. TagClass describes that generated class shape, while namespace utility types extract keys, layers, successes, errors, and requirements.",
        code: `class TenantClients
    extends LayerMap.Service<
        TenantClients
    >()(
        "TenantClients",
        {
            lookup:
                (
                    tenant: string
                ) =>
                    tenantLayer(
                        tenant
                    ),
            idleTimeToLive:
                "30 seconds"
        }
    )
{}

const program =
    TenantClient.use(
        (
            client
        ) =>
            client.request(
                "/status"
            )
    ).pipe(
        Effect.provide(
            TenantClients.get(
                "alpha"
            )
        ),
        Effect.provide(
            TenantClients.layer
        )
    )`,
        apis: [
            "LayerMap.Service",
            "LayerMap.TagClass",
            "LayerMap.Service.Key",
            "LayerMap.Service.Layers",
            "LayerMap.Service.Success",
            "LayerMap.Service.Error",
            "LayerMap.Service.Services",
        ],
        notice: "layer includes declared dependencies when the Service options provide them; layerNoDeps exposes only construction of the LayerMap service itself and leaves those dependencies to the caller.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

export type BuildSnapshot = Readonly<{
    mode: BuildCase
    constructor: string
    keySpace: string
    preload: string
    ttl: string
    resultType: string
}>

export const build_snapshot = (model: Model): BuildSnapshot => {
    if (model.buildCase === "Record") {
        return {
            mode: model.buildCase,
            constructor: "LayerMap.fromRecord",
            keySpace: '"development" | "production"',
            preload: "preload: true → all record keys",
            ttl: "10 seconds",
            resultType: "Effect<LayerMap<keyof Layers, Success, Error>, ...>",
        }
    }

    if (model.buildCase === "Preload") {
        return {
            mode: model.buildCase,
            constructor: "LayerMap.make",
            keySpace: "string",
            preload: '["hot"]',
            ttl: "hot → 30s · others → 5s",
            resultType: "preload errors join constructor error channel",
        }
    }

    return {
        mode: model.buildCase,
        constructor: "LayerMap.make",
        keySpace: "string",
        preload: "optional",
        ttl: "Duration.Input or (key) => Duration.Input",
        resultType:
            "Effect<LayerMap<K, I, E>, preload errors, Scope | services>",
    }
}

export type AccessSnapshot = Readonly<{
    mode: AccessCase
    get: string
    context: string
    cachedOnly: string
    scope: string
    missingBehavior: string
}>

export const access_snapshot = (model: Model): AccessSnapshot => ({
    mode: model.accessCase,
    get: "get(key) → Layer<I, E>",
    context: "contextEffect(key) → Effect<Context<I>, E, Scope>",
    cachedOnly:
        "contextEffectOption(key) → Effect<Option<Context<I>>, E, Scope>",
    scope: "acquisition retained until requesting Scope closes",
    missingBehavior:
        model.accessCase === "CachedOnly"
            ? "missing key → None, lookup is not run"
            : "get/contextEffect may build the key on demand",
})

export type CacheSnapshot = Readonly<{
    mode: CacheCase
    before: string
    afterAcquire: string
    afterInvalidate: string
    nextAcquire: string
    idleRule: string
}>

export const cache_snapshot = (model: Model): CacheSnapshot => ({
    mode: model.cacheCase,
    before: "contextEffectOption(cold) → None",
    afterAcquire: "contextEffect(cold) → cached + retained",
    afterInvalidate: "invalidate(cold) removes map entry",
    nextAcquire: "new contextEffect(cold) builds a fresh entry",
    idleRule:
        model.cacheCase === "IdleTTL"
            ? "release last ref → wait idleTimeToLive → close if still unused"
            : "active invalidated resources finish when their references release",
})

export type ServiceSnapshot = Readonly<{
    mode: ServiceCase
    service: string
    layers: string
    helpers: string
    typeHelpers: string
    keyExample: string
}>

export const service_snapshot = (model: Model): ServiceSnapshot => ({
    mode: model.serviceCase,
    service: "TenantClients extends LayerMap.Service<TenantClients>()(...)",
    layers: "layer · layerNoDeps",
    helpers: "get · contextEffect · contextEffectOption · invalidate",
    typeHelpers: "Service.Key · Layers · Success · Error · Services",
    keyExample:
        'TenantClients.get("alpha") → Layer<TenantClient, E, TenantClients>',
})

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedLayerMapStage: {
        stage: Stage,
    },
    SelectedLayerMapBuildCase: {
        buildCase: BuildCase,
    },
    SelectedLayerMapAccessCase: {
        accessCase: AccessCase,
    },
    SelectedLayerMapCacheCase: {
        cacheCase: CacheCase,
    },
    SelectedLayerMapServiceCase: {
        serviceCase: ServiceCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Build",
    buildCase: "Dynamic",
    accessCase: "Layer",
    cacheCase: "Miss",
    serviceCase: "Wrapper",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type BuildCasePayload = Readonly<{
    buildCase: BuildCase
}>

type AccessCasePayload = Readonly<{
    accessCase: AccessCase
}>

type CacheCasePayload = Readonly<{
    cacheCase: CacheCase
}>

type ServiceCasePayload = Readonly<{
    serviceCase: ServiceCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedLayerMapStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedLayerMapBuildCase: ({ buildCase }: BuildCasePayload) => ({
            model: evo(model, {
                buildCase: () => buildCase,
            }),
        }),

        SelectedLayerMapAccessCase: ({ accessCase }: AccessCasePayload) => ({
            model: evo(model, {
                accessCase: () => accessCase,
            }),
        }),

        SelectedLayerMapCacheCase: ({ cacheCase }: CacheCasePayload) => ({
            model: evo(model, {
                cacheCase: () => cacheCase,
            }),
        }),

        SelectedLayerMapServiceCase: ({ serviceCase }: ServiceCasePayload) => ({
            model: evo(model, {
                serviceCase: () => serviceCase,
            }),
        }),
    })
