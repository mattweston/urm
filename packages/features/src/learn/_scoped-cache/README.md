# ScopedCache

Standalone FoldKit teaching demo for:

https://effect.website/docs/v4/api/effect/ScopedCache

The current Effect v4 API reference displays `4.0.0-rc.116` and reports **18
exports**. The URM workspace pins Effect `4.0.0-rc.112`. The vendored
`.context/effect/packages/effect/src/ScopedCache.ts` matches the upstream
`rc.112` source for this module, and the public export names are unchanged in
`rc.116`.

## Files

- `scoped-cache.ts` — real Effect programs, Schema model, messages, pure update,
  and teaching snapshots.
- `scoped-cache.view.ts` — interactive FoldKit view.
- `scoped-cache-preview.png` — static preview of the initial Acquire / FixedTTL
  state.

## Intended location

```text
packages/features/src/learn/_scoped-cache/
├── README.md
├── scoped-cache.ts
└── scoped-cache.view.ts
```

The existing `_scoped-cache` git scaffold is intentionally left untouched. No
router, parent model, export map, package source, or repository file is changed
by this artifact.

## What ScopedCache is for

`ScopedCache<Key, A, E, R>` is a cache for values whose lookup may acquire
scoped resources.

The important extra guarantee over an ordinary value cache is ownership:

```text
outer cache Scope
    ├── entry Scope for key A
    │     └── resources acquired by lookup(A)
    ├── entry Scope for key B
    │     └── resources acquired by lookup(B)
    └── ...
```

Removing an entry closes its entry Scope. Closing the outer cache Scope closes
all remaining entry Scopes.

That makes ScopedCache appropriate for cached connections, clients,
subscriptions, file handles, or any other value that must remain alive while it
is cached and must be finalized when it leaves the cache.

## Public surface

The current page reports 18 exports.

### Models

- `ScopedCache`
- `State`
- `Entry`

### Constructors

- `make`
- `makeWith`

### Cache operations

- `get`
- `getOption`
- `getSuccess`
- `set`
- `has`
- `refresh`
- `invalidate`
- `invalidateWhen`
- `invalidateAll`
- `size`
- `keys`
- `values`
- `entries`

## 1. Acquire

### `make`

Use `make` when every lookup exit should have one fixed TTL.

```ts
import { Effect, ScopedCache } from "effect"

const program = Effect.scoped(
    Effect.gen(function* () {
        const cache = yield* ScopedCache.make({
            capacity: 32,
            timeToLive: "5 minutes",
            lookup: (key: string) => loadScopedValue(key),
        })

        return yield* ScopedCache.get(cache, "account:42")
    })
)
```

The cache constructor itself requires a `Scope`. Every missing lookup then gets
its own child entry Scope.

### `makeWith`

`makeWith` computes TTL from the final lookup `Exit` and key:

```ts
const cache = yield* ScopedCache.makeWith({
    capacity: 32,
    lookup,
    timeToLive: (exit, key) =>
        key.startsWith("hot:") ? "5 seconds" : "1 minute",
})
```

Because the callback receives `Exit<A, E>`, successful and failed lookups can
have different cache lifetimes.

### `requireServicesAt`

The lookup may require services beyond `Scope`.

`requireServicesAt` chooses where those requirements live:

```text
construction / default
    provide lookup services when constructing the cache
    later get/refresh calls do not require them

lookup
    construct with only Scope
    get/refresh require the lookup services at call time
```

Use lookup-time services when the current caller context should matter. Use
construction-time capture when the cache should run against one stable service
environment for its lifetime.

## 2. Reuse

### `get`

`get` is the normal read path.

```ts
const value = yield* ScopedCache.get(cache, key)
```

If the key has an unexpired entry, `get` reuses it. If not, it creates an entry
and runs the lookup.

A hit refreshes access order by removing and reinserting the entry. Capacity
therefore behaves as LRU-style access-order eviction.

### Same-key in-flight coalescing

The entry is inserted before its lookup completes and contains a shared
`Deferred`.

So concurrent misses for one key behave like:

```text
caller A ─┐
          ├─ one lookup(key) ─ Deferred ─ result
caller B ─┘
```

Both callers await the same lookup instead of starting duplicate resource
acquisitions.

### Failures are cached too

The cache stores lookup exits, not only successful values.

If lookup fails and its TTL has not expired, a later `get` for that key fails
with the cached error instead of rerunning lookup.

This makes failure TTL an important policy decision for transient errors.

### `getOption`

```ts
const value = yield* ScopedCache.getOption(cache, key)
```

`getOption` does **not** start lookup for an absent or expired key.

It returns:

```text
None
    key absent or expired

Some(value)
    cached lookup succeeds

Effect failure
    cached lookup exists but failed
```

If an entry is already in flight, `getOption` can wait for that existing
Deferred.

### `getSuccess`

`getSuccess` is a stricter observation API.

It returns `Some` only when the entry is already completed successfully.

It returns `None` for:

- absent entries
- expired entries
- pending lookups
- failed lookups

It does not start or await a lookup.

### `has`

`has` checks for an unexpired entry without starting lookup.

Unlike `get`, it does not refresh access order.

## 3. Refresh

### `refresh`

`refresh` always runs lookup again, even when a valid entry already exists.

```ts
const value = yield* ScopedCache.refresh(cache, key)
```

The replacement lookup receives a new entry Scope. Once its exit is installed,
the previous entry Scope is closed.

### Important: failed refresh replaces the previous result

This differs from the `Resource` module.

With `ScopedCache`:

```text
cached success
    ↓
refresh lookup fails
    ↓
refresh returns failure
    ↓
failed Exit becomes the cache entry
    ↓
subsequent get fails from cache
```

So `ScopedCache.refresh` is not a stale-on-error operation.

If last-known-good behavior is required, implement that policy above the cache
instead of assuming refresh preserves the previous success.

### `set`

`set` installs an already-available successful value without running lookup.

```ts
yield* ScopedCache.set(cache, key, value)
```

It:

- closes an existing entry Scope for the key
- stores a completed successful entry
- computes TTL as if lookup returned `Exit.succeed(value)`
- performs capacity eviction if required

Use it for priming, write-through synchronization, or externally obtained
successful values.

### Expiry is lazy

TTL records an `expiresAt` timestamp. ScopedCache does not need a timer fiber per
entry.

Expired entries are removed when cache operations encounter them. Removing the
entry also closes its Scope.

A later `get` then starts a fresh lookup.

## 4. Release

### `invalidate`

```ts
yield* ScopedCache.invalidate(cache, key)
```

Invalidation removes the entry and closes its Scope. If the key is absent, it is
a no-op.

If the cache itself is already closed, operational APIs interrupt.

### `invalidateWhen`

```ts
const removed = yield* ScopedCache.invalidateWhen(
    cache,
    key,
    (value) => value.isStale
)
```

It removes only a successful cached value that matches the predicate.

It returns `false` for absent, expired, failed, or non-matching entries.

### `invalidateAll`

`invalidateAll` clears the cache and closes all current entry Scopes.

This keeps the outer cache alive so it can be used again afterward.

Closing the **outer owning Scope** is different: it marks the cache `Closed` and
finalizes all remaining entries.

### Capacity eviction

The internal map preserves access order.

Example with capacity `2`:

```text
get(a)   order: a
get(b)   order: a, b
get(a)   order: b, a
get(c)   evict b → order: a, c
```

Eviction immediately closes the displaced entry Scope.

Capacity is therefore also a resource-lifetime budget, not only a memory-size
setting.

## Inspection APIs

### `keys`

Returns active unexpired keys.

While scanning, expired entries are removed and their Scopes are closed.

### `values`

Returns only successful, active values.

Failed and expired entries are omitted.

### `entries`

Returns only successful, active `[key, value]` pairs.

Like `keys`, it cleans up expired entries while scanning.

### `size`

`size` is intentionally approximate.

It reports how many entries are currently stored in the internal map, including
expired entries that have not yet been encountered and cleaned up.

So:

```text
size(cache)
    ≠ guaranteed count of currently valid values
```

Use `keys` / `entries` when active-state inspection matters.

## State and Entry

`State` is:

```text
Open
    map: MutableHashMap<Key, Entry<A, E>>

Closed
```

An `Entry` contains:

```text
deferred: shared lookup result
scope:    resources owned by this cached entry
expiresAt: optional millisecond deadline
```

These are low-level lifecycle models. Most application code should use the
constructor and combinator functions rather than mutate them.

## FoldKit boundary

Do not put a live `ScopedCache` into a Schema-backed FoldKit `Model`.

The cache contains mutable runtime state, Deferred values, Scopes, Effects, and
resource ownership.

A useful split is:

```text
runtime / service layer
    ScopedCache
    Effect programs
    resource acquisition + finalization

FoldKit Model
    selected stage
    selected example
    plain values required by the view
```

The generated demo follows this rule: all live ScopedCache programs are module
values; the UI model contains only serializable stage/case selections.

## rc.112 → rc.116

The public ScopedCache surface is unchanged: both versions expose the same 18
names used by this lesson.

The `rc.116` source does contain internal lifecycle hardening compared with the
workspace's `rc.112`, including changes around conditional invalidation,
refresh/capacity sequencing, and detaching entries before running
`invalidateAll` finalizers. Those are implementation details rather than new
public APIs, so this lesson teaches the stable public contract and remains
runnable against the workspace pin.

## Validation

The standalone source check used:

```text
tsc --noEmit --noResolve --allowImportingTsExtensions \
    --target ES2022 --module ESNext --moduleResolution bundler \
    --skipLibCheck --noImplicitAny \
    scoped-cache.ts scoped-cache.view.ts
```

With workspace packages intentionally unresolved, the only diagnostics are the
expected missing-module errors for:

- `effect`
- `foldkit`
- `foldkit/message`
- `foldkit/struct`
- `@foldkit/ui`
- `foldkit/html`

There are no additional TypeScript diagnostics and no explicit `any`
annotations in the generated TypeScript files.
