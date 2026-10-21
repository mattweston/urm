import { Effect, Exit, Match as M, Schema as S, Scope } from "effect"
import type { Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { evo } from "foldkit/struct"

// These effects are not run by the teaching UI. They are compiled examples of
// the real Effect APIs that the visual state machine below explains.
export const Connection = Effect.acquireRelease(
    Effect.succeed({ name: "database connection" } as const),
    (_connection, _exit) => Effect.succeed(undefined)
)

// Connection requires Scope; scopedConnection no longer does.
export const scopedConnection = Effect.scoped(Connection)

export const finalizerOrderExample = Effect.gen(function* () {
    const scope = yield* Scope.make()
    yield* Scope.addFinalizer(scope, Effect.succeed(undefined))
    yield* Scope.addFinalizer(scope, Effect.succeed(undefined))
    yield* Scope.addFinalizer(scope, Effect.succeed(undefined))
    yield* Scope.close(scope, Exit.void)
})

const scopedTask = Effect.addFinalizer(() => Effect.succeed(undefined))

export const manualScopeExample = Effect.gen(function* () {
    const scope1 = yield* Scope.make()
    const scope2 = yield* Scope.make()

    // Effect 4 calls this Scope.provide. The v3 Scope guide used Scope.extend
    // for the same idea: run scoped work inside a caller-owned scope without
    // automatically closing that scope when the work finishes.
    yield* scopedTask.pipe(Scope.provide(scope1))
    yield* scopedTask.pipe(Scope.provide(scope2))

    yield* Scope.close(scope1, Exit.void)
    yield* Scope.close(scope2, Exit.void)
})

export const Stage = S.Union([
    S.Literal("Lifetime"),
    S.Literal("Finalizers"),
    S.Literal("AcquireRelease"),
    S.Literal("ManualScopes"),
])
export type Stage = typeof Stage.Type
export const stages: ReadonlyArray<Stage> = [
    "Lifetime",
    "Finalizers",
    "AcquireRelease",
    "ManualScopes",
]

export const ResourceState = S.Union([
    S.Literal("idle"),
    S.Literal("open"),
    S.Literal("closed"),
])
export type ResourceState = typeof ResourceState.Type

export const ExitStatus = S.Union([S.Literal("Success"), S.Literal("Failure")])
export type ExitStatus = typeof ExitStatus.Type

export const ScopeState = S.Union([S.Literal("open"), S.Literal("closed")])
export type ScopeState = typeof ScopeState.Type

export const LifetimeModel = S.Struct({
    state: ResourceState,
    log: S.Array(S.String),
})
export type LifetimeModel = typeof LifetimeModel.Type

export const FinalizersModel = S.Struct({
    registered: S.Array(S.String),
    log: S.Array(S.String),
    is_closed: S.Boolean,
})
export type FinalizersModel = typeof FinalizersModel.Type

export const AcquireReleaseModel = S.Struct({
    exit: ExitStatus,
    log: S.Array(S.String),
    has_run: S.Boolean,
})
export type AcquireReleaseModel = typeof AcquireReleaseModel.Type

export const ManualScopesModel = S.Struct({
    scope_1: ScopeState,
    scope_2: ScopeState,
    has_started: S.Boolean,
    log: S.Array(S.String),
})
export type ManualScopesModel = typeof ManualScopesModel.Type

export const Model = S.Struct({
    stage: Stage,
    lifetime: LifetimeModel,
    finalizers: FinalizersModel,
    acquire_release: AcquireReleaseModel,
    manual_scopes: ManualScopesModel,
})
export type Model = typeof Model.Type

export const SelectedScopeStage = taggedStruct("SelectedScopeStage", {
    stage: Stage,
})
export const ClickedScopeLifetimeAcquire = taggedStruct(
    "ClickedScopeLifetimeAcquire"
)
export const ClickedScopeLifetimeUse = taggedStruct("ClickedScopeLifetimeUse")
export const ClickedScopeLifetimeClose = taggedStruct(
    "ClickedScopeLifetimeClose"
)
export const ClickedScopeLifetimeReset = taggedStruct(
    "ClickedScopeLifetimeReset"
)
export const ClickedRegisterScopeFinalizer = taggedStruct(
    "ClickedRegisterScopeFinalizer",
    {
        name: S.String,
    }
)
export const ClickedCloseFinalizerScope = taggedStruct(
    "ClickedCloseFinalizerScope"
)
export const ClickedResetScopeFinalizers = taggedStruct(
    "ClickedResetScopeFinalizers"
)
export const SelectedScopeExit = taggedStruct("SelectedScopeExit", {
    exit: ExitStatus,
})
export const ClickedRunAcquireRelease = taggedStruct("ClickedRunAcquireRelease")
export const ClickedResetAcquireRelease = taggedStruct(
    "ClickedResetAcquireRelease"
)
export const ScopeNumber = S.Union([S.Literal(1), S.Literal(2)])
export const ClickedStartManualScopes = taggedStruct("ClickedStartManualScopes")
export const ClickedCloseManualScope = taggedStruct("ClickedCloseManualScope", {
    scope: ScopeNumber,
})
export const ClickedManualScopeOtherWork = taggedStruct(
    "ClickedManualScopeOtherWork"
)
export const ClickedResetManualScopes = taggedStruct("ClickedResetManualScopes")

export const Message = S.Union([
    SelectedScopeStage,
    ClickedScopeLifetimeAcquire,
    ClickedScopeLifetimeUse,
    ClickedScopeLifetimeClose,
    ClickedScopeLifetimeReset,
    ClickedRegisterScopeFinalizer,
    ClickedCloseFinalizerScope,
    ClickedResetScopeFinalizers,
    SelectedScopeExit,
    ClickedRunAcquireRelease,
    ClickedResetAcquireRelease,
    ClickedStartManualScopes,
    ClickedCloseManualScope,
    ClickedManualScopeOtherWork,
    ClickedResetManualScopes,
])
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Lifetime",
    lifetime: LifetimeModel.make({ state: "idle", log: [] }),
    finalizers: FinalizersModel.make({
        registered: [],
        log: [],
        is_closed: false,
    }),
    acquire_release: AcquireReleaseModel.make({
        exit: "Success",
        log: [],
        has_run: false,
    }),
    manual_scopes: ManualScopesModel.make({
        scope_1: "open",
        scope_2: "open",
        has_started: false,
        log: [],
    }),
})

type UpdateReturn = Update.Return<Model, Message>

const append = <A>(values: ReadonlyArray<A>, value: A): ReadonlyArray<A> => [
    ...values,
    value,
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedScopeStage: ({ stage }) => ({
                model: evo(model, { stage: () => stage }),
                commands: [],
            }),
            ClickedScopeLifetimeAcquire: () => ({
                model:
                    model.lifetime.state === "idle"
                        ? evo(model, {
                              lifetime: (lifetime) => ({
                                  state: "open",
                                  log: append(
                                      lifetime.log,
                                      "acquire · connection opened"
                                  ),
                              }),
                          })
                        : model,
                commands: [],
            }),
            ClickedScopeLifetimeUse: () => ({
                model:
                    model.lifetime.state === "open"
                        ? evo(model, {
                              lifetime: (lifetime) => ({
                                  ...lifetime,
                                  log: append(
                                      lifetime.log,
                                      "use · SELECT * FROM users"
                                  ),
                              }),
                          })
                        : model,
                commands: [],
            }),
            ClickedScopeLifetimeClose: () => ({
                model:
                    model.lifetime.state === "open"
                        ? evo(model, {
                              lifetime: (lifetime) => ({
                                  state: "closed",
                                  log: append(
                                      lifetime.log,
                                      "release · connection closed"
                                  ),
                              }),
                          })
                        : model,
                commands: [],
            }),
            ClickedScopeLifetimeReset: () => ({
                model: evo(model, {
                    lifetime: () => ({ state: "idle", log: [] }),
                }),
                commands: [],
            }),
            ClickedRegisterScopeFinalizer: ({ name }) => ({
                model:
                    model.finalizers.is_closed ||
                    model.finalizers.registered.includes(name)
                        ? model
                        : evo(model, {
                              finalizers: (finalizers) => ({
                                  ...finalizers,
                                  registered: append(
                                      finalizers.registered,
                                      name
                                  ),
                                  log: append(
                                      finalizers.log,
                                      `register · ${name}`
                                  ),
                              }),
                          }),
                commands: [],
            }),
            ClickedCloseFinalizerScope: () => {
                if (model.finalizers.is_closed) return { model, commands: [] }
                const releases = [...model.finalizers.registered]
                    .reverse()
                    .map((name) => `finalize · ${name}`)
                return {
                    model: evo(model, {
                        finalizers: (finalizers) => ({
                            ...finalizers,
                            is_closed: true,
                            log: [
                                ...finalizers.log,
                                "close scope",
                                ...releases,
                            ],
                        }),
                    }),
                    commands: [],
                }
            },
            ClickedResetScopeFinalizers: () => ({
                model: evo(model, {
                    finalizers: () => ({
                        registered: [],
                        log: [],
                        is_closed: false,
                    }),
                }),
                commands: [],
            }),
            SelectedScopeExit: ({ exit }) => ({
                model: evo(model, {
                    acquire_release: (acquire_release) => ({
                        ...acquire_release,
                        exit,
                        log: [],
                        has_run: false,
                    }),
                }),
                commands: [],
            }),
            ClickedRunAcquireRelease: () => ({
                model: evo(model, {
                    acquire_release: (acquire_release) => ({
                        ...acquire_release,
                        has_run: true,
                        log: [
                            "acquire · file handle opened",
                            "use · read contents",
                            acquire_release.exit === "Success"
                                ? "program · success"
                                : "program · failure",
                            `release · file handle closed (${acquire_release.exit})`,
                        ],
                    }),
                }),
                commands: [],
            }),
            ClickedResetAcquireRelease: () => ({
                model: evo(model, {
                    acquire_release: (acquire_release) => ({
                        ...acquire_release,
                        log: [],
                        has_run: false,
                    }),
                }),
                commands: [],
            }),
            ClickedStartManualScopes: () => ({
                model: evo(model, {
                    manual_scopes: () => ({
                        scope_1: "open",
                        scope_2: "open",
                        has_started: true,
                        log: [
                            "task 1 · finalizer registered in scope 1",
                            "task 2 · finalizer registered in scope 2",
                        ],
                    }),
                }),
                commands: [],
            }),
            ClickedCloseManualScope: ({ scope }) => {
                const manual = model.manual_scopes
                if (!manual.has_started) return { model, commands: [] }
                if (scope === 1 && manual.scope_1 === "open") {
                    return {
                        model: evo(model, {
                            manual_scopes: (manual_scopes) => ({
                                ...manual_scopes,
                                scope_1: "closed",
                                log: append(
                                    manual_scopes.log,
                                    "scope 1 closed · finalizer after task 1"
                                ),
                            }),
                        }),
                        commands: [],
                    }
                }
                if (scope === 2 && manual.scope_2 === "open") {
                    return {
                        model: evo(model, {
                            manual_scopes: (manual_scopes) => ({
                                ...manual_scopes,
                                scope_2: "closed",
                                log: append(
                                    manual_scopes.log,
                                    "scope 2 closed · finalizer after task 2"
                                ),
                            }),
                        }),
                        commands: [],
                    }
                }
                return { model, commands: [] }
            },
            ClickedManualScopeOtherWork: () => ({
                model: model.manual_scopes.has_started
                    ? evo(model, {
                          manual_scopes: (manual_scopes) => ({
                              ...manual_scopes,
                              log: append(
                                  manual_scopes.log,
                                  "doing something else"
                              ),
                          }),
                      })
                    : model,
                commands: [],
            }),
            ClickedResetManualScopes: () => ({
                model: evo(model, {
                    manual_scopes: () => ({
                        scope_1: "open",
                        scope_2: "open",
                        has_started: false,
                        log: [],
                    }),
                }),
                commands: [],
            }),
        })
    )
