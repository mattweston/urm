import { Context, Effect, Layer, Match as M, Schema as S } from "effect"
import type { Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 Layer examples
// -----------------------------------------------------------------------------

export class Config extends Context.Service<
    Config,
    {
        readonly dbUrl: string
    }
>()("learn/Layer/Config") {}

export class Logger extends Context.Service<
    Logger,
    {
        readonly log: (message: string) => Effect.Effect<void>
    }
>()("learn/Layer/Logger") {}

export class Database extends Context.Service<
    Database,
    {
        readonly query: (sql: string) => Effect.Effect<string>
    }
>()("learn/Layer/Database") {}

export class UserService extends Context.Service<
    UserService,
    {
        readonly getUser: (
            id: string
        ) => Effect.Effect<Readonly<{ id: string; name: string }>>
    }
>()("learn/Layer/UserService") {}

// Layer.succeed: the service value already exists.
export const ConfigLive = Layer.succeed(Config, {
    dbUrl: "postgres://localhost/app",
})

export const LoggerLive = Layer.succeed(Logger, {
    log: (message) => Effect.log(`[app] ${message}`),
})

// Layer.effect: construction itself can be effectful and can require services.
// DatabaseLive provides Database, cannot fail, and requires Config.
export const DatabaseLive = Layer.effect(
    Database,
    Effect.gen(function* () {
        const config = yield* Config

        yield* Effect.log(`connecting to ${config.dbUrl}`)

        return {
            query: (sql: string) =>
                Effect.succeed(`result from ${config.dbUrl}: ${sql}`),
        }
    })
)

// Feed Config into DatabaseLive. Config becomes private to this composition.
export const DatabaseReady = DatabaseLive.pipe(Layer.provide(ConfigLive))

// Merge independent outputs into one dependency Layer.
export const AppDependencies = Layer.mergeAll(DatabaseReady, LoggerLive)

// UserService requires both Database and Logger.
export const UserServiceLive = Layer.effect(
    UserService,
    Effect.gen(function* () {
        const database = yield* Database
        const logger = yield* Logger

        return {
            getUser: (id: string) =>
                Effect.gen(function* () {
                    yield* logger.log(`loading user ${id}`)
                    const name = yield* database.query(
                        `select name from users where id = ${id}`
                    )
                    return { id, name }
                }),
        }
    })
)

// Layer.provide satisfies dependencies but only keeps UserService in ROut.
export const UserServiceReady = UserServiceLive.pipe(
    Layer.provide(AppDependencies)
)

// Layer.provideMerge also keeps Database + Logger in ROut.
export const UserServiceWithDependencies = UserServiceLive.pipe(
    Layer.provideMerge(AppDependencies)
)

export const useUserService = UserService.use((users) =>
    users.getUser("42")
).pipe(Effect.provide(UserServiceReady))

// Layer.effect runs its Effect inside the Layer scope. That means scoped
// acquisition can be expressed with Effect.acquireRelease.
export class Connection extends Context.Service<
    Connection,
    {
        readonly id: string
    }
>()("learn/Layer/Connection") {}

export const ConnectionLive = Layer.effect(
    Connection,
    Effect.acquireRelease(
        Effect.gen(function* () {
            yield* Effect.log("acquire connection")
            return { id: "connection-1" }
        }),
        () => Effect.log("release connection")
    )
)

export class LeftConnectionId extends Context.Service<
    LeftConnectionId,
    string
>()("learn/Layer/LeftConnectionId") {}

export class RightConnectionId extends Context.Service<
    RightConnectionId,
    string
>()("learn/Layer/RightConnectionId") {}

export const LeftConsumer = Layer.effect(
    LeftConnectionId,
    Connection.use((connection) => Effect.succeed(connection.id))
)

export const RightConsumer = Layer.effect(
    RightConnectionId,
    Connection.use((connection) => Effect.succeed(connection.id))
)

// Reusing the same Layer instance shares its memoized acquisition in a scope.
export const SharedConsumers = Layer.merge(
    LeftConsumer.pipe(Layer.provide(ConnectionLive)),
    RightConsumer.pipe(Layer.provide(ConnectionLive))
)

// Layer.fresh deliberately bypasses the normal Layer memoization.
export const FreshConnection = Layer.fresh(ConnectionLive)

export const FreshConsumers = Layer.merge(
    LeftConsumer.pipe(Layer.provide(FreshConnection)),
    RightConsumer.pipe(Layer.provide(FreshConnection))
)

// -----------------------------------------------------------------------------
// Visual teaching model
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Construct"),
    S.Literal("Merge"),
    S.Literal("Provide"),
    S.Literal("Lifetime"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Construct",
    "Merge",
    "Provide",
    "Lifetime",
]

export const ConstructorKind = S.Union([
    S.Literal("Succeed"),
    S.Literal("Effect"),
])
export type ConstructorKind = typeof ConstructorKind.Type

export const ProvideMode = S.Union([
    S.Literal("Provide"),
    S.Literal("ProvideMerge"),
])
export type ProvideMode = typeof ProvideMode.Type

export const LifetimeMode = S.Union([S.Literal("Memoized"), S.Literal("Fresh")])
export type LifetimeMode = typeof LifetimeMode.Type

export const Model = S.Struct({
    stage: Stage,

    constructor_kind: ConstructorKind,
    constructor_built: S.Boolean,
    constructor_log: S.Array(S.String),

    merge_built: S.Boolean,

    provide_mode: ProvideMode,
    provide_built: S.Boolean,

    lifetime_mode: LifetimeMode,
    lifetime_scope_open: S.Boolean,
    lifetime_acquires: S.Number,
    lifetime_releases: S.Number,
    lifetime_log: S.Array(S.String),
})
export type Model = typeof Model.Type

export const SelectedLayerStage = taggedStruct("SelectedLayerStage", {
    stage: Stage,
})

export const SelectedLayerConstructorKind = taggedStruct(
    "SelectedLayerConstructorKind",
    { kind: ConstructorKind }
)
export const ClickedBuildLayerConstructor = taggedStruct(
    "ClickedBuildLayerConstructor"
)
export const ClickedResetLayerConstructor = taggedStruct(
    "ClickedResetLayerConstructor"
)

export const ClickedBuildMergedLayer = taggedStruct("ClickedBuildMergedLayer")
export const ClickedResetMergedLayer = taggedStruct("ClickedResetMergedLayer")

export const SelectedLayerProvideMode = taggedStruct(
    "SelectedLayerProvideMode",
    { mode: ProvideMode }
)
export const ClickedBuildProvidedLayer = taggedStruct(
    "ClickedBuildProvidedLayer"
)
export const ClickedResetProvidedLayer = taggedStruct(
    "ClickedResetProvidedLayer"
)

export const SelectedLayerLifetimeMode = taggedStruct(
    "SelectedLayerLifetimeMode",
    { mode: LifetimeMode }
)
export const ClickedOpenLayerScope = taggedStruct("ClickedOpenLayerScope")
export const ClickedCloseLayerScope = taggedStruct("ClickedCloseLayerScope")
export const ClickedResetLayerLifetime = taggedStruct(
    "ClickedResetLayerLifetime"
)

export const Message = S.Union([
    SelectedLayerStage,

    SelectedLayerConstructorKind,
    ClickedBuildLayerConstructor,
    ClickedResetLayerConstructor,

    ClickedBuildMergedLayer,
    ClickedResetMergedLayer,

    SelectedLayerProvideMode,
    ClickedBuildProvidedLayer,
    ClickedResetProvidedLayer,

    SelectedLayerLifetimeMode,
    ClickedOpenLayerScope,
    ClickedCloseLayerScope,
    ClickedResetLayerLifetime,
])
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Construct",

    constructor_kind: "Effect",
    constructor_built: false,
    constructor_log: [],

    merge_built: false,

    provide_mode: "Provide",
    provide_built: false,

    lifetime_mode: "Memoized",
    lifetime_scope_open: false,
    lifetime_acquires: 0,
    lifetime_releases: 0,
    lifetime_log: [],
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedLayerStage: ({ stage }) => ({
                model: modifyFields(model, { stage: () => stage }),
                commands: [],
            }),

            SelectedLayerConstructorKind: ({ kind }) => ({
                model: modifyFields(model, {
                    constructor_kind: () => kind,
                    constructor_built: () => false,
                    constructor_log: () => [],
                }),
                commands: [],
            }),

            ClickedBuildLayerConstructor: () => ({
                model: modifyFields(model, {
                    constructor_built: () => true,
                    constructor_log: () =>
                        model.constructor_kind === "Succeed"
                            ? [
                                  "Layer.succeed → service value already exists",
                                  "Context now contains Config",
                              ]
                            : [
                                  "Layer.effect → constructor Effect runs",
                                  "Config requirement read",
                                  "Database service added to Context",
                              ],
                }),
                commands: [],
            }),

            ClickedResetLayerConstructor: () => ({
                model: modifyFields(model, {
                    constructor_built: () => false,
                    constructor_log: () => [],
                }),
                commands: [],
            }),

            ClickedBuildMergedLayer: () => ({
                model: modifyFields(model, { merge_built: () => true }),
                commands: [],
            }),

            ClickedResetMergedLayer: () => ({
                model: modifyFields(model, { merge_built: () => false }),
                commands: [],
            }),

            SelectedLayerProvideMode: ({ mode }) => ({
                model: modifyFields(model, {
                    provide_mode: () => mode,
                    provide_built: () => false,
                }),
                commands: [],
            }),

            ClickedBuildProvidedLayer: () => ({
                model: modifyFields(model, { provide_built: () => true }),
                commands: [],
            }),

            ClickedResetProvidedLayer: () => ({
                model: modifyFields(model, { provide_built: () => false }),
                commands: [],
            }),

            SelectedLayerLifetimeMode: ({ mode }) => ({
                model: modifyFields(model, {
                    lifetime_mode: () => mode,
                    lifetime_scope_open: () => false,
                    lifetime_acquires: () => 0,
                    lifetime_releases: () => 0,
                    lifetime_log: () => [],
                }),
                commands: [],
            }),

            ClickedOpenLayerScope: () => {
                const acquires = model.lifetime_mode === "Memoized" ? 1 : 2

                return {
                    model: modifyFields(model, {
                        lifetime_scope_open: () => true,
                        lifetime_acquires: () => acquires,
                        lifetime_releases: () => 0,
                        lifetime_log: () =>
                            model.lifetime_mode === "Memoized"
                                ? [
                                      "scope opened",
                                      "ConnectionLive acquired once",
                                      "left consumer reused connection-1",
                                      "right consumer reused connection-1",
                                  ]
                                : [
                                      "scope opened",
                                      "fresh connection acquired for left",
                                      "fresh connection acquired for right",
                                      "two independent resources are alive",
                                  ],
                    }),
                    commands: [],
                }
            },

            ClickedCloseLayerScope: () => {
                if (!model.lifetime_scope_open) {
                    return { model, commands: [] }
                }

                return {
                    model: modifyFields(model, {
                        lifetime_scope_open: () => false,
                        lifetime_releases: () => model.lifetime_acquires,
                        lifetime_log: (log) => [
                            ...log,
                            "scope closed",
                            ...Array.from(
                                {
                                    length: model.lifetime_acquires,
                                },
                                (_, index) => `release connection-${index + 1}`
                            ),
                        ],
                    }),
                    commands: [],
                }
            },

            ClickedResetLayerLifetime: () => ({
                model: modifyFields(model, {
                    lifetime_scope_open: () => false,
                    lifetime_acquires: () => 0,
                    lifetime_releases: () => 0,
                    lifetime_log: () => [],
                }),
                commands: [],
            }),
        })
    )

export const provided_outputs = (model: Model): ReadonlyArray<string> =>
    model.provide_mode === "Provide"
        ? ["UserService"]
        : ["UserService", "Database", "Logger"]

export const lifetime_connection_ids = (
    model: Model
): Readonly<{
    left: string
    right: string
}> =>
    model.lifetime_mode === "Memoized"
        ? {
              left: "connection-1",
              right: "connection-1",
          }
        : {
              left: "connection-1",
              right: "connection-2",
          }
