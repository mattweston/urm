# Effect 4 Cache — Foldkit visual demo

## Mental model

`Cache<Key, A, E, R>` memoizes an effectful lookup:

```ts
(key: Key) =>
  Effect<A, E, R>
```

A `get` can therefore be:

```text
cache hit
  → reuse the stored lookup Exit

cache miss / expired
  → run lookup(key)
  → store its Exit
  → share that result with callers
```

The cache stores **both successful and failed lookup results**. A failed lookup
will fail again from the cache until its entry expires, is invalidated, or is
refreshed.

## The four sections

### 1. Lookup / hit / miss

Create a fixed-TTL cache:

```ts
const cache = yield* Cache.make<
  string,
  string
>({
  capacity: 3,
  timeToLive: "30 seconds",
  lookup: (key) =>
    Effect.succeed(`value:${key}`)
})
```

Read:

```ts
yield* Cache.get(
  cache,
  "ada"
)
```

On the first missing read, `lookup("ada")` runs.

Later reads return the cached result until it expires or is removed.

### Single-flight lookup

One of the most useful behaviours in the current Cache implementation:

```ts
Effect.all(
  [
    Cache.get(cache, "hello"),
    Cache.get(cache, "hello"),
    Cache.get(cache, "hello")
  ],
  { concurrency: "unbounded" }
)
```

for a missing key shares the **same in-flight lookup**.

The first caller creates the cache entry and lookup Fiber; the other callers
await that entry instead of starting duplicate work.

The real source example uses `Deferred` so this behaviour is explicit.

## 2. TTL

Fixed TTL:

```ts
Cache.make({
  capacity: 100,
  lookup,
  timeToLive: "30 seconds"
})
```

An expired value is treated as absent when accessed.

The next `get` invokes the lookup again and starts a new TTL.

### Dynamic TTL

Use:

```ts
Cache.makeWith(
  lookup,
  {
    capacity: 100,
    timeToLive(exit, key) {
      // return Duration.Input
    }
  }
)
```

The callback sees:

- lookup `Exit`
- cache key

so successful / failed / key-specific results can have different lifetimes.

Example:

```ts
timeToLive(exit) {
  if (
    Exit.isSuccess(exit) &&
    exit.value.active
  ) {
    return "1 minute"
  }

  return "5 seconds"
}
```

### Failed lookups have TTL too

Because Cache stores the lookup `Exit`, failures can be deliberately cached for
shorter periods to prevent repeated failing backend calls.

### `size` gotcha

```ts
yield* Cache.size(cache)
```

returns the approximate number of stored entries.

Expired entries can still count until an operation touches / enumerates them
and removes them.

`keys` / `entries` actively filter expired entries.

## 3. Capacity / eviction

A cache has a maximum capacity:

```ts
Cache.make({
  capacity: 3,
  lookup
})
```

The implementation uses its insertion-ordered map to remove older entries when
the capacity is exceeded.

A live `get` also moves the entry to the end:

```text
[a, b, c]

get(b)

[a, c, b]
```

Then:

```text
set(d)

[a, c, b, d]
```

exceeds capacity 3, so the oldest `a` is removed:

```text
[c, b, d]
```

This produces an access-sensitive / freshness-oriented eviction order.

## 4. Read and control operations

### get

```ts
Cache.get(cache, key)
```

- returns hit if live
- invokes lookup on miss / expiration
- waits for an existing pending lookup
- can fail with cached / lookup `E`

### getOption

```ts
Cache.getOption(cache, key)
```

Reads an **existing** entry without starting lookup for a missing key.

It returns:

```ts
Option.none()
```

for missing / expired.

If an entry is already pending, it waits for that in-flight computation.

If the existing lookup fails, `getOption` itself fails with the same `E`.

### getSuccess

```ts
Cache.getSuccess(cache, key)
```

Returns `Some(value)` only when there is an existing, non-expired lookup that
has **already resolved successfully**.

It returns `None` for:

- missing
- expired
- failed
- still pending

and has no error channel of its own.

### set

```ts
Cache.set(
  cache,
  key,
  value
)
```

Writes a value directly and bypasses lookup.

The cache's TTL policy is still applied to the stored success value.

### refresh

```ts
Cache.refresh(
  cache,
  key
)
```

always runs the lookup to produce a fresh value.

It can also populate a key that did not exist.

A successful refresh resets TTL.

### invalidate

```ts
Cache.invalidate(
  cache,
  key
)
```

removes one entry.

There is also conditional invalidation:

```ts
Cache.invalidateWhen(
  cache,
  key,
  (value) => ...
)
```

and full clearing:

```ts
Cache.invalidateAll(cache)
```

## Inspection

The current API also includes:

```ts
Cache.has(cache, key)
Cache.size(cache)
Cache.keys(cache)
Cache.values(cache)
Cache.entries(cache)
```

`entries` and `values` only expose successfully resolved active values; failed,
pending, and expired entries are filtered out.

## Service requirements

`Cache.make` and `makeWith` have a `requireServicesAt` option.

The default construction model captures the lookup services while the cache is
created.

Effect 4 can alternatively keep those requirements on lookup operations:

```ts
requireServicesAt: "lookup"
```

This is useful when lookup dependencies should be supplied at each use site
rather than captured at cache construction.

## Real Effect 4 APIs used

The source includes:

- `Cache.make`
- `Cache.makeWith`
- `Cache.get`
- `Cache.getOption`
- `Cache.getSuccess`
- `Cache.set`
- `Cache.has`
- `Cache.refresh`
- `Cache.invalidate`
- `Cache.size`
- `Cache.keys`
- `Deferred`
- `Effect.all`
- `Effect.forkChild`
- `Exit.isSuccess`
