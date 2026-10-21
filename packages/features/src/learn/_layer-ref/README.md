# LayerRef

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/LayerRef

The current Effect source package is `4.0.0-rc.116`.

The current `packages/effect/src/LayerRef.ts` public top-level surface contains:

- `LayerRef`
- `make`
- `TagClass`
- `Service`

The implementation was also checked against:

```text
packages/effect/src/RcRef.ts
packages/effect/test/LayerRef.test.ts
```

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `layer-ref.ts` — real scoped LayerRef construction, lazy/preloaded acquisition,
  direct Context access, invalidate / refresh behavior, and a Service wrapper.
- `layer-ref.view.ts` — interactive visual demo.
- `layer-ref-preview.png` — static preview of the default Build stage.

## Intended location

```text
packages/features/src/learn/layer-ref/
├── layer-ref.ts
└── layer-ref.view.ts
```

No parent router/model/message/update files are modified.

## Core idea

`LayerRef<I, E>` is a refreshable reference to **one Layer-built Context**.

Conceptually:

```text
Layer<I, E, R>
      ↓ build
Context<I>
      ↓
RcRef cache
      ↓ borrow
get / contextEffect
```

It is the unkeyed counterpart to the previous `LayerMap` module.

`LayerMap` answers:

> Which cached Layer resource belongs to this key?

`LayerRef` answers:

> What is the current cached generation of this one Layer resource?

That makes LayerRef useful for:

```text
reloadable configuration
refreshable database / HTTP clients
test service swaps
credentials that must be rebuilt
periodically refreshed resources
```

## 1. Build

### `LayerRef.make`

The constructor accepts a Layer:

```ts
const ref =
    yield* LayerRef.make(
        connectionLayer
    )
```

and returns a scoped `LayerRef`.

The underlying Layer is **lazy by default**.

Merely constructing the LayerRef does not build the Layer.

The current test suite verifies that no acquisition happens before the first
`contextEffect` / `get` use.

### `idleTimeToLive`

`make` accepts:

```ts
{
    idleTimeToLive:
        Duration.Input
}
```

The underlying `RcRef` uses this to decide what happens after the last active
borrow is released.

Conceptually:

```text
last borrower closes
      ↓
idleTimeToLive omitted
      → close resource

finite idleTimeToLive
      → keep resource warm temporarily

infinite idleTimeToLive
      → keep idle resource until invalidation / owner shutdown
```

This allows a costly Layer-built resource to remain cached between bursts of
activity.

### `preload`

Pass:

```ts
{
    preload: true
}
```

to acquire during `LayerRef.make`.

That changes the constructor error channel because Layer errors may now happen
during creation.

The current LayerRef tests verify that `preload: true` acquires immediately and
that the first later borrow reuses that same cached generation.

### `invalidationSchedule`

`make` also accepts:

```ts
{
    invalidationSchedule:
        Schedule.Schedule<...>
}
```

The schedule periodically acts on the cached reference.

There is an important option interaction.

With:

```text
preload = false
```

scheduled ticks call:

```text
invalidate
```

so the resource is rebuilt only when a later user needs it.

With:

```text
preload = true
```

scheduled ticks call:

```text
refresh
```

so invalidation is immediately followed by reacquisition.

This makes LayerRef a v4 replacement pattern for reloadable services.

## Layer memoization

`LayerRef.make` captures the current `Layer.CurrentMemoMap` when the reference is
created.

Every later rebuild of the wrapped Layer uses that memo map.

This allows the LayerRef's Layer to continue participating in the same dependency
memoization environment instead of rebuilding dependencies from an unrelated
memoization graph.

## 2. Access

A LayerRef exposes two public access surfaces.

### `get`

```ts
ref.get
```

is:

```text
Layer<I, E>
```

Use it when the cached services should be provided to another Effect:

```ts
const result =
    yield* program.pipe(
        Effect.provide(
            ref.get
        )
    )
```

`get` itself is backed by the same `RcRef` as `contextEffect`.

### `contextEffect`

```ts
ref.contextEffect
```

has the shape:

```text
Effect<
    Context<I>,
    E,
    Scope
>
```

It directly acquires the cached service Context.

The caller's Scope retains that cached generation.

For example:

```ts
const context =
    yield* ref.contextEffect

const connection =
    Context.get(
        context,
        Connection
    )
```

## `rcRef`

The public model exposes:

```ts
readonly rcRef:
    RcRef<
        Context<I>,
        E
    >
```

This makes the cache mechanism explicit.

LayerRef delegates acquisition, reference counting, idle retention, invalidation,
and resource cleanup to the underlying `RcRef`.

## Reference counting

Every `RcRef.get` / LayerRef access increments the reference count for the
requesting Scope.

When that Scope closes, its reference is released.

This prevents a shared resource from being finalized while another active Scope
still depends on the same cached Context.

## Shared generation

Overlapping borrowers share one cached generation.

For a warm cached entry:

```text
borrow A ─┐
          ├─ same Context generation
borrow B ─┘
```

The resource remains valid until all relevant borrows are released, subject to
idle retention / invalidation behavior.

The real `lazy_program` in `layer-ref.ts` records acquisition state before and
after the first `contextEffect` to demonstrate the lazy boundary.

## 3. Invalidate

### `invalidate`

```ts
yield* ref.invalidate
```

marks the current cached generation as no longer reusable.

The next normal access acquires a new generation.

The current Effect test suite verifies:

```text
acquire generation 1
reuse generation 1
invalidate
acquire generation 2
```

when an idle TTL keeps generation 1 cached before invalidation.

### Active borrowers survive invalidation

Invalidation does **not** revoke contexts already borrowed by active Scopes.

If a Scope currently owns generation 1:

```text
Scope A → generation 1
```

and another fiber invalidates the LayerRef:

```text
future cache → no longer generation 1
```

Scope A can continue using generation 1 until Scope A closes.

Later borrowers will acquire / observe the replacement generation.

This is critical for resource safety: invalidation changes future cache
selection rather than destroying an object out from under active users.

## `refresh`

```ts
yield* ref.refresh
```

is stronger than `invalidate`.

Its implementation is conceptually:

```ts
yield* invalidate
yield* Effect.scoped(
    RcRef.get(
        ref.rcRef
    )
)
```

followed by discarding the acquired value.

So:

```text
invalidate
    next user rebuilds

refresh
    rebuild now
```

The new generation is cached according to the normal RcRef lifecycle.

The exported `refresh_program` constructs a preloaded reference, calls `refresh`,
and then observes the newly acquired generation.

## Invalidate versus refresh

A concise decision rule:

Use:

```text
invalidate
```

when:

> The current cached value is stale; rebuild only if / when somebody needs it.

Use:

```text
refresh
```

when:

> The current cached value is stale and I want a fresh generation acquired now.

## Cleanup after invalidation

The underlying RcRef behavior distinguishes future cache visibility from active
resource lifetime.

If an invalidated generation has no active borrowers, cleanup can happen
immediately.

If it still has active references, it remains alive for those references and is
closed after they release it.

This mirrors the lifecycle guarantees seen in LayerMap.

## 4. Service

`LayerRef.Service` wraps a LayerRef as a Context service.

The demo defines:

```ts
class ConnectionRef
    extends LayerRef.Service<
        ConnectionRef
    >()(
        "LayerRefDemo/ConnectionRef",
        {
            layer:
                connectionLayer,
            idleTimeToLive:
                "30 seconds",
            preload: true
        }
    )
{}
```

The generated service class carries the LayerRef plus convenience helpers.

## Generated static helpers

`TagClass` exposes:

```text
layer
layerNoDeps
get
contextEffect
invalidate
refresh
```

### `get`

The service-level:

```text
get
```

is:

```text
Layer<I, E, Self>
```

It provides the wrapped Layer's services while requiring the LayerRef service
class.

### `contextEffect`

The service-level context accessor has:

```text
Effect<
    Context<I>,
    E,
    Scope | Self
>
```

### `invalidate`

The service-level invalidation helper requires only the service itself:

```text
Effect<void, never, Self>
```

### `refresh`

The service-level refresh helper preserves the wrapped Layer's error channel:

```text
Effect<void, E, Self>
```

because reacquiring the new generation may fail.

## `layer` versus `layerNoDeps`

Service options may contain:

```ts
dependencies:
    ReadonlyArray<
        Layer.Layer<...>
    >
```

`layerNoDeps` constructs the LayerRef service without supplying them.

`layer` provides those declared dependencies to the LayerRef construction
Layer.

Conceptually:

```text
layerNoDeps
    construct LayerRef service
    dependencies remain required

layer
    declared dependencies supplied
    construct LayerRef service
```

## `TagClass`

`TagClass` is the public type for the class returned by `LayerRef.Service`.

It combines:

```text
Context.ServiceClass<Self, Id, LayerRef<I, E>>
+
default layers
+
static access / lifecycle helpers
```

Unlike LayerMap, LayerRef's `Service` namespace does not expose separate
`Key` / `Layers` extraction utilities because there is no keyed family—the
wrapper owns one Layer.

## Current public module surface

### Models

- `LayerRef`
- `TagClass`

### Constructors

- `make`

### Services

- `Service`

The operational API (`get`, `contextEffect`, `invalidate`, `refresh`, `rcRef`)
lives on the `LayerRef` model itself rather than as separate top-level functions.

## LayerRef versus LayerMap

### LayerRef

```text
one Layer
one cached Context generation
invalidate / refresh that one resource
```

### LayerMap

```text
key → Layer
many independently cached Context entries
invalidate one key at a time
```

Choose LayerRef when the identity is simply:

```text
the current shared resource
```

Choose LayerMap when resource identity depends on:

```text
tenant
region
database name
environment
other runtime key
```

## LayerRef versus ordinary Layer memoization

Normal Layer memoization reuses a Layer build within a memo-map context.

LayerRef adds a deliberate runtime lifecycle around one build:

```text
lazy acquisition
reference-counted borrowing
idle retention
explicit invalidation
explicit refresh
scheduled invalidation / refresh
```

It is therefore useful when the service generation itself changes over the
lifetime of an application.

## Type discipline

The generated demo has no explicit `any` annotations.

All resource callbacks, acquire / release callbacks, service callbacks, message
payloads, and UI callbacks that could lose contextual typing have explicit
types.

Button attributes are derived from `HtmlBuilder`.

The upstream Effect implementation uses internal generic `any` machinery in
places; that is separate from the generated artifact constraint.

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
resolved, so this check catches local syntax and implicit-any problems rather
than replacing a full typecheck inside the target monorepo.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `LayerRefDemo.Message` to the parent Message union,
3. initialize `LayerRefDemo.init`,
4. delegate child messages to `LayerRefDemo.update`,
5. render `LayerRefDemo.view(...)` from the LayerRef route.

This artifact intentionally performs none of those edits.
