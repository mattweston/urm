# TxPriorityQueue

A standalone Foldkit lesson for `effect/TxPriorityQueue`, organized as **Create → Enqueue → Dequeue → Refine**.

The workspace snapshot targets `effect@4.0.0-rc.112`. The live Effect API page currently renders `4.0.0-rc.115` and reports **19 exports**. The rc.112 and rc.115/rc.117 public operation sets are the same; the only source delta is the private runtime marker changing from `~effect/transactions/TxPriorityQueue` to `~effect/TxPriorityQueue`.

## Mental model

`TxPriorityQueue<A>` stores a sorted `Chunk<A>` inside a `TxRef` and retains the `Order<A>` used to define priority. The first element under that ordering is the queue head: `peek` observes it and `take` removes it.

With `Order.Number`, ascending numeric order means the smallest number is taken first. A custom `Order` can invert or project domain priority however the application needs.

## Four stages

### 1. Create

- `empty(order)` creates an empty transactional queue.
- `fromIterable(order, iterable)` materializes and sorts the source iterable.
- `make(order)(...values)` is the variadic constructor and delegates to `fromIterable`.
- The supplied `Order` is stored on the queue and reused for later offers.

### 2. Enqueue

- `offer(queue, value)` inserts one value into its sorted position.
- `offerAll(queue, values)` combines current and new values and sorts the whole result.
- Equal-priority `offer` calls are inserted after existing equal values, preserving arrival order among values for which the `Order` returns equality.
- Individual queue operations are transactional already. Wrap related queue and other transactional state changes in one `Effect.tx(...)` when they form one invariant.

### 3. Dequeue

- `take` removes and returns the priority head. If the queue is empty it calls `Effect.txRetry`, so the transaction waits for relevant transactional state to change.
- `takeOption` removes the head when present and returns `Option.none()` immediately when empty.
- `takeUpTo(n)` atomically drains up to `n` values in priority order.
- `takeAll` atomically drains the whole queue and leaves it empty.

### 4. Refine

- `peek` observes the priority head without removing it and retries transactionally while empty.
- `peekOption` observes the head without retrying and returns `Option.none()` on an empty queue.
- `removeIf` removes matching values; `retainIf` keeps only matching values. Survivors remain in valid priority order.
- `toArray` returns a plain Array snapshot in priority order without removing elements.

## Public API inventory

### Models

- `TxPriorityQueue`

### Constructors

- `empty`
- `fromIterable`
- `make`

### Getters

- `size`
- `peek`
- `peekOption`

### Predicates

- `isEmpty`
- `isNonEmpty`

### Mutations

- `offer`
- `offerAll`
- `take`
- `takeAll`
- `takeOption`
- `takeUpTo`

### Filtering

- `removeIf`
- `retainIf`

### Converting

- `toArray`

### Guards

- `isTxPriorityQueue`

That is **19 unique public names / 19 live docs entries**.

## Semantics worth remembering

`peek` and `take` are not ordinary polling operations. On an empty queue they use `Effect.txRetry`, which aborts the current transactional attempt and waits until one of the transactional values read by that attempt changes. Their `Option` counterparts do not retry.

`takeAll` and `takeUpTo` use one `TxRef.modify`, so the returned batch and queue remainder are one atomic state transition.

`removeIf` and `retainIf` filter the already sorted Chunk. Filtering does not reorder surviving elements.

`toArray` is a snapshot: later offers, takes, or filtering operations mutate the queue's transactional state, not an Array already returned to the caller.

## Foldkit integration

The Foldkit model stores only serializable UI selections. The live `TxPriorityQueue`, its `TxRef`, and its `Order` remain module-level/runtime Effect values rather than entering the model.

`defineMessageUnion` uses Foldkit's direct fields-map form:

```ts
export const Message = defineMessageUnion({
    SelectedTxPriorityQueueStage: { stage: Stage },
    SelectedTxPriorityQueueCreateCase: { createCase: CreateCase },
    SelectedTxPriorityQueueEnqueueCase: { enqueueCase: EnqueueCase },
    SelectedTxPriorityQueueDequeueCase: { dequeueCase: DequeueCase },
    SelectedTxPriorityQueueRefineCase: { refineCase: RefineCase },
})
```

## Validation

The standalone lesson is checked with TypeScript in no-resolve mode. The only expected diagnostics are the unresolved workspace imports (`effect`, `foldkit`, `foldkit/message`, `foldkit/struct`, `@foldkit/ui`, and `foldkit/html`). Generated lesson files contain no explicit `any` annotations.
