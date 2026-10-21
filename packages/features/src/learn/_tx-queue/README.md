# TxQueue

`TxQueue<A, E>` is Effect's transactional FIFO queue. Values are stored in a `TxChunk`, queue lifecycle is stored in a `TxRef<State<A, E>>`, and queue operations can retry as part of a larger Effect transaction rather than coordinating through ad-hoc locks.

This standalone lesson uses four stages:

1. **Create** — choose bounded, unbounded, dropping, or sliding capacity semantics.
2. **Offer** — enqueue one or many values and understand producer backpressure / loss.
3. **Take** — consume FIFO values with retrying, polling, peeking, and batch APIs.
4. **Complete** — move through `Open`, `Closing`, and `Done` with end/fail/interrupt/shutdown.

The teaching model stores only the selected stage/case strings. Live `TxQueue`, `TxChunk`, `TxRef`, `Cause`, and transaction values stay out of the serializable Foldkit model.

## Core mental model

A queue has two independent dimensions:

- **Capacity strategy** controls what happens when an open queue is full.
- **Lifecycle state** controls whether new values are accepted and how consumers observe completion.

The four strategies are:

| Strategy             | At capacity                                        | `offer` result                  |
| -------------------- | -------------------------------------------------- | ------------------------------- |
| `bounded(capacity)`  | retries the transaction until space exists         | eventually `true` if still Open |
| `dropping(capacity)` | keeps buffered values and rejects the new one      | `false`                         |
| `sliding(capacity)`  | removes the oldest value, then appends the new one | `true`                          |
| `unbounded()`        | no finite capacity check                           | `true` while Open               |

The lifecycle is:

- **Open** — offers are accepted according to the strategy; consumers may take.
- **Closing** — no more offers; existing buffered items may still be consumed.
- **Done** — terminal cause is observable; no further queue progress occurs.

## Stage 1 — Create

```ts
import { Effect, TxQueue } from "effect"

const program = Effect.gen(function*() {
  const queue = yield* TxQueue.bounded<number>(3)
  return [
    yield* TxQueue.size(queue),
    yield* TxQueue.isOpen(queue)
  ] as const
})
```

Constructors:

- `bounded(capacity)`
- `unbounded()`
- `dropping(capacity)`
- `sliding(capacity)`

`TxQueue<A, E>` exposes both producer and consumer operations. Use `TxEnqueue<A, E>` for write-only handles and `TxDequeue<A, E>` for read-only handles when an API should expose less capability.

## Stage 2 — Offer

```ts
const queue = yield* TxQueue.dropping<number>(2)

yield* TxQueue.offerAll(queue, [1, 2])
const accepted = yield* TxQueue.offer(queue, 3)
// false
```

`offer` returns `boolean`: `false` is a normal rejection, not an `E`-channel failure. Closing and Done queues also reject offers with `false`.

`offerAll` returns an array of values that were rejected. The loop runs inside one `Effect.tx`, so a bounded queue that reaches capacity retries the transaction rather than committing a prefix of the batch.

Use a larger explicit transaction when queue mutation must stay consistent with related transactional state:

```ts
const result = Effect.tx(
  Effect.gen(function*() {
    yield* TxQueue.offer(queue, 1)
    const first = yield* TxQueue.take(queue)
    yield* TxQueue.offer(queue, first + 10)
  })
)
```

## Stage 3 — Take

`take` is a retrying FIFO consumer:

```ts
const value = yield* TxQueue.take(queue)
```

On an empty **Open** queue it uses `Effect.txRetry`. On **Done**, it propagates the queue's completion cause through the `E` channel. When consuming the final buffered value of a **Closing** queue, it transitions the queue to **Done**.

`poll` is the non-retrying alternative:

```ts
const maybe = yield* TxQueue.poll(queue)
// Option<A>
```

It returns `Option.none()` on an empty queue and also returns `None` for an already Done queue instead of surfacing the terminal cause.

`peek` waits transactionally for the next value without removing it. Batch consumers include:

- `takeAll` — waits for at least one value, then atomically drains all buffered values.
- `takeN(n)` — waits for the requested normalized count (capped by finite queue capacity), unless Closing allows the remaining buffer to drain.
- `takeBetween(min, max)` — waits for `min` on an Open queue and takes up to `max`; a Closing queue may drain fewer than `min` and then become Done.

### rc.115 count normalization

The workspace pin is `effect@4.0.0-rc.112`. The live rc.115 line added the shared internal `Count.normalize` behavior to `takeN` and `takeBetween`:

- finite positive fractional counts are floored;
- `NaN` and non-positive values normalize to `0`;
- invalid normalized `takeBetween` ranges return an empty array.

The runnable lesson uses positive integer counts, so it is compatible with rc.112 while the README describes the live behavior.

## Stage 4 — Complete

The completion APIs differ intentionally.

### Graceful cause completion

`failCause`, `end`, and `interrupt` preserve buffered items. If the queue is non-empty they move it to **Closing**; consumers can drain the buffer before the cause becomes terminal.

```ts
const queue = yield* TxQueue.bounded<number, Cause.Done>(4)
yield* TxQueue.offerAll(queue, [1, 2])
yield* TxQueue.end(queue)

const closing = yield* TxQueue.isClosing(queue) // true
const values = yield* TxQueue.takeAll(queue)     // [1, 2]
const done = yield* TxQueue.isDone(queue)        // true
```

`end` is a convenience wrapper using a `Cause.Done` completion signal. `interrupt` uses the current fiber's interruption cause.

### Immediate typed failure

`fail(queue, error)` is deliberately different: it discards all buffered values and transitions directly to **Done** with `Cause.fail(error)`.

### Immediate shutdown compatibility path

`shutdown` clears the queue and then interrupts it. `isShutdown` is a legacy compatibility predicate and is currently equivalent to `isDone`.

`awaitCompletion` retries until the lifecycle reaches **Done**. It waits for completion state; it does not re-fail with the stored cause.

## Live public surface

The live reference currently renders **4.0.0-rc.115** with **37 documented API entries**. The source has **34 unique top-level names** because the `TxEnqueue`, `TxDequeue`, and `TxQueue` namespaces are documented separately from the interfaces with the same names.

### Combinators (15)

- `awaitCompletion`
- `clear`
- `end`
- `fail`
- `failCause`
- `interrupt`
- `offer`
- `offerAll`
- `peek`
- `poll`
- `shutdown`
- `size`
- `take`
- `takeAll`
- `takeN`

### Constructors (4)

- `bounded`
- `dropping`
- `sliding`
- `unbounded`

### Guards (3)

- `isTxDequeue`
- `isTxEnqueue`
- `isTxQueue`

### Models (5)

- `State`
- `TxDequeue` interface
- `TxEnqueue` interface
- `TxQueue` interface
- `TxQueueState` interface

### Type namespaces (3)

- `TxDequeue`
- `TxEnqueue`
- `TxQueue`

### Predicates (6)

- `isClosing`
- `isDone`
- `isEmpty`
- `isFull`
- `isOpen`
- `isShutdown`

### Taking (1)

- `takeBetween`

## Version notes

Workspace source: `effect@4.0.0-rc.112`.

Live reference checked for this lesson: `4.0.0-rc.115`.

The public name set remains stable through rc.117. The meaningful rc.112 → rc.115 source changes for this lesson are:

1. private runtime identifiers moved from the `~effect/transactions/TxQueue...` family to `~effect/TxQueue...`;
2. `takeN` and `takeBetween` adopted shared count normalization.

The generated TypeScript avoids private identifiers and uses positive integer batch sizes, so no compatibility shim is required.

## Foldkit note

`defineMessageUnion` expects a map of field definitions, not `S.Struct(...)` values. This lesson therefore uses the direct field-map form:

```ts
export const Message = defineMessageUnion({
  SelectedTxQueueStage: { stage: Stage },
  SelectedTxQueueCreateCase: { createCase: CreateCase },
  SelectedTxQueueOfferCase: { offerCase: OfferCase },
  SelectedTxQueueTakeCase: { takeCase: TakeCase },
  SelectedTxQueueCompleteCase: { completeCase: CompleteCase }
})
```

## Validation

The standalone no-resolve TypeScript check is expected to report only unresolved workspace package imports (`effect`, Foldkit, and the Foldkit UI/html modules). There are no additional local TypeScript diagnostics and no explicit `any` annotations in the generated lesson files.
