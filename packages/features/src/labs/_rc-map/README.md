# RcMap

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/RcMap

The current Effect source package is `4.0.0-rc.116`.

The current `packages/effect/src/RcMap.ts` source exposes **9 top-level public
exports**:

- `RcMap`
- `State`
- `make`
- `get`
- `getOption`
- `keys`
- `invalidate`
- `has`
- `touch`

The merged `State` namespace additionally exposes:

- `State.Open`
- `State.Closed`
- `State.Entry`

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `rc-map.ts` — scoped keyed-resource acquisition, sharing, cached-only lookup,
  capacity, TTL, inspection, touch, and invalidation examples.
- `rc-map.view.ts` — interactive visual demo.

## Intended location

```text
packages/features/src/labs/rc-map/
├── rc-map.ts
└── rc-map.view.ts
```

No parent router/model/message/update files are modified.

## Core idea

`RcMap<K, A, E>` is a reference-counted resource map.

It is designed for resources such as:

```text
database clients
sessions
connections
per-tenant services
per-host clients
resource handles
```

It is **not** primarily a general mutable cache.

The map connects:

```text
key K
    ↓
scoped lookup Effect
    ↓
resource A
```

and tracks how many active caller scopes currently retain each resource.

The important lifecycle is:

```text
first get(key)
    ↓
run lookup once
    ↓
store Entry

more get(key)
    ↓
share same Entry
    ↓
refCount increases

caller scopes close
    ↓
refCount decreases

refCount reaches zero
    ↓
idleTimeToLive policy
```

## 1. Build

### `RcMap<K, A, E>`

The current public interface contains:

```text
lookup
context
scope
idleTimeToLive
capacity
state
```

and is Pipeable.

### Captured context

`make` captures the current Effect context.

A lookup started later receives the map's captured context merged with the
current fiber context, while its `Scope.Scope` is replaced with the entry's own
resource scope.

This is how the resource can outlive one borrowing scope while still remaining
owned by the RcMap.

## `make`

```ts
const map =
    yield* RcMap.make({
        lookup:
            (
                key: string
            ) =>
                Effect.acquireRelease(
                    open(key),
                    close
                )
    })
```

creates the map inside the current Scope.

When that owning Scope closes, the map:

```text
moves State to Closed
closes every remaining entry scope
clears the internal map
```

## Lazy acquisition

`make` does not eagerly run `lookup`.

The first `get` for a key performs the lookup.

That makes RcMap suitable for large key spaces where only a subset is actually
used.

## Default capacity

If `capacity` is omitted:

```text
Number.POSITIVE_INFINITY
```

is used.

The current implementation normalizes a supplied capacity with:

```text
Math.max(capacity, 0)
```

so negative capacity becomes:

```text
0
```

## Capacity error typing

The `make` overload changes when `capacity` is supplied.

Without capacity, the resource error type remains:

```text
E
```

With capacity, the map error type becomes:

```text
E | Cause.ExceededCapacityError
```

because a missing-key `get` can fail when the map already holds the configured
number of entries.

## Capacity counts stored entries

Capacity is based on the current internal map size.

This includes entries whose:

```text
refCount = 0
```

but which remain cached during a non-zero idle TTL.

The current tests show a capacity-2 map holding `foo` and `bar` rejects `baz`
until those idle entries expire.

## `State<K, A, E>`

The state union is:

```text
State.Open<K,A,E>
|
State.Closed
```

## `State.Open`

Contains:

```text
_tag:
    "Open"

map:
    MutableHashMap<K, Entry<A,E>>
```

## `State.Closed`

Only:

```text
_tag:
    "Closed"
```

The map is no longer available through the state once shutdown has occurred.

## `State.Entry`

Each keyed resource entry contains:

```text
deferred
scope
finalizer
idleTimeToLive
fiber
expiresAt
refCount
```

### `deferred`

The lookup result is stored behind one `Deferred`.

This is how concurrent callers share one in-progress acquisition.

### `scope`

Every entry owns a closeable Scope containing the resource lookup.

### `finalizer`

Each borrowing scope receives the entry release finalizer.

### `fiber`

For finite non-zero idle TTL, an idle-expiration fiber may be running.

### `expiresAt`

Stores the current idle deadline in milliseconds.

### `refCount`

Number of active borrowed references to that entry.

## Complex keys

The current RcMap docs note that complex keys can implement Effect `Equal` and
`Hash`.

RcMap uses `MutableHashMap` internally, so Effect-aware equality / hashing can
give value semantics to custom key objects.

The current test suite verifies equivalent `Data.Class` keys hit the same
capacity-1 entry rather than creating a duplicate.

## 2. Acquire

### `get`

```ts
const resource =
    yield* RcMap.get(
        map,
        key
    )
```

returns:

```text
Effect<A, E, Scope.Scope>
```

so every borrow is attached to the **current caller Scope**.

## Missing key

When a key is absent:

1. capacity is checked,
2. a new `State.Entry` is inserted,
3. `refCount` starts at 1,
4. lookup runs in the entry's private Scope,
5. its result completes the entry Deferred,
6. the caller waits for that Deferred.

## Stored key

When the key already exists:

```text
refCount++
```

and no new lookup is started.

The caller waits for the existing Deferred.

This works for both:

```text
already-completed acquisition
currently in-flight acquisition
```

## Sharing in-flight lookup

The current test suite specifically verifies that `getOption` can join an
in-flight entry created by another borrower.

Both callers await the same Deferred, and the entry `refCount` becomes 2.

This means RcMap deduplicates concurrent resource acquisition by key.

## Sharing lookup failure / defect

The same mechanism also shares an in-flight or cached lookup failure.

A later borrower of the same stored key does not automatically start another
lookup while the failed entry remains present.

The current tests cover both typed failures and lookup defects.

## Borrowing scope finalizer

Every successful call to `get` adds:

```text
entry.finalizer
```

to the caller's current Scope.

When that caller scope closes:

```text
refCount--
```

## Closing one of several borrowers

When the count remains above zero:

```text
resource stays acquired
```

No idle countdown begins yet.

## Final borrower leaves

When:

```text
refCount === 0
```

the idle policy is evaluated.

That policy is covered in the Lifecycle section below.

## Closed map behavior

`get` on a `State.Closed` RcMap returns interruption.

It does not create a new entry or run lookup.

## Capacity failure

For a finite capacity, missing-key `get` checks:

```text
map size >= capacity
```

before creating an Entry.

When full it fails with:

```text
Cause.ExceededCapacityError
```

with a message identifying the RcMap capacity.

A hit on an existing key does not consume an additional capacity slot.

## 3. Retain

### `getOption`

`getOption` means:

```text
borrow only if currently stored
```

It never invokes `lookup` for a missing key.

```ts
const result =
    yield* RcMap.getOption(
        map,
        key
    )
```

returns:

```text
Option<A>
```

inside Effect.

## Missing entry

When the key is not stored:

```text
Option.none()
```

and:

```text
lookup is not run
capacity is not consumed
```

The current tests explicitly use a capacity-0 map and verify missing
`getOption` still returns None without running lookup.

## Stored entry

If the entry exists:

```text
refCount++
```

then the current caller Scope receives the release finalizer.

After the existing Deferred completes:

```text
Option.some(value)
```

is returned.

## Existing failed entry

`getOption` is not equivalent to "successful cached value only".

If the key exists but its lookup failed, `getOption` fails with the same error.

The Option only describes:

```text
entry absent
vs
entry present
```

not successful versus failed acquisition.

## Existing in-flight entry

Likewise, if acquisition is still running, `getOption` waits for it.

It does not return None just because the value is not ready yet.

## Closed `getOption`

A closed map returns:

```text
Option.none()
```

rather than interrupting.

This differs from `get`.

## `has`

```ts
yield* RcMap.has(
    map,
    key
)
```

checks current presence only.

It does not:

```text
retain
await lookup
run lookup
```

Closed maps return:

```text
false
```

so false does not distinguish:

```text
missing key
from
closed RcMap
```

## `keys`

```ts
Array.from(
    yield* RcMap.keys(
        map
    )
)
```

returns the currently stored keys.

Unlike `has`, `keys` on a closed map interrupts.

## Snapshot caveat

Presence and key enumeration are snapshots of mutable runtime state.

Another fiber or scope can release / invalidate / expire an entry after the
inspection.

Do not treat `has` as reserving the entry.

Use `get` or `getOption` when a retained reference is required.

## 4. Lifecycle

### Default idle TTL

If `idleTimeToLive` is omitted, the current implementation uses:

```text
Duration.zero
```

Therefore after the final borrowing reference closes:

```text
entry removed immediately
resource scope closed immediately
```

This is pure reference-counted lifetime.

## Positive finite idle TTL

Example:

```ts
idleTimeToLive:
    "30 seconds"
```

After the final reference leaves:

```text
refCount = 0
entry stays in map
expiration deadline starts
```

A later `get` or `getOption` can reuse it before expiration.

## Reacquiring idle entries

When an idle entry is borrowed again:

```text
refCount++
```

The resource stays the same.

When that new reference is later released, the idle expiration deadline is
restarted from the new release time.

The current test suite verifies this behavior.

## Infinite idle TTL

If the configured duration is infinite:

```text
entry remains cached after refCount reaches zero
```

No idle expiration fiber is needed.

It remains until:

```text
invalidate
RcMap owning Scope closes
```

or another lifecycle action removes it.

## Dynamic TTL by key

`idleTimeToLive` may be a function:

```ts
idleTimeToLive:
    (
        key
    ) =>
        key.startsWith(
            "short:"
        )
            ? 500
            : 2000
```

Each entry stores the duration selected for its key at creation time.

The test suite covers different expiration times per key.

## `touch`

```ts
yield* RcMap.touch(
    map,
    key
)
```

extends the idle lifetime of a stored entry.

For an existing entry with non-zero TTL:

```text
expiresAt =
    now + entry.idleTimeToLive
```

The current idle timer observes the updated deadline and waits longer.

## Touch edge cases

`touch` does nothing when:

```text
map is Closed
key is missing
entry TTL is zero
```

It does not acquire a new resource.

## `invalidate`

```ts
yield* RcMap.invalidate(
    map,
    key
)
```

removes the key from the map immediately.

This ensures the **next** get for the same key starts a fresh lookup.

## Invalidating an idle entry

When:

```text
refCount === 0
```

invalidation closes the old entry immediately.

## Invalidating an active entry

When:

```text
refCount > 0
```

the key is removed from the map, but existing borrowers keep their old
resource.

The old resource is not forcibly revoked.

Its entry closes when those existing references finish.

Meanwhile a later `get` can create a **new replacement entry** for the same key.

The current tests verify old and replacement entries can coexist correctly
during this transition.

## Old idle timer versus replacement

The test suite also verifies an invalidated old entry's expiration timer cannot
later remove its replacement.

The source checks that the map's current entry for the key is still the same
Entry object before idle expiration removes anything.

## Owning Scope shutdown

When the RcMap's own Scope closes:

```text
state → Closed
all remaining entry scopes are closed
internal map is cleared
```

For an entry with an idle-expiration fiber, closing the entry interrupts that
fiber before closing its resource Scope.

## Closed-operation summary

Current source behavior:

```text
get
    interrupts

getOption
    None

has
    false

keys
    interrupts

invalidate
    no-op

touch
    no-op
```

## Failed lookup and TTL

A failed/defective lookup still occupies its entry until references and TTL
allow that entry to be cleaned up.

The current tests specifically verify that capacity becomes reusable after a
failed acquisition entry is released according to its configured TTL.

With zero TTL that happens immediately after the borrow scope releases.

With a positive TTL the failed entry can remain stored until expiration.

## RcMap versus ordinary cache

An ordinary cache usually asks:

```text
is this value fresh?
```

RcMap's central question is:

```text
how many scopes are currently retaining this resource?
```

The cached/idle phase exists to reduce resource churn after refCount reaches
zero.

Its main purpose is lifecycle ownership, not arbitrary value memoization.

## RcMap versus Pool

Pool manages:

```text
anonymous reusable resource slots
```

Borrowers generally do not request "the resource for this key".

RcMap manages:

```text
one shared resource entry per key
```

Typical contrast:

```text
Pool
    give me any available database connection

RcMap
    give me the client/session for tenant "acme"
```

Both are scope-driven resource managers, but they solve different lookup
semantics.

## RcMap versus RcRef

`RcRef` is for one reference-counted resource.

`RcMap` generalizes the idea across:

```text
K → resource
```

with a separate ref count / entry scope / TTL per key.

Use RcRef when there is one shared resource identity.

Use RcMap when the identity is selected dynamically by key.

## Current public surface

### Models

- `RcMap`
- `State`
- `State.Open`
- `State.Closed`
- `State.Entry`

### Constructor

- `make`

### Retaining resource access

- `get`
- `getOption`

### Inspection

- `keys`
- `has`

### Lifecycle

- `invalidate`
- `touch`

That accounts for all **9 top-level exports** and the **3 nested State
entries**.

## Foldkit integration

RcMap is runtime resource state.

It should normally live outside the pure Foldkit Model.

A useful architecture is:

```text
Foldkit Message
    identifies resource key / intent

runtime Effect
    RcMap.get(map, key)
    use resource in a Scope

operation result
    ↓
Foldkit Message

pure update
    changes Model
```

Examples:

```text
per-workspace API clients
per-document live sessions
per-account authenticated clients
per-project database handles
```

Do not store the internal `State.Entry` or mutable RcMap state in the pure UI
Model.

## Foldkit Runtime boundary

Keep:

```text
main.ts
    Model
    Message
    init
    update
    view
```

pure.

Put:

```text
RcMap.make
lookup resource acquisition
borrow scopes
invalidations
shutdown
```

in runtime/service integration.

The RcMap owning Scope should generally match the lifetime of the service or
application component that owns those keyed resources.

## Type discipline

The generated demo has no explicit `any` annotations.

Every custom acquisition/finalizer callback, Foldkit Message payload, and UI
callback that could lose contextual typing has an explicit type where useful.

Button attributes are derived from `HtmlBuilder`.

The upstream current RcMap implementation contains internal `any` casts in
generic resource plumbing. That is separate from the generated artifact
constraint.

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
resolved, so this catches local syntax and implicit-any issues rather than
replacing a full typecheck inside the target monorepo.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/labs/*` demos:

1. add the child Model to the parent learn Model,
2. add `Demo.Message` to the parent Message union,
3. initialize `Demo.init`,
4. delegate child messages to `Demo.update`,
5. render `Demo.view(...)` from the RcMap route.

This artifact intentionally performs none of those edits.
