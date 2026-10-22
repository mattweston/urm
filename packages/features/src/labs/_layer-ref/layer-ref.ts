import { Context, Effect, Layer, LayerRef, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// DOMAIN SERVICE + REAL LAYER
// -----------------------------------------------------------------------------

export type ConnectionApi = Readonly<{
    generation: number
    query: (sql: string) => Effect.Effect<string>
}>

export const Connection = Context.Service<ConnectionApi>(
    "LayerRefDemo/Connection"
)

export const make_connection_layer = (
    acquired: Array<number>,
    released: Array<number>
): Layer.Layer<typeof Connection> =>
    Layer.effect(Connection)(
        Effect.acquireRelease(
            Effect.sync(() => {
                const generation = acquired.length + 1

                acquired.push(generation)

                return {
                    generation,
                    query: (sql: string): Effect.Effect<string> =>
                        Effect.succeed(`g${generation}:${sql}`),
                } satisfies ConnectionApi
            }),
            (connection: ConnectionApi) =>
                Effect.sync(() => {
                    released.push(connection.generation)
                })
        )
    )

// -----------------------------------------------------------------------------
// REAL EFFECT PROGRAMS
// -----------------------------------------------------------------------------

export const lazy_program = Effect.scoped(
    Effect.gen(function* () {
        const acquired: Array<number> = []
        const released: Array<number> = []

        const ref = yield* LayerRef.make(
            make_connection_layer(acquired, released),
            {
                idleTimeToLive: "30 seconds",
            }
        )

        const before = acquired.length

        const context = yield* Effect.scoped(ref.contextEffect)

        const connection = Context.get(context, Connection)

        return {
            before,
            after: acquired.length,
            generation: connection.generation,
            released: released.length,
        } as const
    })
)

export const invalidate_program = Effect.scoped(
    Effect.gen(function* () {
        const acquired: Array<number> = []
        const released: Array<number> = []

        const ref = yield* LayerRef.make(
            make_connection_layer(acquired, released),
            {
                idleTimeToLive: "1 minute",
            }
        )

        const first = yield* Effect.scoped(ref.contextEffect)

        yield* ref.invalidate

        const second = yield* Effect.scoped(ref.contextEffect)

        return {
            first: Context.get(first, Connection).generation,
            second: Context.get(second, Connection).generation,
            acquired: acquired.slice(),
            released: released.slice(),
        } as const
    })
)

export const refresh_program = Effect.scoped(
    Effect.gen(function* () {
        const acquired: Array<number> = []
        const released: Array<number> = []

        const ref = yield* LayerRef.make(
            make_connection_layer(acquired, released),
            {
                preload: true,
                idleTimeToLive: "1 minute",
            }
        )

        const initial = acquired.length

        yield* ref.refresh

        const context = yield* Effect.scoped(ref.contextEffect)

        return {
            initial,
            afterRefresh: acquired.length,
            generation: Context.get(context, Connection).generation,
            released: released.slice(),
        } as const
    })
)

// -----------------------------------------------------------------------------
// SERVICE WRAPPER
// -----------------------------------------------------------------------------

export class ConnectionRef extends LayerRef.Service<ConnectionRef>()(
    "LayerRefDemo/ConnectionRef",
    {
        layer: make_connection_layer([], []),
        idleTimeToLive: "30 seconds",
        preload: true,
    }
) {}

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Build"),
    S.Literal("Access"),
    S.Literal("Invalidate"),
    S.Literal("Service"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Build",
    "Access",
    "Invalidate",
    "Service",
]

export const BuildCase = S.Union([
    S.Literal("Lazy"),
    S.Literal("Preload"),
    S.Literal("Schedule"),
])
export type BuildCase = typeof BuildCase.Type

export const AccessCase = S.Union([
    S.Literal("Layer"),
    S.Literal("Context"),
    S.Literal("Reuse"),
])
export type AccessCase = typeof AccessCase.Type

export const InvalidateCase = S.Union([
    S.Literal("Invalidate"),
    S.Literal("Refresh"),
    S.Literal("Borrowed"),
])
export type InvalidateCase = typeof InvalidateCase.Type

export const ServiceCase = S.Union([
    S.Literal("Wrapper"),
    S.Literal("Layers"),
    S.Literal("Helpers"),
])
export type ServiceCase = typeof ServiceCase.Type

export const Model = S.Struct({
    stage: Stage,
    buildCase: BuildCase,
    accessCase: AccessCase,
    invalidateCase: InvalidateCase,
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
        eyebrow: "one layer → one refreshable context",
        title: "Build lazily, preload immediately, or invalidate on a schedule",
        description:
            "LayerRef.make captures a Layer and turns its built Context into a reference-counted cache. The first get builds lazily by default; preload builds during construction; idleTimeToLive keeps an unused context warm; invalidationSchedule can periodically invalidate it.",
        code: `const ref =
    yield* LayerRef.make(
        connectionLayer,
        {
            idleTimeToLive:
                "30 seconds",
            preload: true,
            invalidationSchedule:
                Schedule.spaced(
                    "5 minutes"
                )
        }
    )`,
        apis: ["LayerRef.LayerRef", "LayerRef.make"],
        notice: "With preload: true, scheduled invalidation also reacquires immediately. Without preload, the schedule invalidates only, so the next user performs the rebuild.",
    },

    Access: {
        eyebrow: "layer or scoped context",
        title: "Provide the cached services as a Layer or acquire their Context directly",
        description:
            "ref.get is a Layer backed by the reference-counted cache. ref.contextEffect is the scoped acquisition form. Both acquire on demand and retain the current cached Context for the borrowing Scope.",
        code: `const result =
    yield* program.pipe(
        Effect.provide(
            ref.get
        )
    )

const context =
    yield* ref.contextEffect

const connection =
    Context.get(
        context,
        Connection
    )`,
        apis: ["LayerRef.get", "LayerRef.contextEffect", "LayerRef.rcRef"],
        notice: "Each acquisition is scoped. Multiple overlapping borrowers share the same cached Context; the underlying RcRef tracks references so cleanup cannot revoke a resource still in active use.",
    },

    Invalidate: {
        eyebrow: "invalidate vs refresh",
        title: "Invalidate for the next use, or refresh by invalidating and reacquiring now",
        description:
            "invalidate removes the cached Context from future reuse. refresh performs invalidate and then immediately reacquires a fresh Context in an internal scoped borrow. Existing borrowers keep using their old Context until their own Scopes close.",
        code: `yield* ref.invalidate
// next get builds fresh

yield* ref.refresh
// invalidate + reacquire now

const fresh =
    yield* Effect.scoped(
        ref.contextEffect
    )`,
        apis: [
            "LayerRef.invalidate",
            "LayerRef.refresh",
            "LayerRef.contextEffect",
        ],
        notice: "Invalidation is safe for active users: it does not revoke already-borrowed Context values. Those remain valid until their retaining Scopes close, while later acquisitions use a new cache generation.",
    },

    Service: {
        eyebrow: "Context service wrapper",
        title: "LayerRef.Service packages the refreshable reference behind a service class",
        description:
            "Service creates a Context service whose value is a LayerRef and adds static layer, layerNoDeps, get, contextEffect, invalidate, and refresh helpers. TagClass is the public generated-class shape.",
        code: `class ConnectionRef
    extends LayerRef.Service<
        ConnectionRef
    >()(
        "ConnectionRef",
        {
            layer:
                connectionLayer,
            preload: true,
            idleTimeToLive:
                "30 seconds"
        }
    )
{}

const program =
    query.pipe(
        Effect.provide(
            ConnectionRef.get
        ),
        Effect.provide(
            ConnectionRef.layer
        )
    )`,
        apis: ["LayerRef.Service", "LayerRef.TagClass"],
        notice: "layer includes dependencies declared in the Service options; layerNoDeps constructs the LayerRef service without supplying those dependencies. Static invalidate / refresh avoid retrieving the LayerRef value manually.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

export type BuildSnapshot = Readonly<{
    mode: BuildCase
    acquisition: string
    preload: string
    idle: string
    scheduledAction: string
    constructorError: string
}>

export const build_snapshot = (model: Model): BuildSnapshot => {
    if (model.buildCase === "Preload") {
        return {
            mode: model.buildCase,
            acquisition: "during LayerRef.make",
            preload: "true",
            idle: "idleTimeToLive keeps the built Context cached",
            scheduledAction: "with preload: scheduled invalidation → refresh",
            constructorError: "layer error E can appear during construction",
        }
    }

    if (model.buildCase === "Schedule") {
        return {
            mode: model.buildCase,
            acquisition: "lazy unless preload is true",
            preload: "controls scheduled reacquisition",
            idle: "independent from invalidation schedule",
            scheduledAction:
                "preload=false → invalidate · preload=true → refresh",
            constructorError: "schedule requirements join make requirements",
        }
    }

    return {
        mode: model.buildCase,
        acquisition: "first get / contextEffect",
        preload: "false by default",
        idle: "resource closes after last ref unless TTL keeps it warm",
        scheduledAction: "none unless invalidationSchedule supplied",
        constructorError: "no layer E at construction when not preloaded",
    }
}

export type AccessSnapshot = Readonly<{
    mode: AccessCase
    get: string
    context: string
    cache: string
    scope: string
    reuse: string
}>

export const access_snapshot = (model: Model): AccessSnapshot => ({
    mode: model.accessCase,
    get: "ref.get → Layer<I, E>",
    context: "ref.contextEffect → Effect<Context<I>, E, Scope>",
    cache: "ref.rcRef → RcRef<Context<I>, E>",
    scope: "each borrower retains the current Context until its Scope closes",
    reuse:
        model.accessCase === "Reuse"
            ? "overlapping / warm acquisitions reuse one cached generation"
            : "both access surfaces use the same RcRef cache",
})

export type InvalidateSnapshot = Readonly<{
    mode: InvalidateCase
    invalidate: string
    refresh: string
    currentBorrowers: string
    laterBorrowers: string
    generationStory: string
}>

export const invalidate_snapshot = (model: Model): InvalidateSnapshot => ({
    mode: model.invalidateCase,
    invalidate: "remove cached generation from future reuse",
    refresh: "invalidate → scoped RcRef.get → fresh generation now",
    currentBorrowers: "old Context stays valid until retaining Scope closes",
    laterBorrowers: "acquire the new generation",
    generationStory:
        model.invalidateCase === "Refresh"
            ? "g1 cached → refresh → g1 released when possible → g2 prewarmed"
            : "g1 cached → invalidate → next use builds g2",
})

export type ServiceSnapshot = Readonly<{
    mode: ServiceCase
    classShape: string
    layers: string
    helpers: string
    getType: string
    refreshType: string
}>

export const service_snapshot = (model: Model): ServiceSnapshot => ({
    mode: model.serviceCase,
    classShape: "Context.ServiceClass<Self, Id, LayerRef<I, E>> + helpers",
    layers: "layer · layerNoDeps",
    helpers: "get · contextEffect · invalidate · refresh",
    getType: "Layer<I, E, Self>",
    refreshType: "Effect<void, E, Self>",
})

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedLayerRefStage: {
        stage: Stage,
    },
    SelectedLayerRefBuildCase: {
        buildCase: BuildCase,
    },
    SelectedLayerRefAccessCase: {
        accessCase: AccessCase,
    },
    SelectedLayerRefInvalidateCase: {
        invalidateCase: InvalidateCase,
    },
    SelectedLayerRefServiceCase: {
        serviceCase: ServiceCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Build",
    buildCase: "Lazy",
    accessCase: "Layer",
    invalidateCase: "Invalidate",
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

type InvalidateCasePayload = Readonly<{
    invalidateCase: InvalidateCase
}>

type ServiceCasePayload = Readonly<{
    serviceCase: ServiceCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedLayerRefStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedLayerRefBuildCase: ({ buildCase }: BuildCasePayload) => ({
            model: modifyFields(model, {
                buildCase: () => buildCase,
            }),
        }),

        SelectedLayerRefAccessCase: ({ accessCase }: AccessCasePayload) => ({
            model: modifyFields(model, {
                accessCase: () => accessCase,
            }),
        }),

        SelectedLayerRefInvalidateCase: ({
            invalidateCase,
        }: InvalidateCasePayload) => ({
            model: modifyFields(model, {
                invalidateCase: () => invalidateCase,
            }),
        }),

        SelectedLayerRefServiceCase: ({ serviceCase }: ServiceCasePayload) => ({
            model: modifyFields(model, {
                serviceCase: () => serviceCase,
            }),
        }),
    })
