# FiberHandle

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/FiberHandle

The current API page is Effect `4.0.0-rc.116` and documents 15 exports. The
implementation was also checked against the current
`packages/effect/src/FiberHandle.ts`.

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`.

## Files

- `fiber-handle.ts` — real scoped FiberHandle operations and deterministic
  snapshots.
- `fiber-handle.view.ts` — interactive visual demo.
- `fiber-handle-preview.png` — static preview of the default Manage stage.

## Intended location

```text
packages/features/src/learn/fiber-handle/
├── fiber-handle.ts
└── fiber-handle.view.ts
```

No parent router/model/message/update files are modified.

## Teaching stages

### 1. Manage

Shows the basic lifecycle:

```text
make
  ↓
empty handle
  ↓
run(Effect.never)
  ↓
Some(fiber)
  ↓
clear
  ↓
fiber interrupted + handle empty
```

The demo uses both:

```ts
FiberHandle.getUnsafe(handle)
```

and:

```ts
yield* FiberHandle.get(handle)
```

plus:

```ts
FiberHandle.isFiberHandle(handle)
```

A `FiberHandle` is scoped. When its owning Scope closes, the handle moves to
`Closed` and the currently managed fiber is interrupted.

A managed fiber also removes itself automatically when it completes.

### 2. Replace

The default policy is replacement:

```ts
yield* FiberHandle.run(
    handle,
    nextEffect
)
```

When another fiber is already managed, the old fiber is interrupted and the new
one becomes current.

With:

```ts
{
    onlyIfMissing: true
}
```

the policy reverses:

```text
existing fiber stays
incoming fiber is interrupted
```

This same policy exists on `set` / `setUnsafe`.

Passing the exact same Fiber to `setUnsafe` is a no-op.

### 3. Wait

This stage deliberately separates two APIs that sound similar.

#### `awaitEmpty`

```ts
yield* FiberHandle.awaitEmpty(
    handle
)
```

waits for the current managed fiber to complete.

A normal successful completion removes that fiber from the handle, so the
handle becomes empty.

#### `join`

```ts
yield* FiberHandle.join(
    handle
)
```

is not ordinary `Fiber.join`.

It waits on the handle's failure / closure signal.

A successful managed fiber merely disappears from the handle.

A non-ignored managed-fiber failure completes the handle's Deferred with that
failure, causing `join` to fail.

### 4. Runtime

Covers all four imperative-boundary helpers:

```ts
FiberHandle.makeRuntime
FiberHandle.makeRuntimePromise
FiberHandle.runtime
FiberHandle.runtimePromise
```

`makeRuntime` creates a handle and returns a synchronous forking function.

`runtime(handle)` captures the current Context for an existing handle.

The Promise variants expose the same mechanism to Promise-based code.

Promise success resolves with `A`; failure rejects with the squashed Cause.

All variants still obey:

- at most one managed fiber
- default replacement
- `onlyIfMissing`
- scope ownership

## Current public surface

### Constructors

- `make`
- `makeRuntime`
- `makeRuntimePromise`

### Combinators

- `awaitEmpty`
- `clear`
- `get`
- `getUnsafe`
- `join`
- `run`
- `runtime`
- `runtimePromise`
- `set`
- `setUnsafe`

### Guards

- `isFiberHandle`

### Models

- `FiberHandle`

## Failure and interruption behavior

`FiberHandle` uses an internal interruption ID when it replaces or clears a
managed fiber.

By default, interruption-only exits are not propagated through `join`.

The `propagateInterruption` option can make non-internal interruption visible as
a handle failure while still ignoring the handle's own internal replacement
interruption.

This is why replacement does not normally make the parent workflow fail.

## Type discipline

The generated demo has no explicit `any` annotations.

Every `Message.match` payload is explicitly typed, and the UI's Button callback
attributes are derived from `HtmlBuilder` rather than left contextually
untyped.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `FiberHandleDemo.Message` to the parent Message union,
3. initialize `FiberHandleDemo.init`,
4. delegate child messages to `FiberHandleDemo.update`,
5. render `FiberHandleDemo.view(...)` from the FiberHandle route.

This artifact intentionally performs none of those edits.
