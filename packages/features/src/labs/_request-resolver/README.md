# RequestResolver

Standalone Foldkit teaching demo for:

https://effect.website/docs/v4/api/effect/RequestResolver

The live API reference currently displays Effect `4.0.0-rc.116` and lists
**21 exports**. The URM workspace catalog pins Effect `4.0.0-rc.112`. The demo
uses the current public API as the teaching target and cross-checks behavior
against the vendored Effect source under `.context/effect`.

## Files

- `request-resolver.ts` — real Effect examples, Schema model, messages, update,
  and visual teaching snapshots.
- `request-resolver.view.ts` — interactive Foldkit view.

## Intended location

```text
packages/features/src/labs/_request-resolver/
├── README.md
├── request-resolver.ts
└── request-resolver.view.ts
```

No parent router, model, message, update, export map, scaffold file, or Git file
is changed by this artifact.

## Mental model

`Request` and `RequestResolver` have deliberately different jobs:

```text
Request
    typed description of what a fiber needs

Effect.request
    submits that description

RequestResolver
    controls collection / grouping / backend execution

Request.Entry
    pending request + context + completion hook

resolver run
    must complete every accepted Entry
```

A resolver is not merely a function from request to result. It also carries the
batching protocol:

```text
delay
batchKey(entry)
preCheck(entry)?
collectWhile(entries)
runAll(nonEmptyEntries, key)
```

## Teaching stages

### 1. Build

Choose the smallest constructor that matches the backend.

#### `fromFunction`

One pure result per entry:

```ts
RequestResolver.fromFunction<GetUser>(
    (entry) =>
        `user:${entry.request.id}`
)
```

Use when the lookup is synchronous and cannot fail with the request error.

#### `fromFunctionBatched`

One pure batch function:

```ts
RequestResolver.fromFunctionBatched<GetUser>(
    (entries) =>
        entries.map(
            (entry) =>
                `user:${entry.request.id}`
        )
)
```

The results must correspond to the entries by position.

#### `fromEffect`

One effect per request entry:

```ts
RequestResolver.fromEffect<GetUser>(
    (entry) =>
        loadUser(entry.request.id)
)
```

This is useful for effectful per-request work that does not need backend batch
loading.

#### `fromEffectTagged`

Dispatch a tagged request union to tag-specific batch handlers:

```ts
RequestResolver
    .fromEffectTagged<GetUser | GetPost>()({
        GetUser: loadUsers,
        GetPost: loadPosts,
    })
```

Each handler receives the entries for its request tag and returns corresponding
results.

#### `make`

`make` exposes the non-empty collected batch directly. Your `runAll` must
complete every entry.

#### `makeGrouped`

`makeGrouped` is the constructor form for a resolver whose batches are separated
by a calculated key. The key participates in Effect equality semantics.

#### `makeWith`

The low-level constructor exposes all collection primitives:

```text
batchKey
preCheck
collectWhile
delay
runAll
```

The important `preCheck` rule is:

```text
true
    entry proceeds into batching

false
    entry does not reach runAll
    therefore some other path must complete it
```

#### `never`

`RequestResolver.never` is typed for impossible requests. If an actual request
is sent to it, the request waits forever unless interrupted.

## 2. Batch

### `grouped`

Transforms an existing resolver so entries with different keys are collected
into different batches.

Typical keys include:

```text
tenant
region
shard
table
backend partition
```

### `batchN`

Caps each batch size.

Current v4 behavior also normalizes bad limits so every batch remains non-empty:
finite fractional values are floored, while `NaN` and non-positive values act as
`1`.

### `setDelay`

Replaces the resolver's collection delay with a duration.

### `setDelayEffect`

Replaces it with an arbitrary `Effect<void>`.

These APIs change when the current batch is released; they do not change the
request success/error contract.

## 3. Decorate

### `around`

Runs a `before` effect, then the resolver, then `after` with the value produced
by `before`.

Good uses include:

```text
metrics
batch-scoped logging
resource accounting
setup / cleanup
```

### `race`

Sends the batch to both resolvers and uses the first resolver to finish. The
losing resolver run is interrupted.

This should only be used when starting both backends is acceptable.

### `withSpan`

Adds a tracing span around resolver execution. It also adds request parent-span
links and a `batchSize` attribute.

### `isRequestResolver`

Runtime guard for unknown values.

The guard checks Effect's RequestResolver marker rather than only checking for a
`runAll`-shaped object.

## 4. Cache

### `withCache`

Creates a bounded in-memory caching resolver while callers continue to use
`Effect.request`.

Options:

```text
capacity
strategy = "lru" | "fifo"
```

It has no time-based expiry. The current v4 docs specify that completed
successes and non-interruption failures are cacheable; results containing
interruptions are not cached.

### `asCache`

Exposes a first-class `Cache` instead of another resolver.

It adds:

```text
optional timeToLive
requireServicesAt = "lookup" | "construction"
Cache refresh / invalidation / inspection APIs
```

The request value is the cache key.

### `persisted`

Wraps a resolver with a persistence store for `Persistable` requests.

Construction requires:

```text
Persistence.Persistence
Scope
```

The request error type must allow persistence/schema failures. Options include:

```text
storeId
timeToLive
staleWhileRevalidate
```

Stale-while-revalidate can return the stored result immediately while also
running the resolver so the refreshed result is written back.

## Equality is part of cache correctness

Both in-memory cache paths key by the request value.

If two request values are considered equal but could produce different backend
results, the cache boundary is wrong. Every field that affects backend identity
must participate in request equality.

## Public surface

The current API page lists **21 exports**.

### Caching

- `asCache`
- `persisted`
- `withCache`

### Combinators

- `around`
- `batchN`
- `grouped`
- `race`
- `withSpan`

### Constructors

- `fromEffect`
- `fromEffectTagged`
- `fromFunction`
- `fromFunctionBatched`
- `make`
- `makeGrouped`
- `makeWith`
- `never`

### Delays

- `setDelay`
- `setDelayEffect`

### Guard

- `isRequestResolver`

### Models / namespace

- `RequestResolver` interface
- `RequestResolver` namespace / variance helper

That accounts for all **21** current exports.

## Foldkit boundary

Keep actual resolver objects out of the serializable Foldkit Model.

A useful architecture is:

```text
Foldkit Model / Message / update
    pure UI state and user intent

command / runtime integration
    Effect.request
    RequestResolver
    cache / persistence
    backend Effects
```

This demo therefore stores only teaching-stage and scenario names in its
Foldkit Model. The real resolver values stay at module/runtime scope.

## Type discipline

The generated demo has no explicit `any` annotations.

The upstream Effect implementation itself uses internal generic casts in some
resolver plumbing. That is separate from the generated artifact constraint.

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
than replacing a full workspace typecheck.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/labs/*` demos:

1. add the child Model to the parent learn Model,
2. add `RequestResolverDemo.Message` to the parent Message union,
3. initialize `RequestResolverDemo.init`,
4. delegate child messages to `RequestResolverDemo.update`,
5. render `RequestResolverDemo.view(...)` from the RequestResolver route.

This artifact intentionally performs none of those edits.
