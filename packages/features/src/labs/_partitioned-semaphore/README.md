# PartitionedSemaphore

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/PartitionedSemaphore

The current Effect source package is `4.0.0-rc.116`.

The current `packages/effect/src/PartitionedSemaphore.ts` source exposes **12
exported names**:

- `PartitionedTypeId`
- `PartitionedSemaphore`
- `Partitioned`
- `makeUnsafe`
- `make`
- `available`
- `capacity`
- `take`
- `release`
- `withPermits`
- `withPermit`
- `withPermitsIfAvailable`

`PartitionedTypeId` is exported as both a runtime value and its corresponding
literal type.

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `partitioned-semaphore.ts` — real construction, manual acquisition/release,
  scoped permit guards, zero-permit behavior, and immediate admission examples.
- `partitioned-semaphore.view.ts` — interactive visual demo.
- `partitioned-semaphore-preview.png` — static preview of the default Build
  stage.

## Intended location

```text
packages/features/src/learn/partitioned-semaphore/
├── partitioned-semaphore.ts
└── partitioned-semaphore.view.ts
```

No parent router/model/message/update files are modified.

## Core idea

A normal semaphore has one pool of permits and one waiting population.

A `PartitionedSemaphore<K>` still has **one shared permit pool**, but queued
waiters are grouped by a partition key:

```text
shared capacity
    ↓
free permits
    ↓
waiting partitions

alpha → waiters
beta  → waiters
gamma → waiters
```

Released permits are distributed across waiting partitions in round-robin
order.

That makes the abstraction useful when many independent groups compete for one
bounded resource and one busy group should not monopolize all newly-released
permits.

The key is about waiter fairness, not about creating independent per-key
capacities.

## 1. Build

### `PartitionedSemaphore<K>`

The interface exposes:

```text
capacity
available
take
release
withPermits
withPermit
withPermitsIfAvailable
```

and the runtime marker:

```text
PartitionedTypeId
```

The key type `K` identifies waiter partitions.

## `Partitioned`

```ts
PartitionedSemaphore.Partitioned<K>
```

is an alias interface extending:

```ts
PartitionedSemaphore.PartitionedSemaphore<K>
```

without adding new members.

It exists as an alternate public model name.

## `PartitionedTypeId`

The runtime marker is:

```text
~effect/PartitionedSemaphore
```

The module exports both:

```text
PartitionedTypeId
```

as a value and as the literal type for that marker.

## `make`

```ts
const semaphore =
    yield* PartitionedSemaphore.make<
        string
    >({
        permits: 3
    })
```

creates the semaphore inside Effect.

The configured permit count becomes the fixed capacity.

### Initial state

With:

```text
permits = 3
```

initially:

```text
capacity  = 3
available = 3
```

No key owns any permits in advance.

All partitions use the same shared pool.

## `makeUnsafe`

```ts
const semaphore =
    PartitionedSemaphore.makeUnsafe<
        string
    >({
        permits: 3
    })
```

constructs synchronously outside Effect.

The resulting semaphore operations are still Effects.

Use it when semaphore creation itself does not need to live inside an Effect
workflow.

## Negative capacity

The implementation computes:

```ts
Math.max(
    0,
    options.permits
)
```

so negative values are clamped to zero.

For example:

```text
permits = -5
```

produces:

```text
capacity = 0
```

Any positive acquisition request against a finite zero-capacity semaphore cannot
complete.

## Non-finite capacity

A non-finite configured permit count takes a special unbounded path.

The returned semaphore:

```text
has immediate take
has immediate release
passes through withPermit / withPermits
always succeeds for withPermitsIfAvailable
```

No waiter tracking is needed in that mode.

For teaching purposes, `Infinity` is the clearest example.

## `capacity`

```ts
PartitionedSemaphore.capacity(
    semaphore
)
```

returns the fixed configured capacity synchronously.

Capacity does not change when permits are taken or released.

## `available`

```ts
yield* PartitionedSemaphore.available(
    semaphore
)
```

reads the current number of free permits.

This is a snapshot.

Reading availability does **not** reserve those permits.

Another fiber can acquire permits immediately afterward.

That distinction is why admission decisions should use acquisition APIs rather
than:

```text
read available
then assume those permits remain free
```

## 2. Acquire

### `take`

```ts
yield* PartitionedSemaphore.take(
    semaphore,
    "alpha",
    2
)
```

manually acquires two permits for the `"alpha"` partition.

If enough permits are available, it completes immediately.

Otherwise it waits.

### Availability example

Starting from:

```text
capacity = 3
available = 3
```

after:

```ts
take(
    "alpha",
    2
)
```

availability becomes:

```text
1
```

## Requests above capacity

For a finite semaphore, requesting more permits than the capacity never
completes.

For:

```text
capacity = 3
```

this request cannot ever be satisfied:

```ts
take(
    "alpha",
    4
)
```

The same caveat applies to `withPermits`.

## Zero / negative acquisition

If:

```text
permits <= 0
```

`take` completes immediately without acquiring anything.

`withPermits` likewise runs the wrapped Effect without changing availability.

The current tests explicitly verify the zero-permit case.

## `release`

```ts
const available =
    yield* PartitionedSemaphore.release(
        semaphore,
        1
    )
```

returns permits to the shared pool.

The returned number is the resulting current availability.

However, released permits are first offered to waiting partitions.

Therefore a release does not necessarily increase `available` if waiting work
immediately consumes the permits.

When there are no relevant waiters, availability increases up to:

```text
capacity
```

It cannot grow above capacity.

## Manual protocol

The lower-level pattern is:

```text
take
    ↓
run work
    ↓
release
```

This gives the caller explicit control but also makes the caller responsible for
correct release behavior.

For most scoped work, prefer `withPermit` or `withPermits`.

## `withPermit`

```ts
yield* PartitionedSemaphore.withPermit(
    semaphore,
    "alpha",
    effect
)
```

acquires exactly one permit for that key.

It releases the permit when the wrapped Effect exits.

The release occurs even if the wrapped Effect:

```text
succeeds
fails
is interrupted
```

This is the safer default for one-permit guarded work.

## `withPermits`

```ts
yield* PartitionedSemaphore.withPermits(
    semaphore,
    "alpha",
    3,
    effect
)
```

is the weighted variant.

A task can therefore represent different resource cost:

```text
small request
    1 permit

medium request
    2 permits

heavy request
    4 permits
```

while every request still draws from the same capacity.

### Automatic release

The implementation masks interruption around acquisition / finalization so that
once the permits are acquired, they are returned after the wrapped Effect
finishes.

This is the same basic safety property the regular Effect Semaphore docs
describe for scoped permit usage.

## Pipe-friendly forms

The module-level helpers also support the pipe style.

For example:

```ts
yield* effect.pipe(
    PartitionedSemaphore.withPermit(
        semaphore,
        "alpha"
    )
)
```

and:

```ts
yield* effect.pipe(
    PartitionedSemaphore.withPermits(
        semaphore,
        "alpha",
        2
    )
)
```

The current tests verify both direct and piped forms.

## 3. Fairness

The distinguishing feature is how waiting permits are assigned.

## Internal waiter grouping

The current implementation keeps:

```text
MutableHashMap<
    K,
    Set<Waiter>
>
```

Conceptually:

```text
alpha
    waiter A1
    waiter A2
    waiter A3

beta
    waiter B1

gamma
    waiter C1
    waiter C2
```

Waiters from the same logical partition remain grouped under that key.

## Round-robin partition traversal

When permits are released, the implementation iterates through the partition
map.

It gives a permit to a waiter in one partition, advances, and later cycles back
through the partition iterator.

Conceptually:

```text
release permit
    ↓
alpha

release permit
    ↓
beta

release permit
    ↓
gamma

release permit
    ↓
alpha
```

when all of those partitions have outstanding waiter demand.

The exact waiter state can be more complex because requests can be weighted, but
the scheduling principle is partition rotation.

## Fairness is partition-level

This is not:

```text
alpha owns N permits
beta owns N permits
```

There is no dedicated quota per key.

Instead:

```text
all keys share one pool
```

and partitioning affects who makes progress when work is waiting.

That distinction is important.

## Weighted waiters

A waiter requesting several permits may be partially satisfied over multiple
release operations.

Internally the waiter tracks:

```text
remaining permits needed
```

A waiter resumes when that count reaches zero.

This allows weighted work to participate in the same partition rotation.

## Interrupted waiters

The current tests cover interruption carefully.

One regression test verifies that interrupting a waiter after it has been
partially satisfied releases all permits already assigned to it.

Example shape:

```text
capacity 4

holder takes 3
    available 1

waiter requests 3
    immediately consumes available 1
    still needs 2

release 1
    waiter has now been partially given more

interrupt waiter
    permits assigned to that waiter are returned
```

The test confirms availability is restored correctly afterward.

## Resumed waiter cleanup

The current test suite also covers a subtle case where a resumed waiter is
interrupted before its acquisition effect fully completes.

The next waiter must still be able to make progress, both:

```text
for the same partition key
and for another partition key
```

This matters because stale waiter entries could otherwise block subsequent
work.

## Partition cleanup

When the last waiter in a partition is removed, the partition entry itself is
removed from the MutableHashMap.

This keeps the waiter structure aligned with the currently active waiting
groups.

## 4. Try

### `withPermitsIfAvailable`

```ts
const result =
    yield* PartitionedSemaphore
        .withPermitsIfAvailable(
            semaphore,
            2,
            effect
        )
```

is the non-blocking admission API.

It does not wait.

The result is:

```text
Option<A>
```

## Enough permits

When enough permits are immediately free:

```text
take permits
run effect
release permits
return Some(result)
```

The release is guaranteed after the wrapped Effect exits.

## Not enough permits

If enough permits are **not available right now**:

```text
return None immediately
do not run the effect
```

The current test suite verifies both properties:

```text
result = None
executed = false
```

when the sole permit is already held.

## No partition key

Notice the signature:

```text
withPermitsIfAvailable(
    semaphore,
    permits,
    effect
)
```

There is no `key`.

That is intentional in the current API.

A partition key matters for **queued waiter scheduling**.

The immediate-availability helper never queues, so it simply tries to reserve
from the shared free pool.

If it fails, it returns `None`.

## Zero / negative permits

For:

```text
permits <= 0
```

the wrapped Effect runs immediately and its result is wrapped in `Some`.

No permit accounting is performed.

## Some path finalization

When permit acquisition succeeds, the implementation wraps the Effect in an
`ensuring` finalizer that returns the permits.

That means the acquired permits are restored after:

```text
success
failure
interruption
```

just as with the blocking scoped permit helpers.

## `available` versus try-acquire

This is the safe distinction:

```text
available
    inspect only

withPermitsIfAvailable
    atomically decide immediate admission
```

Do not implement your own try-acquire protocol by:

```text
read available
then call take
```

because availability can change between those operations.

## PartitionedSemaphore versus Semaphore

Use regular `Semaphore` when all waiting work can share one ordinary wait queue
without key-level fairness concerns.

Use `PartitionedSemaphore<K>` when:

```text
many independent tenants / shards / customers / queues
share one resource budget

and

released capacity should rotate across waiting keys
rather than repeatedly favoring one busy group
```

Both still model a shared bounded permit pool.

The extra dimension is how waiting demand is grouped and served.

## Example domains

Natural partition keys include:

```text
tenant id
customer id
host
shard
queue name
workspace
account
API provider
```

For example, a shared outbound HTTP budget can use:

```text
host name
```

as the key so a heavily queued host does not monopolize every newly available
permit.

## Foldkit integration

PartitionedSemaphore belongs at an Effect execution boundary rather than inside
the pure Foldkit Model.

A typical relationship is:

```text
Foldkit update
    describes work / command

Effect handler or runtime integration
    executes guarded Effect work

PartitionedSemaphore
    coordinates shared concurrent capacity
```

The semaphore object is mutable synchronization state.

It should generally be created once in an Effect-managed service/runtime layer,
not recreated during every Foldkit render.

## Public surface

### Runtime marker

- `PartitionedTypeId` value/type pair

### Models

- `PartitionedSemaphore`
- `Partitioned`

### Construction

- `make`
- `makeUnsafe`

### Inspection

- `capacity`
- `available`

### Manual protocol

- `take`
- `release`

### Scoped admission

- `withPermit`
- `withPermits`
- `withPermitsIfAvailable`

That is the complete set of 12 exported names in the current source.

## Type discipline

The generated demo has no explicit `any` annotations.

Every Effect callback, Foldkit Message payload, and UI callback that could lose
contextual typing is explicitly typed where needed.

Button attributes are derived from `HtmlBuilder`.

The upstream Effect implementation currently uses generic `any` internally in
the overloaded module-level wrappers; that is separate from the generated
artifact constraint.

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
2. add `Demo.Message` to the parent Message union,
3. initialize `Demo.init`,
4. delegate child messages to `Demo.update`,
5. render `Demo.view(...)` from the PartitionedSemaphore route.

This artifact intentionally performs none of those edits.
