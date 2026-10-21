import { Context, Effect, Layer, ManagedRuntime, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// DOMAIN SERVICES
// -----------------------------------------------------------------------------

export type GreetingApi = Readonly<{
    greet: (name: string) => string
}>

export const Greeting = Context.Service<GreetingApi>(
    "ManagedRuntimeDemo/Greeting"
)

export const greeting_layer: Layer.Layer<typeof Greeting> = Layer.succeed(
    Greeting
)({
    greet: (name: string): string => `Hello, ${name}!`,
})

export const greeting_program = (
    name: string
): Effect.Effect<string, never, typeof Greeting> =>
    Greeting.use((service: GreetingApi) => Effect.succeed(service.greet(name)))

// -----------------------------------------------------------------------------
// REAL MANAGED-RUNTIME EXAMPLES
// -----------------------------------------------------------------------------

export const make_greeting_runtime = (): ManagedRuntime.ManagedRuntime<
    typeof Greeting,
    never
> => ManagedRuntime.make(greeting_layer)

export const run_twice = async (
    name: string
): Promise<
    Readonly<{
        first: string
        second: string
        guard: boolean
    }>
> => {
    const runtime = make_greeting_runtime()

    try {
        const first = await runtime.runPromise(greeting_program(name))

        const second = await runtime.runPromise(greeting_program(name))

        return {
            first,
            second,
            guard: ManagedRuntime.isManagedRuntime(runtime),
        }
    } finally {
        await runtime.dispose()
    }
}

export const context_example = async (name: string): Promise<string> => {
    const runtime = make_greeting_runtime()

    try {
        const context = await runtime.context()

        const service = Context.get(context, Greeting)

        return service.greet(name)
    } finally {
        await runtime.dispose()
    }
}

export const dispose_effect_program: Effect.Effect<void> = Effect.gen(
    function* () {
        const runtime = ManagedRuntime.make(greeting_layer)

        yield* Effect.promise(() =>
            runtime.runPromise(greeting_program("Effect"))
        )

        yield* runtime.disposeEffect
    }
)

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Build"),
    S.Literal("Run"),
    S.Literal("Cache"),
    S.Literal("Dispose"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = ["Build", "Run", "Cache", "Dispose"]

export const BuildCase = S.Union([
    S.Literal("Make"),
    S.Literal("Context"),
    S.Literal("Types"),
])
export type BuildCase = typeof BuildCase.Type

export const RunCase = S.Union([
    S.Literal("Promise"),
    S.Literal("Sync"),
    S.Literal("FiberCallback"),
])
export type RunCase = typeof RunCase.Type

export const CacheCase = S.Union([
    S.Literal("Lazy"),
    S.Literal("Reuse"),
    S.Literal("MemoMap"),
])
export type CacheCase = typeof CacheCase.Type

export const DisposeCase = S.Union([
    S.Literal("Promise"),
    S.Literal("Effect"),
    S.Literal("AsyncDispose"),
])
export type DisposeCase = typeof DisposeCase.Type

export const Model = S.Struct({
    stage: Stage,
    buildCase: BuildCase,
    runCase: RunCase,
    cacheCase: CacheCase,
    disposeCase: DisposeCase,
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
        eyebrow: "Layer → reusable runtime",
        title: "Create one runtime from a Layer and build its service Context lazily",
        description:
            "ManagedRuntime.make owns a Scope and MemoMap for the Layer. The Layer is not built at construction time; contextEffect, context(), or the first run method triggers the build and caches the resulting Context. In Foldkit, this is distinct from Runtime.makeApplication / Runtime.run, which own the application update-render lifecycle.",
        code: `const runtime =
    ManagedRuntime.make(
        appLayer
    )

// Layer has not been built yet.

const context =
    await runtime.context()
// first build occurs here

ManagedRuntime
    .isManagedRuntime(
        runtime
    )
// true

await runtime.dispose()`,
        apis: [
            "ManagedRuntime.ManagedRuntime",
            "ManagedRuntime.make",
            "ManagedRuntime.isManagedRuntime",
            "ManagedRuntime.ManagedRuntime.Services",
            "ManagedRuntime.ManagedRuntime.Error",
        ],
        notice: "Effect ManagedRuntime and Foldkit Runtime solve different problems: ManagedRuntime reuses Layer-built Effect services; Foldkit Runtime owns Model/init/update/view execution and DOM integration. isManagedRuntime itself checks only the Effect module marker.",
    },

    Run: {
        eyebrow: "imperative entry points",
        title: "Run effects repeatedly from Promise, synchronous, callback, or Fiber boundaries",
        description:
            "A ManagedRuntime supplies the Layer's services to every effect it runs. Promise and sync runners mirror Effect.run* forms, runCallback bridges callback-style APIs, and runFork returns a running Fiber tracked by the runtime Scope.",
        code: `const runtime =
    ManagedRuntime.make(
        appLayer
    )

await runtime.runPromise(
    program
)

runtime.runSync(
    syncProgram
)

const fiber =
    runtime.runFork(
        backgroundProgram
    )

runtime.runCallback(
    callbackProgram,
    {
        onExit: (
            exit
        ) => {
            // bridge to callback API
        }
    }
)

await runtime.dispose()`,
        apis: [
            "ManagedRuntime.runPromise",
            "ManagedRuntime.runPromiseExit",
            "ManagedRuntime.runSync",
            "ManagedRuntime.runSyncExit",
            "ManagedRuntime.runFork",
            "ManagedRuntime.runCallback",
        ],
        notice: "runSync throws if the effect fails or crosses an asynchronous boundary. The Exit-returning variants preserve failures as Exit values instead of throwing / rejecting.",
    },

    Cache: {
        eyebrow: "build once, run many",
        title: "Cache the built Context and optionally share Layer memoization across runtimes",
        description:
            "The first use starts one Layer build Fiber. Later runs reuse cachedContext and switch to Effect.run*With using that Context. Supplying options.memoMap lets separate ManagedRuntime values share Layer memoization.",
        code: `const runtimeA =
    ManagedRuntime.make(
        layer
    )

const runtimeB =
    ManagedRuntime.make(
        layer,
        {
            memoMap:
                runtimeA.memoMap
        }
    )

await runtimeA.runPromise(
    Effect.void
)

await runtimeB.runPromise(
    Effect.void
)

// Effect test suite verifies:
// shared Layer build count === 1`,
        apis: [
            "ManagedRuntime.contextEffect",
            "ManagedRuntime.context",
            "ManagedRuntime.memoMap",
            "ManagedRuntime.make",
        ],
        notice: "The runtime caches the Context after the Layer build succeeds. Sharing a MemoMap is a separate optimization: it can deduplicate compatible Layer builds even across different ManagedRuntime instances.",
    },

    Dispose: {
        eyebrow: "owned resource lifecycle",
        title: "Dispose the runtime to close Layer resources and interrupt tracked fibers",
        description:
            "dispose() is the Promise boundary, disposeEffect is the Effect boundary, and Symbol.asyncDispose supports await using. Disposal clears the cached Context, closes the runtime Scope, and prevents future context acquisition.",
        code: `const runtime =
    ManagedRuntime.make(
        resourceLayer
    )

await runtime.runPromise(
    program
)

await runtime.dispose()

// or inside Effect:
yield* runtime.disposeEffect

// or with modern JS:
// await using runtime =
//     ManagedRuntime.make(
//         resourceLayer
//     )`,
        apis: [
            "ManagedRuntime.dispose",
            "ManagedRuntime.disposeEffect",
            "ManagedRuntime.Symbol.asyncDispose",
        ],
        notice: "The ManagedRuntime tests verify that runFork fibers are interrupted when the runtime is disposed. Disposal is therefore the shutdown boundary for both Layer resources and fibers started through that runtime.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

export type BuildSnapshot = Readonly<{
    mode: BuildCase
    constructor: string
    layerRequirement: string
    contextEffect: string
    contextPromise: string
    guard: string
    typeHelpers: string
    foldkitBoundary: string
}>

export const build_snapshot = (model: Model): BuildSnapshot => ({
    mode: model.buildCase,
    constructor: "make(layer, { memoMap? }) → ManagedRuntime<R, ER>",
    layerRequirement: "input Layer<R, ER, never>",
    contextEffect: "Effect<Context<R>, ER>",
    contextPromise: "() → Promise<Context<R>>",
    guard: "isManagedRuntime(unknown) → type guard",
    typeHelpers: "ManagedRuntime.Services<T> · ManagedRuntime.Error<T>",
    foldkitBoundary:
        "Foldkit Runtime: app lifecycle · Effect ManagedRuntime: reusable Layer services",
})

export type RunSnapshot = Readonly<{
    mode: RunCase
    promise: string
    sync: string
    exit: string
    fork: string
    callback: string
    serviceRule: string
}>

export const run_snapshot = (model: Model): RunSnapshot => ({
    mode: model.runCase,
    promise: "runPromise: Effect<A,E,R> → Promise<A>",
    sync: "runSync: Effect<A,E,R> → A",
    exit: "runPromiseExit / runSyncExit → Exit<A, E | ER>",
    fork: "runFork → Fiber<A, E | ER>",
    callback: "runCallback → interrupt function",
    serviceRule:
        "runtime supplies R; layer-build error ER joins execution error where observable",
})

export type CacheSnapshot = Readonly<{
    mode: CacheCase
    firstUse: string
    laterUse: string
    buildFiber: string
    cachedContext: string
    sharedMemo: string
}>

export const cache_snapshot = (model: Model): CacheSnapshot => ({
    mode: model.cacheCase,
    firstUse: "contextEffect / context / run* starts the Layer build lazily",
    laterUse: "cached Context reused for subsequent run* calls",
    buildFiber: "one build Fiber is memoized inside the ManagedRuntime",
    cachedContext:
        "after success, run* switches to Effect.run*With(cachedContext)",
    sharedMemo:
        "make(layer, { memoMap }) can share Layer memoization across runtimes",
})

export type DisposeSnapshot = Readonly<{
    mode: DisposeCase
    promise: string
    effect: string
    asyncDispose: string
    afterDispose: string
    fibers: string
    guard: string
}>

export const dispose_snapshot = (model: Model): DisposeSnapshot => ({
    mode: model.disposeCase,
    promise: "dispose(): Promise<void>",
    effect: "disposeEffect: Effect<void>",
    asyncDispose: "[Symbol.asyncDispose](): Promise<void>",
    afterDispose:
        "contextEffect replaced with a defecting effect; cachedContext cleared",
    fibers: "Scope.close interrupts fibers started through runtime.runFork",
    guard: "isManagedRuntime still true after disposal",
})

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedManagedRuntimeStage: {
        stage: Stage,
    },
    SelectedManagedRuntimeBuildCase: {
        buildCase: BuildCase,
    },
    SelectedManagedRuntimeRunCase: {
        runCase: RunCase,
    },
    SelectedManagedRuntimeCacheCase: {
        cacheCase: CacheCase,
    },
    SelectedManagedRuntimeDisposeCase: {
        disposeCase: DisposeCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Build",
    buildCase: "Make",
    runCase: "Promise",
    cacheCase: "Lazy",
    disposeCase: "Promise",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type BuildCasePayload = Readonly<{
    buildCase: BuildCase
}>

type RunCasePayload = Readonly<{
    runCase: RunCase
}>

type CacheCasePayload = Readonly<{
    cacheCase: CacheCase
}>

type DisposeCasePayload = Readonly<{
    disposeCase: DisposeCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedManagedRuntimeStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedManagedRuntimeBuildCase: ({ buildCase }: BuildCasePayload) => ({
            model: evo(model, {
                buildCase: () => buildCase,
            }),
        }),

        SelectedManagedRuntimeRunCase: ({ runCase }: RunCasePayload) => ({
            model: evo(model, {
                runCase: () => runCase,
            }),
        }),

        SelectedManagedRuntimeCacheCase: ({ cacheCase }: CacheCasePayload) => ({
            model: evo(model, {
                cacheCase: () => cacheCase,
            }),
        }),

        SelectedManagedRuntimeDisposeCase: ({
            disposeCase,
        }: DisposeCasePayload) => ({
            model: evo(model, {
                disposeCase: () => disposeCase,
            }),
        }),
    })
