# PubSub

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/PubSub

The current Effect source package is `4.0.0-rc.116`.

The current `packages/effect/src/PubSub.ts` source exposes **31 top-level public
exports**:

- `PubSub`
- `Subscription`
- `make`
- `bounded`
- `dropping`
- `sliding`
- `unbounded`
- `makeAtomicBounded`
- `makeAtomicUnbounded`
- `capacity`
- `size`
- `sizeUnsafe`
- `isFull`
- `isEmpty`
- `shutdown`
- `isShutdown`
- `isShutdownUnsafe`
- `awaitShutdown`
- `publish`
- `publishUnsafe`
- `publishAll`
- `subscribe`
- `take`
- `takeAll`
- `takeUpTo`
- `takeBetween`
- `remaining`
- `remainingUnsafe`
- `BackPressureStrategy`
- `DroppingStrategy`
- `SlidingStrategy`

The merged `PubSub` namespace additionally exposes **5 low-level public types**:

```text
PubSub.Atomic
PubSub.BackingSubscription
PubSub.Subscribers
PubSub.ReplayWindow
PubSub.Strategy
```

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `pub-sub.ts` — bounded / dropping / sliding / unbounded constructors, replay,
  publishing, fan-out, subscription reads, availability, and shutdown examples.
- `pub-sub.view.ts` — interactive visual demo.

## Intended location

```text
packages/features/src/labs/pub-sub/
├── pub-sub.ts
└── pub-sub.view.ts
```

No parent router/model/message/update files are modified.

## Core idea

A PubSub is an asynchronous **broadcast hub**.

Publishers send:

```text
A
```

into one hub.

Each active subscriber receives its own copy of every accepted message:

```text
publisher
    ↓
PubSub
    ├── subscriber A
    ├── subscriber B
    └── subscriber C
```

This is fundamentally different from Queue.

With a Queue:

```text
one message
    ↓
one consumer
```

With PubSub:

```text
one accepted message
    ↓
every active subscriber
```

That makes PubSub useful for:

```text
events
notifications
fan-out
state-change streams
broadcast control messages
multiple independent consumers
```

## Subscriber timing

Without replay, subscription timing matters.

A subscriber normally receives messages published **while it is subscribed**.

If a value is published first and a subscriber joins later, that subscriber does
not receive the old value.

The current v4 source also supports a replay window, which is a separate opt-in
mechanism for late subscribers.

## 1. Create

### `bounded`

```ts
const pubsub =
    yield* PubSub.bounded<string>(
        16
    )
```

creates a bounded hub with backpressure.

When the retained-message capacity is full:

```text
publisher
    waits
```

until subscriber progress frees space.

This strategy prioritizes delivery completeness for current subscribers.

A slow subscriber can therefore slow publishers.

## `dropping`

```ts
const pubsub =
    yield* PubSub.dropping<string>(
        16
    )
```

uses the dropping strategy.

When full:

```text
new surplus value
    ↓
dropped

publish(...)
    ↓
false
```

Publishers keep moving instead of waiting.

The tradeoff is that subscribers may miss values.

## `sliding`

```ts
const pubsub =
    yield* PubSub.sliding<string>(
        16
    )
```

keeps accepting new values by evicting old retained values.

Conceptually:

```text
capacity 3

[a, b, c]
publish d
    ↓
[b, c, d]
```

This favors recent messages over old ones.

A slow subscriber may therefore miss older values.

## `unbounded`

```ts
const pubsub =
    yield* PubSub.unbounded<string>()
```

has no bounded retained-message capacity.

The current public `capacity` result is:

```text
Number.MAX_SAFE_INTEGER
```

for the unbounded implementation.

Unbounded PubSub removes publisher backpressure from capacity, but it can retain
arbitrarily much data when active subscribers fall behind.

Use a bounded strategy unless unbounded retention is actually appropriate.

## Replay

Current v4 constructors support replay options.

For bounded / dropping / sliding:

```ts
yield* PubSub.bounded<string>({
    capacity:
        16,
    replay:
        4
})
```

For unbounded:

```ts
yield* PubSub.unbounded<string>({
    replay:
        4
})
```

A positive replay value keeps a recent-message window for newly created
subscriptions.

### Late-subscriber example

```text
replay = 2

publish:
    a
    b
    c

subscribe later
    ↓
replay window begins with:
    b
    c
```

The current atomic implementation explicitly stores values in the replay buffer
even when there are no active subscribers.

That is why replay can bridge the "subscribe after publish" gap.

## Replay is not durable history

Replay is an in-memory recent-message window.

It is not:

```text
persistent storage
event sourcing
an acknowledgement log
a durable broker
```

The configured replay count bounds only the late-subscriber history window.

## `make`

`make` is the low-level effectful constructor:

```ts
PubSub.make({
    atomicPubSub:
        () =>
            PubSub.makeAtomicBounded(
                16
            ),
    strategy:
        () =>
            new PubSub
                .BackPressureStrategy()
})
```

It combines:

```text
Atomic<A>
    storage mechanics

Strategy<A>
    surplus / delivery policy
```

Most application code should prefer:

```text
bounded
dropping
sliding
unbounded
```

unless it genuinely needs custom internals.

## `makeAtomicBounded`

Creates only the low-level bounded storage component.

It accepts either:

```text
capacity number
```

or:

```text
{
    capacity,
    replay?
}
```

### Capacity validation

The capacity must be greater than zero.

Invalid capacity throws synchronously before an atomic implementation is
created.

### Implementation specialization

The current source selects specialized bounded implementations for:

```text
capacity 1
power-of-two capacity
arbitrary capacity
```

This is an implementation detail, not something application code needs to
branch on.

## `makeAtomicUnbounded`

Creates the low-level unbounded storage component.

It also accepts optional replay.

## Strategy classes

The module publicly exposes:

```text
BackPressureStrategy
DroppingStrategy
SlidingStrategy
```

These implement `PubSub.Strategy<A>` and are useful mainly with custom `make`.

## Low-level namespace types

### `PubSub.Atomic<A>`

Core storage operations:

```text
capacity
isEmpty
isFull
size
publish
publishAll
slide
subscribe
replayWindow
```

### `PubSub.BackingSubscription<A>`

Low-level per-subscriber storage cursor:

```text
isEmpty
size
poll
pollUpTo
unsubscribe
```

### `PubSub.Subscribers<A>`

The strategy-level map that tracks waiting pollers per backing subscription.

### `PubSub.ReplayWindow<A>`

A subscription-local view of replayed values:

```text
take
takeN
takeAll
close
remaining
```

### `PubSub.Strategy<A>`

The policy contract coordinating surplus publishers and waiting subscribers.

These types are public because custom PubSub internals can be built, but normal
application code usually does not manipulate them directly.

## 2. Broadcast

### `publish`

```ts
const accepted =
    yield* PubSub.publish(
        pubsub,
        value
    )
```

returns:

```text
Effect<boolean>
```

The boolean says whether the message was accepted according to the strategy.

### Strategy behavior

If immediate storage succeeds:

```text
true
```

and waiting subscribers are completed.

If storage is full, the strategy decides:

```text
bounded
    wait / backpressure

dropping
    false

sliding
    evict old and accept
```

If the PubSub has already been shut down:

```text
false
```

## `publishUnsafe`

```ts
PubSub.publishUnsafe(
    pubsub,
    value
)
```

returns a synchronous boolean.

It only attempts immediate publication.

It does **not** invoke the strategy's effectful surplus handling.

That means on a full bounded PubSub it returns:

```text
false
```

instead of suspending.

This makes it useful for best-effort synchronous publication where failure to
publish immediately is acceptable.

## Important difference

```text
publish
    effectful
    honors backpressure / sliding surplus handling

publishUnsafe
    synchronous
    immediate attempt only
```

Prefer `publish` for normal Effect code.

## `publishAll`

```ts
yield* PubSub.publishAll(
    pubsub,
    [
        "one",
        "two",
        "three"
    ]
)
```

publishes an Iterable.

The atomic layer returns any surplus that did not fit immediately, and then the
configured strategy handles that surplus.

With backpressure, `publishAll` may suspend until the whole set is accepted.

## Fan-out

The key behavior is independent delivery to subscribers.

Example:

```ts
const first =
    yield* PubSub.subscribe(
        pubsub
    )

const second =
    yield* PubSub.subscribe(
        pubsub
    )

yield* PubSub.publish(
    pubsub,
    "broadcast"
)
```

Then both can receive:

```text
first  → "broadcast"
second → "broadcast"
```

They are not competing for one copy.

## Retention and active subscribers

A bounded PubSub keeps a published message until all current subscribers that
need that message have advanced past it.

This is why a slow current subscriber can keep messages retained and eventually
cause backpressure.

## No subscribers

Without replay, publishing with no active subscribers has nothing to retain for
future subscribers.

With replay enabled, the current source still records accepted values in the
replay buffer.

This distinction is important.

## 3. Consume

### `Subscription<A>`

A subscription represents one consumer connection to a PubSub.

It is also Pipeable.

The public subscription object contains low-level fields, but application code
normally uses:

```text
take
takeAll
takeUpTo
takeBetween
remaining
```

## `subscribe`

```ts
const subscription =
    yield* PubSub.subscribe(
        pubsub
    )
```

returns:

```text
Effect<
    Subscription<A>,
    never,
    Scope.Scope
>
```

The subscription is therefore scope-bound.

When the local scope closes, the subscription is automatically unsubscribed and
its pending pollers are interrupted.

This avoids manual unsubscribe bookkeeping in normal usage.

## `take`

```ts
yield* PubSub.take(
    subscription
)
```

returns one message.

If none is available:

```text
suspend
```

until a message arrives.

Replay is checked before the normal backing subscription.

## `takeAll`

Despite the name, `takeAll` is **not** an empty-array polling operation.

Current v4 behavior:

```text
if values exist
    return all currently available

if none exist
    suspend until at least one arrives
```

Its return type is:

```text
Effect<
    NonEmptyArray<A>
>
```

This is an important difference from `takeUpTo`.

## `takeUpTo`

```ts
yield* PubSub.takeUpTo(
    subscription,
    10
)
```

does not suspend waiting for messages.

It takes:

```text
0 … max
```

currently available values.

The result can therefore be:

```text
[]
```

## Count normalization

`takeUpTo` uses the shared Count normalization rules.

Current docs/source specify:

```text
finite fractional number
    floor

NaN
non-positive
    0
```

This same normalization is used for the bounds in `takeBetween`.

## `takeBetween`

```ts
yield* PubSub.takeBetween(
    subscription,
    2,
    5
)
```

tries to return between:

```text
min
and
max
```

messages.

If fewer than the normalized minimum are currently available, it suspends and
continues taking until the minimum requirement is satisfied.

It never intentionally exceeds the maximum.

## `remaining`

```ts
yield* PubSub.remaining(
    subscription
)
```

returns the number of messages currently available to this subscription.

The count includes:

```text
backing-subscription messages
+
replay-window messages
```

If the subscription is shut down, the effect interrupts.

## `remainingUnsafe`

The synchronous counterpart is:

```ts
PubSub.remainingUnsafe(
    subscription
)
```

It returns:

```text
Option<number>
```

rather than interrupting.

Current behavior:

```text
active
    → Some(count)

shutdown
    → None
```

This makes shutdown observable as data in synchronous code.

## Replay and take order

A new subscription with replay consumes replay-window values before ordinary
backing-subscription messages.

This keeps the subscription's historical starting window ahead of newer live
messages.

## 4. Lifecycle

### `capacity`

```ts
PubSub.capacity(
    pubsub
)
```

is synchronous.

Capacity is fixed when the PubSub is constructed.

For bounded strategies:

```text
configured capacity
```

For unbounded:

```text
Number.MAX_SAFE_INTEGER
```

## `size`

```ts
yield* PubSub.size(
    pubsub
)
```

returns the current number of messages retained by the PubSub for active
subscribers.

It is **not**:

```text
number of subscribers
number of waiting publishers
number of replay values
```

It reflects the active-subscriber backing storage.

After shutdown, current `size` behavior yields:

```text
0
```

## `sizeUnsafe`

Synchronous snapshot:

```ts
PubSub.sizeUnsafe(
    pubsub
)
```

It also returns zero after shutdown.

Because state can change concurrently, this should be treated as a snapshot,
not a reservation or synchronization primitive.

## `isEmpty`

Effectful predicate derived from:

```text
size === 0
```

## `isFull`

Effectful predicate derived from:

```text
size === capacity
```

For unbounded PubSub this is normally false.

## `shutdown`

```ts
yield* PubSub.shutdown(
    pubsub
)
```

performs uninterruptible shutdown.

Current implementation:

1. marks the shutdown flag,
2. closes the internal PubSub scope,
3. runs strategy shutdown,
4. opens the shutdown latch.

Closing the PubSub scope finalizes active subscriptions.

## After shutdown

Current documented/source behavior:

```text
publish
    → Effect.succeed(false)

publishAll
    → Effect.succeed(false)

publishUnsafe
    → false
```

Subscription operations such as `take` interrupt after their subscription has
been shut down.

## `isShutdown`

Effectful shutdown-state check.

```ts
yield* PubSub.isShutdown(
    pubsub
)
```

## `isShutdownUnsafe`

Synchronous shutdown-flag snapshot.

```ts
PubSub.isShutdownUnsafe(
    pubsub
)
```

## `awaitShutdown`

```ts
yield* PubSub.awaitShutdown(
    pubsub
)
```

suspends until shutdown occurs.

If shutdown has already happened, it resumes immediately.

This is useful for lifecycle coordination across fibers.

## Bounded strategy tradeoffs

### Backpressure

Advantages:

```text
preserves accepted messages
current subscribers can receive everything
```

Tradeoff:

```text
slow subscriber can slow publisher
```

### Dropping

Advantages:

```text
publisher never waits for surplus capacity
```

Tradeoff:

```text
new values may be lost
```

### Sliding

Advantages:

```text
publisher remains responsive
recent values preserved
```

Tradeoff:

```text
old values can be lost for slow subscribers
```

### Unbounded

Advantages:

```text
no capacity backpressure
```

Tradeoff:

```text
memory can grow without a bounded limit
```

Choose according to the data-loss / latency / memory contract of the system.

## PubSub versus Queue

This is the most important conceptual distinction.

### Queue

```text
producer
    ↓
queue
    ├── consumer A gets message 1
    ├── consumer B gets message 2
    └── consumer A gets message 3
```

Consumers compete for elements.

### PubSub

```text
publisher
    ↓
pubsub
    ├── subscriber A gets message 1
    ├── subscriber B gets message 1
    └── subscriber C gets message 1
```

Every active subscriber receives its own logical copy.

Use Queue for distributing work.

Use PubSub for broadcasting events.

## Replay versus Queue backlog

Replay should not be confused with queue backlog.

Replay belongs to **new subscriber initialization**.

Queue backlog belongs to **future consumer work distribution**.

They serve different semantics.

## Current public surface

### Models

- `PubSub`
- `Subscription`

### High-level constructors

- `make`
- `bounded`
- `dropping`
- `sliding`
- `unbounded`

### Low-level storage constructors

- `makeAtomicBounded`
- `makeAtomicUnbounded`

### Strategies

- `BackPressureStrategy`
- `DroppingStrategy`
- `SlidingStrategy`

### PubSub inspection / lifecycle

- `capacity`
- `size`
- `sizeUnsafe`
- `isFull`
- `isEmpty`
- `shutdown`
- `isShutdown`
- `isShutdownUnsafe`
- `awaitShutdown`

### Publishing

- `publish`
- `publishUnsafe`
- `publishAll`

### Subscription

- `subscribe`
- `take`
- `takeAll`
- `takeUpTo`
- `takeBetween`
- `remaining`
- `remainingUnsafe`

That accounts for all **31 top-level public exports**.

## Nested low-level types

Inside the `PubSub` namespace:

- `Atomic`
- `BackingSubscription`
- `Subscribers`
- `ReplayWindow`
- `Strategy`

These make **36 qualified teaching entries** when counted separately.

## Foldkit integration

PubSub is runtime coordination state, not pure Foldkit Model state.

A natural architecture is:

```text
Foldkit Message / update
    expresses intent

Effect runtime/service
    publishes event to PubSub

independent Effect subscribers
    consume event streams

results / notifications
    become Foldkit messages when UI state should change
```

Examples:

```text
broadcast application events
notify multiple background services
fan out data refresh signals
publish cache invalidation events
observe state changes from multiple consumers
```

Keep the PubSub in a long-lived Effect-managed runtime/service layer rather than
creating one during each render.

## PubSub and Foldkit Runtime

The Foldkit runtime boundary is the appropriate place for side-effectful
coordination.

Keep:

```text
main.ts
    pure Model / Message / update / view
```

and put:

```text
PubSub construction
subscription fibers
shutdown
external event wiring
```

in runtime-facing integration code.

That preserves the same "pure feature, effectful entry/runtime boundary"
separation used throughout the other learn demos.

## Type discipline

The generated demo has no explicit `any` annotations.

Every Foldkit Message payload and UI callback that could lose contextual typing
is explicitly typed where appropriate.

Button attributes are derived from `HtmlBuilder`.

The upstream current PubSub implementation itself contains broad internal
generic types in low-level implementation plumbing; that is separate from the
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
resolved, so this check catches local syntax and implicit-any problems rather
than replacing a full typecheck inside the target monorepo.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/labs/*` demos:

1. add the child Model to the parent learn Model,
2. add `Demo.Message` to the parent Message union,
3. initialize `Demo.init`,
4. delegate child messages to `Demo.update`,
5. render `Demo.view(...)` from the PubSub route.

This artifact intentionally performs none of those edits.
