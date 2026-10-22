# FiberSet

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/FiberSet

The current API page is Effect `4.0.0-rc.115` and reports 14 exports. The
implementation was also checked against the current
`packages/effect/src/FiberSet.ts`.

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `fiber-set.ts` — real scoped FiberSet operations and deterministic snapshots.
- `fiber-set.view.ts` — interactive visual demo.

## Intended location

```text
packages/features/src/learn/fiber-set/
├── fiber-set.ts
└── fiber-set.view.ts
```

No parent router/model/message/update files are modified.

## Teaching stages

### 1. Manage

Creates one scoped `FiberSet` and starts three independent `Effect.never`
fibers.

The stage demonstrates:

- `make`
- `run`
- `size`
- iteration
- `clear`
- `isFiberSet`

Unlike `FiberHandle` or a single key in `FiberMap`, a FiberSet has no replacement
identity. Every distinct managed fiber can coexist.

The sequence is:

```text
size 0
  ↓
run fiber A
run fiber B
run fiber C
  ↓
size 3
  ↓
clear
  ↓
all 3 interrupted
size 0
```

Each fiber installs a completion observer. When it completes, it removes itself
from the backing Set.

When the owning Scope closes, every still-running fiber is interrupted.

### 2. Add

Shows how to adopt fibers that were forked outside `FiberSet.run`.

Safe registration:

```ts
yield* FiberSet.add(
    set,
    fiber
)
```

Unsafe synchronous registration:

```ts
FiberSet.addUnsafe(
    set,
    fiber
)
```

The backing collection is a Set, so adding the exact same Fiber object twice
does not create a duplicate entry.

The stage also shows automatic cleanup:

```text
2 registered fibers
       ↓
fiber A completes
       ↓
size becomes 1
```

No explicit remove operation exists because completed fibers unregister
themselves.

If `addUnsafe` is called after the FiberSet is closed, the incoming fiber is
interrupted immediately.

### 3. Wait

This stage deliberately separates two APIs.

#### `awaitEmpty`

```ts
yield* FiberSet.awaitEmpty(set)
```

waits until no managed fibers remain.

The implementation repeatedly awaits a currently managed fiber until the
backing Set reaches size zero.

Normal successful completion removes each fiber and eventually lets
`awaitEmpty` return `void`.

#### `join`

```ts
yield* FiberSet.join(set)
```

listens to the FiberSet's shared failure Deferred.

A managed failure such as:

```ts
Effect.fail("boom")
```

causes `join` to fail with that typed error.

Normal successful completion does **not** complete `join`; it only removes the
finished fiber.

Interruption-only exits are ignored by default. That is why:

- `clear`
- scope shutdown
- the set's own internal interruption

do not normally propagate as parent failures.

`propagateInterruption` can opt non-internal interruption into failure
propagation.

### 4. Runtime

Covers all four runtime bridges:

```ts
FiberSet.makeRuntime
FiberSet.makeRuntimePromise
FiberSet.runtime
FiberSet.runtimePromise
```

The synchronous runtime functions can be called repeatedly:

```ts
const a =
    run(Effect.succeed(1))

const b =
    run(Effect.succeed(2))
```

Both fibers can coexist because FiberSet is a fan-out collection rather than a
replacement container.

`runtime(set)` captures the current Context for an existing set.

The Promise variants preserve the same set ownership model. A success resolves
with `A`; failure rejects with `Cause.squash`.

## Current public surface

### Constructors

- `make`
- `makeRuntime`
- `makeRuntimePromise`

### Combinators

- `add`
- `addUnsafe`
- `awaitEmpty`
- `clear`
- `join`
- `run`
- `runtime`
- `runtimePromise`
- `size`

### Guards

- `isFiberSet`

### Models

- `FiberSet`

## FiberHandle / FiberMap / FiberSet

These three modules model different ownership cardinalities:

```text
FiberHandle
  at most 1 fiber total

FiberMap<K>
  at most 1 fiber per key K

FiberSet
  many independent fibers, no key / replacement identity
```

Choose FiberSet when all managed fibers belong to the same lifecycle but do not
need stable keys or latest-wins replacement.

## Failure behavior

Each registered fiber gets an observer.

When a fiber fails, the observer may complete the set's failure Deferred.

By default, interruption-only failure Causes are ignored. The implementation
also uses an internal interruption ID for set-driven cancellation.

This prevents ordinary cleanup from looking like an application failure.

## Type discipline

The generated demo has no explicit `any` annotations.

Every `Message.match` destructured payload is explicitly typed, and Button
attributes are derived from `HtmlBuilder` so the demo remains clean under
`noImplicitAny`.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `FiberSetDemo.Message` to the parent Message union,
3. initialize `FiberSetDemo.init`,
4. delegate child messages to `FiberSetDemo.update`,
5. render `FiberSetDemo.view(...)` from the FiberSet route.

This artifact intentionally performs none of those edits.
