# TxPubSub

A standalone Foldkit lesson for Effect's `TxPubSub` module.

- Teaching flow: **Create → Subscribe → Publish → Shutdown**
- Workspace target: `effect@4.0.0-rc.112`
- Live reference checked: `effect@4.0.0-rc.115`
- Live reference entries: **18 exports**
- User repo scaffold: `_tx-pub-sub` is not currently present; this bundle does not modify git or the repository.

## What TxPubSub is

`TxPubSub<A>` is a transactional fan-out hub. It does **not** keep one central message buffer. Instead, every current subscriber owns a `TxQueue<A>`, and a publish offers the value to each queue registered at publication time.

That makes three ideas central:

1. **Subscription time matters.** New subscribers receive future publications only; there is no replay of earlier values.
2. **The constructor strategy becomes each subscriber queue's strategy.** Bounded, dropping, sliding, and unbounded therefore describe how slow subscribers affect publication.
3. **Publication is transactional.** For bounded queues, a full subscriber can retry the whole publication transaction, avoiding a partially committed bounded broadcast.

## Teaching stages

### 1. Create

Construct the hub and choose its capacity strategy.

- `bounded(capacity)` — a full subscriber queue retries the publication transaction until space is available.
- `dropping(capacity)` — a full subscriber queue rejects the new value; other subscribers may still accept it; `publish` returns `false` if any delivery was rejected.
- `sliding(capacity)` — a full subscriber queue evicts its oldest queued value and accepts the new one.
- `unbounded()` — subscriber queues have unlimited capacity.

`capacity(hub)` is synchronous metadata. Unbounded hubs report `Infinity`.

### 2. Subscribe

`subscribe(hub)` returns a scoped `TxQueue<A>` using `Effect.acquireRelease`:

- acquire: transactionally create/register a queue;
- release: transactionally unregister and shut down that queue.

For normal application code, `subscribe` is the default because Scope owns the subscription lifetime.

For lower-level transactional composition:

- `acquireSubscriber(hub)` registers a queue inside the caller's transaction;
- `releaseSubscriber(hub, queue)` removes that exact queue and shuts it down inside the caller's transaction.

This pair is useful when subscription registration or cleanup must commit atomically with other transactional state.

### 3. Publish

`publish(hub, value)` broadcasts one value to every current subscriber queue and returns `Effect<boolean>`.

- `true` means every current subscriber accepted the value.
- `false` means the hub was shut down or at least one dropping subscriber rejected the value.
- With zero subscribers, publishing is a successful no-op and returns `true`.
- With the bounded strategy, a full queue retries rather than returning `false`.

`publishAll(hub, iterable)` performs the same operation for an ordered finite batch and returns whether all deliveries were accepted.

A bounded retry is important: because subscriber offers participate in the same transaction, a publish does not commit to only some bounded subscribers while another subscriber is full.

### 4. Shutdown

`shutdown(hub)` is idempotent. It:

1. marks the hub shut down;
2. shuts down the subscriber queues registered at that moment.

After shutdown, `publish` and `publishAll` return `false`.

`awaitShutdown(hub)` reads the shutdown flag in a transaction and calls `Effect.txRetry` while it is still `false`, so fibers can wait efficiently for a committed shutdown.

A source-level gotcha: `acquireSubscriber` itself does not reject a shut-down hub. A queue acquired _after_ shutdown is therefore not automatically shut down by the earlier shutdown call, while new publications still return `false` because the hub remains shut down.

## Public surface inventory

### Constructors — 4

- `bounded`
- `dropping`
- `sliding`
- `unbounded`

### Getters — 2

- `capacity`
- `size`

`size` is the **maximum pending length among current subscriber queues**, not a count of messages in a central buffer and not a sum across subscribers.

### Predicates — 3

- `isEmpty`
- `isFull`
- `isShutdown`

`isEmpty` means every subscriber queue is empty. `isFull` means at least one finite-capacity subscriber queue is full. With no subscribers, `isFull` is `false`.

### Model — 1

- `TxPubSub`

The public model exposes the strategy and capacity; the subscriber list and shutdown state live in internal `TxRef`s.

### Mutations / lifecycle — 7

- `publish`
- `publishAll`
- `subscribe`
- `acquireSubscriber`
- `releaseSubscriber`
- `shutdown`
- `awaitShutdown`

### Guard — 1

- `isTxPubSub`

Total: **18** live API entries / unique top-level source names.

## Strategy matrix

| Strategy  | Full subscriber queue              | Publisher result                         | Backlog effect                            |
| --------- | ---------------------------------- | ---------------------------------------- | ----------------------------------------- |
| bounded   | transaction retries                | eventually `true` if publication commits | preserves queued values                   |
| dropping  | reject newest value for that queue | `false` if any queue rejects             | keeps older queued values                 |
| sliding   | evict oldest then accept newest    | normally `true` while hub is live        | preserves freshest values                 |
| unbounded | cannot fill by capacity            | `true` while hub is live                 | backlog can grow without a capacity limit |

## Transaction boundaries

Every public operation that reads or changes transactional state is built from `TxRef` / `TxQueue` effects. Use an explicit `Effect.tx(...)` when a pub/sub operation must commit together with **other** transactional state.

The lower-level `acquireSubscriber` / `releaseSubscriber` helpers explicitly require the transaction service so they can be embedded in a larger atomic workflow. `subscribe` wraps those helpers in scoped acquisition/release for the common case.

## Runtime vs Foldkit model

The live hub, subscriber queues, scopes, and transactional references are runtime synchronization state. They do not belong in the serializable Foldkit `Model`.

The lesson model stores only stage/case selections; all real `TxPubSub` examples remain module-level values.

## Version note

The rc.112 and rc.115/rc.117 modules expose the same 18-name public surface and the same behavior. The only source delta is the private runtime marker:

- rc.112: `~effect/transactions/TxPubSub`
- rc.115+: `~effect/TxPubSub`

The lesson never hard-codes that marker and remains compatible with the workspace pin.

## Foldkit message shape

The lesson uses the corrected direct field-map form:

```ts
export const Message = defineMessageUnion({
    SelectedTxPubSubStage: { stage: Stage },
    SelectedTxPubSubCreateCase: { createCase: CreateCase },
    SelectedTxPubSubSubscribeCase: { subscribeCase: SubscribeCase },
    SelectedTxPubSubPublishCase: { publishCase: PublishCase },
    SelectedTxPubSubShutdownCase: { shutdownCase: ShutdownCase },
})
```

The variant values are field objects, **not** `Schema.Struct(...)` values.

## Validation

The standalone TypeScript check intentionally uses `--noResolve`, so workspace imports cannot resolve. The expected diagnostics are only:

- `effect`
- `foldkit`
- `foldkit/message`
- `foldkit/struct`
- `@foldkit/ui`
- `foldkit/html`

No additional TypeScript diagnostics remain, and the generated files contain no explicit `any` annotations.
