# ManagedRuntime

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/ManagedRuntime

The current Effect source package is `4.0.0-rc.116`.

The current `packages/effect/src/ManagedRuntime.ts` public teaching surface is:

- `ManagedRuntime`
- `ManagedRuntime.Services`
- `ManagedRuntime.Error`
- `isManagedRuntime`
- `make`

The operational runner / lifecycle methods live on the `ManagedRuntime<R, ER>`
model rather than as separate top-level functions.

The implementation and current tests were checked against:

```text
packages/effect/src/ManagedRuntime.ts
packages/effect/test/ManagedRuntime.test.ts
```

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `managed-runtime.ts` — real Context service, Layer, reusable runtime factory,
  Promise execution, direct Context access, and disposal examples.
- `managed-runtime.view.ts` — interactive visual demo.

## Intended location

```text
packages/features/src/learn/managed-runtime/
├── managed-runtime.ts
└── managed-runtime.view.ts
```

No parent router/model/message/update files are modified.

## Core idea

`ManagedRuntime` is for the edge between Effect code and a host environment that
needs imperative entry points.

Conceptually:

```text
application Layer
      ↓
ManagedRuntime.make
      ↓
lazy Context build
      ↓
cached services
      ↓
runPromise / runSync / runFork / runCallback
      ↓
many host-framework calls
      ↓
dispose
```

A normal `Effect.run*` executes one effect using the default runtime.

A `ManagedRuntime` instead lets an application prepare one reusable service
environment from a `Layer` and use that environment across many independent
entry-point calls.

This is especially useful for:

```text
HTTP framework handlers
React / UI framework callbacks
worker consumers
legacy Promise APIs
callback APIs
imperative application shells
```

where Effect is embedded inside another runtime rather than owning the entire
process entry point.

## 1. Build

### `make`

The constructor is:

```ts
const runtime =
    ManagedRuntime.make(
        applicationLayer
    )
```

Its input Layer has the shape:

```text
Layer<R, ER, never>
```

so the Layer must be self-contained at this top-level runtime boundary.

The returned value is:

```text
ManagedRuntime<R, ER>
```

where:

```text
R
    services supplied to effects run through the runtime

ER
    errors that may occur while building the Layer
```

### Lazy Layer build

`make` allocates the runtime machinery, including:

```text
Scope
MemoMap
```

but does **not** eagerly build the supplied Layer.

The first operation that needs the Context triggers the build:

```text
contextEffect
context()
runFork
runSync
runPromise
...
```

The implementation starts one build Fiber and stores it.

The current test suite verifies this with a Layer that increments a counter:

```text
make runtime
run effect
run effect again

build count = 1
```

So `ManagedRuntime` is:

```text
lazy to initialize
reusable after initialization
```

## `contextEffect`

The model exposes:

```ts
readonly contextEffect:
    Effect<
        Context<R>,
        ER
    >
```

This is the Effect-native way to get the service Context managed by the runtime.

It triggers the lazy build if necessary.

### `context()`

For Promise-based host code:

```ts
const context =
    await runtime.context()
```

returns:

```text
Promise<Context<R>>
```

If the Context was already built successfully, `context()` returns the cached
Context rather than running the build path again.

The generated `context_example` uses that API and then calls:

```ts
Context.get(
    context,
    Greeting
)
```

directly.

## `memoMap`

Each runtime exposes:

```ts
runtime.memoMap
```

The constructor may also accept:

```ts
ManagedRuntime.make(
    layer,
    {
        memoMap
    }
)
```

This allows multiple Layer builds to participate in the same Layer memoization
environment.

The current tests specifically create:

```text
runtime A
runtime B using runtimeA.memoMap
```

run both, and verify that their shared Layer builds only once.

## Type helpers

The merged `ManagedRuntime` model / namespace exposes:

```ts
ManagedRuntime.Services<T>
ManagedRuntime.Error<T>
```

These extract:

```text
services R
layer-construction error ER
```

from an existing `ManagedRuntime<R, ER>` type.

## `isManagedRuntime`

```ts
ManagedRuntime.isManagedRuntime(
    value
)
```

is a runtime guard based on the module's type marker.

It does not build the Layer or inspect its Context.

One subtle point from the source is that disposal does not remove that marker.

Therefore:

```text
isManagedRuntime(runtime) = true
```

means:

> this value has ManagedRuntime identity

not:

> this runtime has not been disposed.

## 2. Run

The ManagedRuntime model provides several execution bridges.

All take an effect that requires the runtime's service type:

```text
Effect<A, E, R>
```

and supply `R` from the cached Layer Context.

### `runPromise`

```ts
await runtime.runPromise(
    effect
)
```

returns:

```text
Promise<A>
```

and rejects on execution failure in the same broad style as Effect's ordinary
Promise runner.

Layer build errors are also observable at this boundary.

The generated `run_twice` function runs the same service-requiring program twice
through one runtime and disposes it in `finally`.

## `runPromiseExit`

```ts
runtime.runPromiseExit(
    effect
)
```

returns:

```text
Promise<
    Exit<
        A,
        E | ER
    >
>
```

This keeps failure in `Exit` instead of rejecting the Promise.

## `runSync`

```ts
runtime.runSync(
    effect
)
```

returns the success value directly:

```text
A
```

It is appropriate only when the Effect can complete synchronously.

Like `Effect.runSync`, it can throw for:

```text
failure
defect
async boundary
```

depending on execution.

## `runSyncExit`

The synchronous Exit form is:

```text
Effect<A, E, R>
    ↓
Exit<A, E | ER>
```

Use it when synchronous execution is required but failure should stay explicit
as data.

## `runFork`

```ts
const fiber =
    runtime.runFork(
        effect
    )
```

returns:

```text
Fiber<A, E | ER>
```

The source installs an `onFiberStart` hook that associates these fibers with the
runtime's Scope.

This matters during disposal.

The current tests verify that:

```text
runtime.runFork(Effect.never)
runtime.dispose()
```

leaves the Fiber interrupted.

So the ManagedRuntime owns not only the Layer resource Scope, but also the
lifecycle of fibers it starts through this runner.

## `runCallback`

`runCallback` bridges Effect into callback-style host APIs.

It accepts optional run options with:

```ts
onExit:
    (
        exit:
            Exit<
                A,
                E | ER
            >
    ) => void
```

and returns an interrupt function.

Conceptually:

```text
start Effect
    ↓
return cancellation function immediately
    ↓
deliver Exit to callback later
```

This is useful for integrations that cannot await Promises directly.

## Run options

The asynchronous / fork-style runners support `Effect.RunOptions`.

ManagedRuntime merges those options with its own runtime bookkeeping.

In particular, its internal fiber-start hook is preserved even when the caller
supplies an additional `onFiberStart` option.

## Cached fast path

Before the Layer is built, run methods effectively do:

```text
build Context
provide Context
run effect
```

After `cachedContext` exists, the implementation switches to Effect's
Context-specific runners:

```text
runForkWith
runCallbackWith
runSyncWith
runSyncExitWith
runPromiseWith
runPromiseExitWith
```

This avoids re-providing / rebuilding the Layer for each host call.

## 3. Cache

### One build Fiber

The source maintains one internal build Fiber:

```text
undefined before first use
Fiber<Context<R>, ER> after first build begins
```

All first-use access goes through that same build.

This protects concurrent first users from each independently starting the Layer
build.

## `cachedContext`

When the Layer build succeeds, the Context is stored as:

```text
cachedContext
```

Later runners use that Context directly.

This gives the central ManagedRuntime promise:

```text
build services once
run many effects
```

## MemoMap versus cached Context

These are related but different caches.

### `cachedContext`

Owned by one ManagedRuntime:

```text
this exact runtime already built its Layer
```

### `memoMap`

Layer-level memoization:

```text
this Layer graph has already built compatible memoized nodes
```

A caller can share the second mechanism across ManagedRuntime instances by
passing a common `memoMap`.

The Effect test suite verifies this cross-runtime behavior.

## Service provision

Suppose an effect requires:

```text
Greeting
```

and the runtime was built from:

```text
Layer<Greeting>
```

Then:

```ts
runtime.runPromise(
    greeting_program(
        "Ada"
    )
)
```

is accepted without locally calling:

```ts
Effect.provide(
    ...,
    greeting_layer
)
```

on each request.

That is the main ergonomic reason ManagedRuntime works well at integration
boundaries.

## 4. Dispose

A ManagedRuntime owns resources and must be shut down.

There are three public disposal surfaces.

### `dispose`

Promise / JavaScript boundary:

```ts
await runtime.dispose()
```

returns:

```text
Promise<void>
```

This is usually the right choice in a non-Effect host framework.

### `disposeEffect`

Effect-native boundary:

```ts
yield* runtime.disposeEffect
```

has the shape:

```text
Effect<void>
```

The generated `dispose_effect_program` demonstrates this form.

### `Symbol.asyncDispose`

ManagedRuntime implements:

```ts
[Symbol.asyncDispose]()
```

so modern JavaScript / TypeScript can use the `await using` pattern where
supported.

The current Effect tests verify this disposal integration and check that Layer
finalizers run when the block exits.

## What disposal does

The source's `disposeEffect` performs three important changes.

### 1. Disable future Context acquisition

`contextEffect` is replaced with an Effect that dies with:

```text
ManagedRuntime disposed
```

### 2. Clear the fast-path Context

```text
cachedContext = undefined
```

### 3. Close the runtime Scope

Closing the Scope releases:

```text
Layer-acquired resources
tracked fibers
other Scope finalizers
```

The test suite specifically verifies Fiber interruption.

## Do not reuse after dispose

The public constructor documentation explicitly warns that a ManagedRuntime
cannot be reused after disposal.

Treat disposal as the final lifecycle boundary:

```text
make
 ↓
run many
 ↓
dispose
 ↓
finished
```

not as a temporary reset operation.

## `isManagedRuntime` after disposal

Because the guard checks the type marker and disposal does not remove that
marker:

```ts
ManagedRuntime.isManagedRuntime(
    disposedRuntime
)
```

still identifies the value as a ManagedRuntime.

That is why the demo describes it as an identity guard rather than a liveness
check.

## Foldkit Runtime integration

The Foldkit runtime documentation uses the word **Runtime** for a different
layer of the application.

A normal Foldkit app keeps pure application definitions in:

```text
src/main.ts
```

including:

```text
Model
Messages
update
init
view
```

and keeps runtime side effects in:

```text
src/entry.ts
```

where it creates the application with:

```ts
Runtime.makeApplication({
    Model,
    init,
    update,
    view,
    container
})
```

and starts it with:

```ts
Runtime.run(
    application
)
```

That Foldkit runtime owns the update / render lifecycle for the app.

Effect `ManagedRuntime` solves a different problem:

```text
Foldkit Runtime
    owns Model → Message → update → view → DOM lifecycle

Effect ManagedRuntime
    owns one Layer-built service environment for repeated Effect execution
```

They can therefore complement one another.

For example, a Foldkit `entry.ts` can construct long-lived Effect services with
`ManagedRuntime.make(...)` for imperative integration boundaries, while the
Foldkit runtime continues to own the application model and rendering loop.

Foldkit also distinguishes three host modes:

```text
Runtime.makeApplication
    app owns the page and may own routing

Runtime.makeElement
    app is scoped to a container and does not own document metadata / URL

Runtime.embed
    host application starts an embedded Foldkit runtime,
    exchanges values through Schema-typed Ports,
    and disposes the returned handle
```

This makes the lifecycle correspondence useful:

```text
host / entry starts
    ↓
construct Effect ManagedRuntime if needed
    ↓
construct + run Foldkit Runtime
    ↓
application runs
    ↓
host shutdown / embedded handle disposal
    ↓
dispose Effect ManagedRuntime
```

The two runtimes should not be conflated: Foldkit Runtime drives the application
architecture; ManagedRuntime is an Effect service-execution bridge.

## ManagedRuntime versus `Effect.run*`

Use ordinary:

```text
Effect.runPromise
Effect.runFork
Effect.runSync
```

when one program can supply its own environment and be run directly.

Use `ManagedRuntime` when host code repeatedly needs to run different Effects
against one Layer-built application environment.

For example:

```text
server initialized once
    ↓
runtime built once
    ↓
request 1 → runtime.runPromise(handler)
request 2 → runtime.runPromise(handler)
request 3 → runtime.runPromise(handler)
    ↓
server shutdown
    ↓
runtime.dispose()
```

## ManagedRuntime versus manually building a Context

A lower-level alternative is:

```text
build Layer into Context
use Effect.run*With(context)
manage Scope manually
```

ManagedRuntime packages those concerns together:

```text
lazy build
MemoMap
Context cache
runner methods
Fiber tracking
resource Scope
disposal
```

This is why the runtime guide recommends it for reusable top-level execution
configuration, especially when integrating Effect into another framework.

## Current public module surface

### Models

- `ManagedRuntime`

### Utility types

- `ManagedRuntime.Services`
- `ManagedRuntime.Error`

### Guards

- `isManagedRuntime`

### Constructors

- `make`

The larger operational surface lives on the `ManagedRuntime` interface:

```text
memoMap
contextEffect
context
runFork
runSyncExit
runSync
runCallback
runPromise
runPromiseExit
dispose
Symbol.asyncDispose
disposeEffect
```

The interface also exposes some implementation-oriented state such as Scope and
cached Context; application code should normally use the lifecycle / runner
methods instead.

## Type discipline

The generated demo has no explicit `any` annotations.

Every service callback, Promise helper, Message payload, and UI callback that
could lose contextual typing has an explicit type.

Button attributes are derived from `HtmlBuilder`.

The upstream Effect implementation itself uses internal generic machinery; that
is separate from the generated artifact constraint.

## Validation note

The standalone validation command is:

```text
tsc --noEmit --noResolve --allowImportingTsExtensions
    --target ES2022
    --module ESNext
    --moduleResolution bundler
    --skipLibCheck
    --noImplicitAny
```

In this environment the actual `effect`, `foldkit`, and UI packages are not
resolved, so this check catches local syntax and implicit-any issues rather than
replacing a full typecheck inside the target monorepo.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `ManagedRuntimeDemo.Message` to the parent Message union,
3. initialize `ManagedRuntimeDemo.init`,
4. delegate child messages to `ManagedRuntimeDemo.update`,
5. render `ManagedRuntimeDemo.view(...)` from the ManagedRuntime route.

This artifact intentionally performs none of those edits.
