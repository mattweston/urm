# RcRef

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/RcRef

Targeted against Effect API reference **4.0.0-rc.116**.

The current RcRef API reference exposes **5 public exports**:

- `RcRef` interface
- `RcRef` namespace
- `make`
- `get`
- `invalidate`

## Files

- `rc-ref.ts` — real RcRef programs plus the pure Foldkit teaching model,
  messages, update, and UI snapshots.
- `rc-ref.view.ts` — interactive teaching view.

## Intended location

```text
packages/features/src/learn/_rc-ref/
├── README.md
├── rc-ref.ts
└── rc-ref.view.ts
```

No GitHub files, parent routers, parent models, or parent message unions are
modified by this artifact.

## Core idea

`RcRef<A, E>` owns **one resource identity at a time**.

It combines:

```text
lazy acquisition
+ reference counting
+ caller Scope finalizers
+ optional idle retention
+ explicit invalidation
```

The lifecycle is:

```text
RcRef.make
    ↓
no resource yet

first get
    ↓
acquire resource
    ↓
refCount = 1

more get calls
    ↓
share same resource
    ↓
refCount increases

borrower scopes close
    ↓
refCount decreases

refCount = 0
    ↓
idleTimeToLive policy
```

## `make`

```ts
const ref =
    yield* RcRef.make({
        acquire:
            Effect.acquireRelease(
                openConnection,
                closeConnection
            )
    })
```

`make` creates the owner of the lifecycle but does not eagerly acquire the
resource.

The signature is conceptually:

```ts
make<A, E, R>(options: {
    acquire: Effect.Effect<A, E, R>
    idleTimeToLive?: Duration.Input
}): Effect.Effect<RcRef<A, E>, never, R | Scope>
```

The RcRef itself therefore belongs to an owning `Scope`.

## `get`

```ts
const resource =
    yield* RcRef.get(ref)
```

returns:

```text
Effect<A, E, Scope>
```

That `Scope` requirement is central.

Every call to `get`:

1. ensures a current resource exists,
2. increments its reference count,
3. registers a release finalizer in the caller's current Scope,
4. returns the shared resource.

When that caller Scope closes, its reference is released automatically.

## Sharing

Two gets inside one active Scope normally share one acquired resource:

```ts
const first =
    yield* RcRef.get(ref)

const second =
    yield* RcRef.get(ref)

first === second
// true
```

RcRef is useful for things such as:

```text
database connections
authenticated clients
long-lived sessions
resource handles
service clients
```

where several scoped operations should temporarily share the same underlying
instance.

## Default release behavior

Without `idleTimeToLive`, the final released reference closes the current
resource immediately.

So this:

```ts
const first =
    yield* Effect.scoped(
        RcRef.get(ref)
    )

const second =
    yield* Effect.scoped(
        RcRef.get(ref)
    )
```

can acquire twice, because the first inner scope is already closed before the
second borrow begins.

## `idleTimeToLive`

A positive TTL keeps a zero-reference resource warm:

```ts
const ref =
    yield* RcRef.make({
        acquire:
            acquireConnection,
        idleTimeToLive:
            "1 minute"
    })
```

Then two separate borrowing scopes inside that idle window can reuse the same
resource.

This is useful when repeatedly acquiring the underlying resource is expensive
and short gaps between borrowers are expected.

The idle retention is a lifecycle optimization, not general mutable caching.

## `invalidate`

```ts
yield* RcRef.invalidate(ref)
```

forces a later `get` to acquire a fresh resource.

The important semantic detail is:

```text
invalidate != revoke active borrowers
```

An already-active scope that borrowed the old resource may keep using it until
that scope closes.

Future borrowing moves to a newly acquired resource.

That means an invalidation transition can temporarily look like:

```text
old resource
    retained by existing borrowers

new resource
    used by future borrowers
```

The old instance finalizes after its remaining references are released.

## RcRef versus Ref

`Ref<A>` is mutable state.

Typical question:

```text
what value is stored now?
```

`RcRef<A, E>` is scoped resource ownership.

Typical question:

```text
how many scoped users currently retain this resource,
and when may it safely be finalized?
```

Use `Ref` for atomically updated state.

Use `RcRef` for acquired resources with cleanup.

## RcRef versus ScopedRef

A `ScopedRef` is centered on replacing one scoped value and finalizing the old
one as the ref changes.

RcRef is centered on **borrowing** one scoped value with reference counting.

The practical distinction is:

```text
ScopedRef
    replace the owned resource

RcRef
    share / retain / release the owned resource
```

RcRef also adds the idle TTL and invalidation lifecycle around borrower counts.

## RcRef versus RcMap

`RcRef` has one logical resource slot:

```text
RcRef<A, E>
```

`RcMap` generalizes the idea across keys:

```text
K → resource A
```

Use RcRef when callers all want the same shared resource identity.

Use RcMap when callers select a resource by tenant, host, document, workspace,
or another key.

## Foldkit boundary

RcRef itself is runtime state and should normally stay outside the pure Foldkit
Model.

A typical architecture is:

```text
Foldkit Message
    expresses intent

runtime Effect
    RcRef.get(ref)
    use resource inside Scope

operation result
    ↓
Foldkit Message

pure update
    changes Model
```

Do not put borrowed resource handles or RcRef internals into the pure UI model.

## Integration expectation

To integrate this child feature manually, follow the same pattern used by the
neighboring learn demos:

1. add `Demo.Model` to the parent learn model,
2. include `Demo.Message` in the parent message union,
3. initialize `Demo.init`,
4. delegate child messages to `Demo.update`,
5. render `Demo.view(...)` for the RcRef route.

This download intentionally performs none of those edits.
