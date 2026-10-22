# TxSubscriptionRef

A standalone Foldkit lesson for Effect v4 `TxSubscriptionRef`.

The lesson keeps runtime Effect values outside the serializable Foldkit model and uses four conceptual stages:

1. **Create** — construct and read observable transactional state.
2. **Update** — mutate the current value and publish the new value atomically.
3. **Queue** — subscribe through a scoped transactional queue with current-first semantics.
4. **Stream** — consume the same committed-change feed through `Stream`.

The repository scaffold at `packages/features/src/labs/_tx-subscription-ref` is intentionally left untouched.

## Version target

- Workspace Effect: `4.0.0-rc.112`
- Live reference checked: `4.0.0-rc.115`
- Live documented exports: **12**
- rc.112, rc.115, and rc.117 expose the same 12 public names.
- The only source-level version delta is the private runtime marker:
    - rc.112: `~effect/transactions/TxSubscriptionRef`
    - rc.115+: `~effect/TxSubscriptionRef`

The runnable lesson uses only public APIs, so no compatibility bridge is required.

## Public surface

### Model

- `TxSubscriptionRef<A>` — transactional current value plus a transactional pub/sub channel for committed updates.

### Constructor

- `make(value)` — creates the underlying `TxRef` and an unbounded `TxPubSub` in one transaction.

### Getter

- `get(self)` — reads the current value without subscribing.

### Mutations

- `set(self, value)` — replace the value and publish the replacement.
- `update(self, f)` — derive and publish a new value.
- `getAndSet(self, value)` — return the previous value while storing/publishing the replacement.
- `getAndUpdate(self, f)` — return the previous value while deriving/publishing the next value.
- `updateAndGet(self, f)` — derive/publish the next value and return it.
- `modify(self, f)` — return a separate result `B` while storing/publishing the next `A`.

### Subscriptions

- `changes(self)` — scoped `TxQueue` subscription; first item is the current value, later items are committed updates.
- `changesStream(self)` — `Stream` view of the same current-first committed-change feed.

### Guard

- `isTxSubscriptionRef(value)` — runtime narrowing guard.

## Core semantics

### The value write and publication are one transaction

`modify` reads the underlying `TxRef`, computes the result and next value, writes that value, and publishes it through the internal `TxPubSub` inside `Effect.tx`.

That means the state change and subscriber notification share the same transactional outcome:

- successful commit publishes the new value;
- failed / rolled-back outer transaction does not leave the value changed;
- the corresponding publication does not escape the aborted transaction.

All other mutation helpers are expressed in terms of `modify`, so they inherit the same atomic behavior.

### `changes` closes the subscription gap atomically

A naïve observable-ref implementation can race between “register subscriber” and “read current value”. `TxSubscriptionRef.changes` avoids that gap.

Its acquire transaction performs these operations together:

1. register a new subscriber queue with the internal `TxPubSub`;
2. read the current `TxRef` value;
3. offer that current value into the new subscriber queue.

The subscriber therefore receives a coherent sequence:

`current value at subscription → later committed updates`

The returned queue is scoped. When the scope closes, it is removed from the pub/sub and shut down.

### Updates within one outer transaction

Each mutation helper call publishes its next value transactionally. If two updates happen inside one successful outer `Effect.tx`, both queue offers commit with that transaction and become visible to an already registered subscriber after commit, in call order.

The runnable `atomic_publication_program` demonstrates this with two updates producing `1` then `2`.

### `changesStream` is live, not a history log

`changesStream` is built from `changes` plus repeated transactional `TxQueue.take` operations.

The stream subscription starts when the stream is consumed. Its first element is therefore the ref's **current value at subscription time**. Updates that happened before subscription are not replayed individually.

For example:

- create with `0`;
- set to `1`;
- set to `2`;
- then run `changesStream(ref).pipe(Stream.take(1))`;
- the first streamed value is `2`, not `0`, `1`, `2`.

Use an event log / persistent journal instead when historical transitions must remain replayable for future subscribers.

## Queue vs Stream

Use `changes` when you want direct transactional queue operations such as `TxQueue.take`, `poll`, or composition with other transactional queue state.

Use `changesStream` when stream operators, sinks, and higher-level streaming composition are the natural consumer API. Both expose the same current-first semantics.

## Foldkit integration

The Foldkit model contains only serializable selections:

- stage;
- selected Create case;
- selected Update case;
- selected Queue case;
- selected Stream case.

Runtime `TxSubscriptionRef`, `TxQueue`, `TxPubSub`, and `Stream` values remain module-level program examples rather than being stored in the model.

The message union uses Foldkit's required direct field-map form:

```ts
export const Message = defineMessageUnion({
    SelectedTxSubscriptionRefStage: { stage: Stage },
    SelectedTxSubscriptionRefCreateCase: { createCase: CreateCase },
    SelectedTxSubscriptionRefUpdateCase: { updateCase: UpdateCase },
    SelectedTxSubscriptionRefQueueCase: { queueCase: QueueCase },
    SelectedTxSubscriptionRefStreamCase: { streamCase: StreamCase },
})
```

## Validation

Standalone TypeScript check:

```sh
tsc --noEmit --noResolve --allowImportingTsExtensions \
  --target ES2022 --module ESNext --moduleResolution bundler \
  --skipLibCheck --noImplicitAny \
  tx-subscription-ref.ts tx-subscription-ref.view.ts
```

Expected diagnostics are only unresolved workspace imports:

- `effect`
- `foldkit`
- `foldkit/message`
- `foldkit/struct`
- `@foldkit/ui`
- `foldkit/html`

There are no additional local TypeScript diagnostics and no explicit `any` annotations in the generated lesson files.
