# ScopedRef

Standalone FoldKit teaching demo for:

https://effect.website/docs/v4/api/effect/ScopedRef

The current Effect v4 API reference displays `4.0.0-rc.116` and reports **6
exports**. The URM workspace pins Effect `4.0.0-rc.112`. For `ScopedRef`, the
rc.112 and rc.116 source files are byte-identical, so this lesson does not need
an API compatibility shim.

## Files

- `scoped-ref.ts` — real Effect programs, Schema model, messages, pure update,
  and visual teaching snapshots.
- `scoped-ref.view.ts` — interactive FoldKit view.
- `scoped-ref-preview.png` — static preview of the initial Create / Acquire
  state.

## Intended location

```text
packages/features/src/learn/_scoped-ref/
├── README.md
├── scoped-ref.ts
└── scoped-ref.view.ts
```

The existing `_scoped-ref` git scaffold is intentionally left untouched. No
repository file, router, export map, parent model, or git state is changed by
this artifact.

## What ScopedRef is for

`ScopedRef<A>` owns one **current value** together with the `Scope` that owns the
resources behind that value.

Conceptually:

```text
ScopedRef<A>
    current = [child Scope, A]
```

That pairing is the important difference from a plain `Ref<A>`.

Replacing the value means replacing its lifetime owner too:

```text
acquire replacement in new Scope
    ↓
close previous Scope
    ↓
install [new Scope, replacement]
```

Use this for current clients, connections, subscriptions, handles, or other
resource-backed values that need hot replacement without leaking the previous
resource.

## Public surface

The live API page reports 6 exports:

### Model

- `ScopedRef`

### Constructors

- `fromAcquire`
- `make`

### Getters

- `get`
- `getUnsafe`

### Mutation

- `set`

## 1. Create

### `fromAcquire`

Use `fromAcquire` when the initial value acquires resources:

```ts
const ref = yield* ScopedRef.fromAcquire(
    Effect.acquireRelease(
        openConnection,
        closeConnection
    )
)
```

Its shape is:

```text
Effect<A, E, R>
    ↓ fromAcquire
Effect<ScopedRef<A>, E, Scope | R>
```

The constructor creates a fresh closeable child `Scope`, provides it to the
acquisition, and stores that Scope next to the acquired value.

### Initial failure propagates

This differs from `Resource.manual`.

If initial acquisition fails:

```ts
const ref = yield* ScopedRef.fromAcquire(
    Effect.fail("offline")
)
```

then `fromAcquire` fails. It does not construct a reference containing a stored
failure.

The failed candidate Scope is closed with the acquisition failure cause.

### `make`

Use `make` when the initial value is already available and creating it does not
acquire scoped resources:

```ts
const ref = yield* ScopedRef.make(
    () => initialConfiguration
)
```

The evaluator runs when the constructor effect runs.

`make` still requires an outer `Scope`, but the lazy callback itself is not a
scoped acquisition. Do not open files, sockets, clients, subscriptions, or
other resources inside that callback and expect ScopedRef to discover their
finalizers.

## 2. Read

### `get`

```ts
const value = yield* ScopedRef.get(ref)
```

`get` returns the current `A` inside `Effect`.

It does not:

- reacquire the resource;
- replace the child Scope;
- run finalizers;
- refresh anything.

Repeated reads therefore observe the same current value until `set` succeeds.

### `getUnsafe`

```ts
const value = ScopedRef.getUnsafe(ref)
```

This directly reads the current value synchronously.

The unsafe part is the boundary: the caller bypasses `Effect`. It is not a
mutation operation.

Prefer `get` in ordinary Effect code and reserve `getUnsafe` for carefully
controlled synchronous integration points or tests.

## 3. Replace

### `set`

```ts
yield* ScopedRef.set(
    ref,
    acquireReplacement
)
```

`set` performs a full ownership transition.

On success:

```text
1. create new child Scope
2. run replacement acquisition in new Scope
3. close old child Scope
4. install [new Scope, new value]
```

This ordering means the replacement exists before the previous resource is
released.

### Failed replacement preserves the old value

If step 2 fails:

```text
new acquisition fails
    ↓
close candidate Scope with failure cause
    ↓
return failure
    ↓
old [Scope, value] remains current
```

So:

```ts
const before = yield* ScopedRef.get(ref)

const result = yield* Effect.exit(
    ScopedRef.set(ref, failingAcquire)
)

const after = yield* ScopedRef.get(ref)

// failed replacement:
// after === before
```

This is a useful stale-but-working handover property.

### Replacement is serialized

The backing state is a `SynchronizedRef` and `set` runs under its semaphore.

Conceptually:

```text
set A ─────────────┐
                   ├─ one complete acquire / close / swap transition at a time
set B ─────────────┘
```

Concurrent calls cannot interleave their lifecycle transitions.

The transition is also uninterruptible, preventing cancellation from leaving a
half-installed replacement between acquisition, old-scope cleanup, and backing
swap.

### Scope requirement is handled internally

`set` returns:

```text
Effect<void, E, Exclude<R, Scope>>
```

The replacement effect may require `Scope`, but callers do not have to provide
that Scope: `set` creates and provides its own child Scope for the candidate.

Other service requirements in `R` remain requirements of the returned Effect.

## 4. Release

### Previous resource

A successful replacement closes the old child Scope before installing the new
backing pair.

For an acquisition with finalizers:

```text
acquire:v1
acquire:v2
release:v1
current:v2
```

The old resource cannot leak beyond a successful handover.

### Current resource on outer close

Both constructors register a finalizer in their owning outer Scope.

When that outer Scope closes, the finalizer looks at the **current** backing
pair and closes its child Scope:

```text
outer Scope closes
    ↓
read current [child Scope, value]
    ↓
close current child Scope with outer Exit
```

After a successful swap:

```text
acquire:v1
acquire:v2
release:v1
release:v2   ← outer Scope closes
```

Each installed scoped resource gets one owner and one eventual release path.

## ScopedRef vs nearby primitives

### `Ref`

Use `Ref<A>` for ordinary shared mutable state that has no resource lifetime.

```text
Ref
    mutable A

ScopedRef
    mutable [Scope, A]
```

### `SynchronizedRef`

Use `SynchronizedRef` when effectful state transitions themselves need mutual
exclusion but the values do not own replaceable scopes.

`ScopedRef` uses synchronized state internally because lifecycle replacement is
itself an effectful critical section.

### `Resource`

`Resource<A, E>` stores one acquisition recipe and offers `refresh` to rerun it.
Internally it uses a `ScopedRef<Exit<A, E>>`.

Use:

```text
ScopedRef
    caller supplies the replacement Effect on every set

Resource
    constructor captures one acquisition Effect
    refresh reruns that recipe
```

### `ScopedCache`

`ScopedCache` owns many independently scoped values keyed by cache key, with
capacity, TTL, invalidation, and in-flight lookup coalescing.

Use `ScopedRef` when there is exactly one current resource-backed value.

## FoldKit boundary

The FoldKit `Model` in this demo contains only:

- current teaching stage;
- selected teaching case.

It deliberately does **not** contain `ScopedRef`, `Scope`, handles, or acquired
resources.

That keeps update pure and serializable:

```text
FoldKit Model
    UI-visible data

Effect runtime / service layer
    ScopedRef
    resource acquisition
    finalizers
    replacement effects
```

## Lesson map

### Create

- `fromAcquire`
- `make`
- backing `[Scope, value]`
- runtime/UI boundary

### Read

- `get`
- `getUnsafe`
- repeated reads
- ownership remains with ScopedRef

### Replace

- successful handover
- failed acquisition preserves old value
- serialized `set`
- replacement Scope is provided internally

### Release

- previous Scope closes on successful swap
- current Scope closes with outer lifetime
- lifecycle event order
- comparison with `Resource`

## Validation

The generated files are checked standalone with TypeScript using unresolved
workspace imports intentionally allowed as diagnostics. Any additional local
syntax or implicit-`any` errors are treated as failures.

The demo contains no explicit `any` annotations.
