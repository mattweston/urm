# Pool

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/Pool

The current Effect source package is `4.0.0-rc.116`.

The current `packages/effect/src/Pool.ts` source exposes **13 public exports**:

- `Pool`
- `Config`
- `State`
- `PoolItem`
- `Strategy`
- `isPool`
- `make`
- `makeWithTTL`
- `makeWithStrategy`
- `get`
- `use`
- `invalidate`
- `reserve`

The current implementation and tests were checked against:

```text
packages/effect/src/Pool.ts
packages/effect/test/Pool.test.ts
```

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `pool.ts` — fixed and elastic pools, scoped resource acquisition, `get`,
  `use`, TTL/custom strategies, invalidation, reservation, and public
  Config/State teaching snapshots.
- `pool.view.ts` — interactive visual demo.

## Intended location

```text
packages/features/src/learn/pool/
├── pool.ts
└── pool.view.ts
```

No parent router/model/message/update files are modified.

## Core idea

A `Pool<A, E>` shares scoped resources across fibers.

The pool owns a bounded collection of resource-backed `A` values and coordinates:

```text
acquisition
reuse
waiting
per-item concurrency
growth / shrinking
invalidation
shutdown / finalization
```

A typical resource is something expensive to establish or manage:

```text
database connection
network client
worker
browser page
native handle
session
```

The acquisition effect can itself be scoped:

```ts
const acquireConnection =
    Effect.acquireRelease(
        openConnection,
        (
            connection
        ) =>
            connection.close
    )
```

When the pool's own scope closes, all resources acquired by the pool are
released.

## 1. Build

### `Pool<A, E>`

The public model is:

```ts
Pool.Pool<
    A,
    E
>
```

where:

```text
A
    pooled item type

E
    acquisition error type
```

A pool is also `Pipeable`.

The current interface publicly exposes:

```text
config
state
```

for inspection and custom strategy support.

Normal application code should still prefer the high-level pool operations.

## `make`

```ts
const pool =
    yield* Pool.make({
        acquire:
            acquireConnection,
        size:
            2
    })
```

creates a fixed-size pool.

Internally this is equivalent to:

```text
minSize = size
maxSize = size
```

with the no-op resizing strategy.

### Scope requirement

The constructor returns an Effect requiring `Scope`.

That scope governs the lifetime of the whole pool.

When the pool scope closes:

```text
pool enters shutdown
active leases are accounted for
acquired items are finalized
waiters are released / interrupted appropriately
```

The tests explicitly verify that preallocated resources are finalized on pool
scope shutdown.

## Preallocation

For fixed pools with positive size, the implementation starts background resize
work during construction.

The current test suite verifies:

```text
Pool.make({ size: 10 })
```

eventually preallocates all ten resources.

This differs from a purely lazy pool that would only acquire the first item on
the first borrow.

## `isPool`

```ts
Pool.isPool(
    value
)
```

is the runtime guard.

It detects the internal Pool type marker and narrows an unknown value to:

```text
Pool<unknown, unknown>
```

## `Config<A, E>`

The normalized configuration contains:

```text
acquire
concurrency
isFixed
minSize
maxSize
strategy
targetUtilization
```

### `concurrency`

This is **per pooled item**, not just a global pool-wide number.

With:

```text
maxSize = 4
concurrency = 2
```

the pool can expose up to:

```text
8 simultaneous item leases
```

when four items exist and each is shared twice.

The default is:

```text
1
```

## `isFixed`

The current source records:

```text
isFixed =
    minSize === maxSize
```

Fixed pools can use simpler target-size behavior because no elastic growth /
shrink decision is required.

## `targetUtilization`

The normalized value is clamped to:

```text
0.1 … 1
```

The default is:

```text
1
```

A lower target utilization encourages the pool to create new items before every
existing item is fully saturated.

## `State<A, E>`

The runtime state currently exposes fields including:

```text
scope
isShuttingDown
usage
resizeSemaphore
items
availableHead
availableTail
invalidated
waiters
```

The available items are maintained as an internal doubly-linked list through
each `PoolItem`.

This runtime state is intentionally more implementation-oriented than the
high-level API.

## `PoolItem<A, E>`

Each acquired entry records:

```text
exit
finalizer
refCount
disableReclaim
isAvailable
availablePrevious
availableNext
release
```

The `Exit` contains either:

```text
successful A
or
acquisition E
```

and the finalizer owns the scoped cleanup for that acquisition.

`refCount` tracks how many current leases share that item.

## `Strategy<A, E>`

A custom resizing strategy provides:

```ts
run:
    (
        pool
    ) =>
        Effect<void>

onAcquire:
    (
        item
    ) =>
        Effect<void>

reclaim:
    (
        pool
    ) =>
        Effect<
            PoolItem |
            undefined
        >
```

This is intentionally a lower-level extension point.

Most applications should use either:

```text
make
or
makeWithTTL
```

rather than implementing a strategy directly.

## 2. Borrow

### `get`

```ts
const connection =
    yield* Pool.get(
        pool
    )
```

returns a scoped Effect:

```text
Effect<
    A,
    E,
    Scope
>
```

The lease lasts until the **current scope closes**.

That gives this shape:

```text
borrow
    ↓
use item several times
    ↓
scope closes
    ↓
lease returned to pool
```

`get` is the right choice when multiple operations in one scope need to share
the same borrowed item.

## Waiting at capacity

If:

```text
all usable slots are leased
and
the pool is already at the target/max size
```

a `get` waits for capacity.

The current test suite explicitly verifies that an extra borrower remains
suspended when all fixed-pool items are checked out.

## Reuse

The tests also verify released items are reused instead of allocating a fresh
resource for every borrow.

That is the primary purpose of the pool:

```text
acquire expensive resource once
borrow many times
finalize when pool lifecycle requires it
```

## Acquisition failure

If creating a new pool item fails, `get` exposes that acquisition failure as
the pool's error type `E`.

The tests verify failed acquisitions are reported rather than silently consuming
pool capacity.

Retrying `get` can trigger another acquisition attempt.

## `use`

```ts
const result =
    yield* Pool.use(
        pool,
        (
            connection
        ) =>
            connection.query(
                "select 1"
            )
    )
```

borrows an item only for the duration of one callback Effect.

The item is returned after that Effect exits:

```text
success
failure
interruption
```

### Why `use` exists

The source documentation distinguishes:

```text
Effect.scoped(Pool.get(pool))
```

from:

```text
Pool.use(pool, f)
```

`use` avoids allocating a child scope and registering a scope finalizer for the
one-operation case.

So a practical rule is:

```text
get
    lease lifetime = current scope

use
    lease lifetime = one Effect callback
```

## Per-item concurrency

A pooled item tracks:

```text
refCount
```

and remains available while:

```text
refCount < config.concurrency
```

At:

```text
refCount >= concurrency
```

it is removed from the available list until a borrower releases it.

The tests cover pools with concurrency greater than one and verify max pool
growth still respects per-item sharing.

## Warm-item reuse

The current source returns released items to the **front** of the available
linked list.

The implementation comment explains why: preferring recently used items keeps
the active subset "warm" and lets other elastic pool items stay idle long enough
for TTL reclamation.

This is an implementation detail, but it explains the interaction between
reuse ordering and idle shrinking.

## 3. Scale

### `makeWithTTL`

```ts
const pool =
    yield* Pool.makeWithTTL({
        acquire:
            acquireConnection,
        min:
            1,
        max:
            4,
        concurrency:
            2,
        targetUtilization:
            0.75,
        timeToLive:
            Duration.seconds(
                30
            )
    })
```

creates an elastic pool.

It can grow from:

```text
min
```

toward:

```text
max
```

as utilization increases, then reclaim excess resources according to the TTL
strategy.

## Target size

The current implementation computes roughly:

```text
utilization =
    usage / targetUtilization

target =
    ceil(
        utilization /
        concurrency
    )

target size =
    clamp(
        target,
        minSize,
        maxSize
    )
```

Fixed pools simply target their fixed size.

### Example

With:

```text
usage = 5
concurrency = 2
targetUtilization = 0.75
```

the pool asks how many resource items are needed to carry that usage at the
requested utilization target.

The exact current formula is part of implementation strategy, while the public
contract is the min/max + concurrency + target-utilization behavior.

## `timeToLiveStrategy`

Current options are:

```text
"usage"
"creation"
```

and the default is:

```text
"usage"
```

## Usage TTL

The usage strategy periodically checks whether the active item count exceeds the
current target size.

When there is excess capacity, it takes items from its strategy queue and
invalidates / reclaims them.

This allows a pool that grew for a burst to shrink again.

## Creation TTL

The creation strategy records the acquisition time of each item.

Once its configured age expires, that item is invalidated.

This measures lifetime from:

```text
resource acquisition time
```

rather than from current pool usage.

## Current tests: min/max shrink

The test suite creates a pool with:

```text
min = 10
max = 15
```

drives it to fifteen allocated resources, then advances the test clock by the
TTL.

It verifies the active resource count shrinks back to:

```text
10
```

while retaining the configured minimum.

The same scenario is tested with:

```text
concurrency = 3
```

as well.

## `makeWithStrategy`

```ts
yield* Pool.makeWithStrategy({
    acquire,
    min,
    max,
    strategy
})
```

is the lower-level constructor for custom resource lifecycle policy.

Use it when TTL policies are not expressive enough.

The strategy can:

```text
run background logic
observe each acquired item
offer an invalidated/reclaimable item during resize
```

## Strategy reclaim

During resize, if a custom strategy exists, the pool first asks:

```ts
strategy.reclaim(
    pool
)
```

for a reclaimable item.

If no item is returned, it allocates a fresh one.

This lets strategies reuse/recycle implementation state rather than requiring a
brand-new acquisition every time.

## 4. Health

### `invalidate`

```ts
yield* Pool.invalidate(
    pool,
    connection
)
```

marks a pooled value unsuitable for reuse.

Typical reasons:

```text
connection health check failed
server closed connection
session expired
worker crashed
resource entered bad state
```

## Strict identity

The source compares:

```ts
poolItem.exit.value === item
```

so invalidation uses JavaScript strict identity.

Passing a separately created but structurally equivalent object does nothing.

This matters for object resources.

## Replacement behavior

An invalidated item stops counting toward the pool's active size.

The pool starts resize work so waiting borrowers are not stranded waiting for an
item that will never become reusable.

The current test suite invalidates every item in a fixed pool and verifies a
subsequent `get` still receives a newly allocated item rather than hanging.

## Invalidating a leased item

If the item still has active references, it stays tracked as invalidated until
its last lease returns.

Then its finalizer runs and it is removed.

The pool can resize in parallel so replacement capacity becomes available
without waiting for the broken item's final lease.

## `reserve`

`reserve` is newer than the basic get/invalidate API.

It is used after a resource has already been leased.

```ts
yield* Pool.reserve(
    pool,
    connection
)
```

requires a Scope.

The reservation removes that item's **remaining concurrency** from normal pool
circulation until the reservation scope closes.

## Reservation does not revoke current borrowers

The source documentation is explicit:

```text
reserve does not wait
for existing leases to finish
```

So if:

```text
concurrency = 3
current refCount = 1
```

reservation makes the remaining shared capacity unavailable, but the existing
borrower keeps its lease.

This is a capacity reservation, not a forced ownership transfer.

## Reservation and elastic growth

The tests demonstrate:

```text
max = 2
concurrency = 2
```

A first item is leased and then reserved.

Because the reservation makes that item count as fully used, the pool can open a
second item for other borrowers.

When the reservation scope closes, the first item's remaining capacity is made
available again and waiters can proceed.

## Overlapping reservations

The tests also verify overlapping reservations.

Two reservation scopes on the same item keep it reserved until **both** close.

Closing only one reservation does not prematurely restore shared capacity.

## Concurrency-one no-op

When:

```text
concurrency = 1
```

the leased item has no remaining concurrent capacity to reserve.

The current implementation therefore treats `reserve` as a no-op.

The tests explicitly cover that case.

## Reservation and TTL

Usage-TTL reclaim skips reserved items.

A reserved resource should not be revived / reclaimed into shared circulation
while its reservation is still active.

The current test suite covers this interaction too.

## Shutdown

Pool lifetime is scope-driven.

When the pool's scope closes:

1. `isShuttingDown` is set,
2. idle items are finalized directly,
3. leased items are marked so finalization completes after their leases return,
4. waiters are notified,
5. shutdown waits for active resources to finish cleanup.

Finalizer defects are reported but do not prevent the pool from attempting
cleanup of the remaining resources.

The tests explicitly verify cleanup still completes when item finalizers defect.

## Current public surface

### Models

- `Pool`
- `Config`
- `State`
- `PoolItem`
- `Strategy`

### Guard

- `isPool`

### Constructors

- `make`
- `makeWithTTL`
- `makeWithStrategy`

### Borrowing

- `get`
- `use`

### Resource health / exclusivity

- `invalidate`
- `reserve`

That accounts for all **13** public exports in the current source.

## Pool versus Semaphore

A Semaphore manages:

```text
permits
```

A Pool manages:

```text
actual reusable resource values
plus their scoped acquisition / finalization
```

A Pool may internally use semaphores to coordinate resizing and concurrency,
but the user-level abstraction is different.

Use a semaphore when work only needs a concurrency budget.

Use a pool when work needs a reusable acquired object such as a connection.

## Pool versus ManagedRuntime

`ManagedRuntime` keeps a Layer-built service environment alive for repeated
Effect execution.

`Pool` manages a bounded, borrowable set of resource values.

Conceptually:

```text
ManagedRuntime
    one managed service environment

Pool
    multiple reusable resource instances
    borrowed and returned over time
```

They can be used together; they solve different lifecycle problems.

## Foldkit integration

Pool is runtime resource state, not pure view state.

A useful architecture is:

```text
Foldkit Model / Message / update
    expresses user intent

Effect command / service layer
    owns Pool
    borrows resource
    performs operation
    returns result

Foldkit Model
    receives result / error as a message
```

The pool should generally be created once in an application/service scope rather
than recreated during every render or update call.

## Type discipline

The generated demo has no explicit `any` annotations.

Every acquisition/finalizer callback, Strategy callback, Foldkit Message
payload, and UI callback that could lose contextual typing has an explicit type
where appropriate.

Button attributes are derived from `HtmlBuilder`.

The upstream current Pool implementation uses internal generic `any` types in a
few implementation-only plumbing signatures. That is separate from the
generated artifact constraint.

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
2. add `PoolDemo.Message` to the parent Message union,
3. initialize `PoolDemo.init`,
4. delegate child messages to `PoolDemo.update`,
5. render `PoolDemo.view(...)` from the Pool route.

This artifact intentionally performs none of those edits.
