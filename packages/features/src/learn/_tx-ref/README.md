# TxRef

`TxRef<A>` is the primitive transactional reference in Effect v4. It stores one current value, but `get`, `set`, `update`, and `modify` participate in the current transaction journal. Several references can therefore be read and changed inside one `Effect.tx(...)`, then committed together only when the outermost transaction succeeds.

This standalone lesson targets the workspace pin (`effect@4.0.0-rc.112`) while matching the current public v4 surface shown by the live API page (`4.0.0-rc.115`). The public API is stable across rc.112, rc.115, and rc.117; the only source-level change is the private runtime marker changing from `~effect/transactions/TxRef` to `~effect/TxRef`.

## Lesson flow

### 1. Create

- `make(initial)` constructs a fresh `TxRef` inside `Effect`.
- `makeUnsafe(initial)` constructs synchronously for controlled low-level setup.
- A fresh ref starts with its supplied value and transaction bookkeeping (`version`, `pending`).
- The live `TxRef` belongs in runtime Effect state, not in the serializable Foldkit model.

### 2. Read

- `get(ref)` reads the transaction's current view of the reference.
- `get` is implemented in terms of `modify`, so reads join the same journal as writes.
- Once a ref is first touched in a transaction, its version/value snapshot is journaled.
- Repeated reads in the same transaction reuse the journal entry, so they observe earlier writes from that transaction before the outer commit.
- If a conflicting commit invalidates a touched snapshot, the transaction does not partially commit stale state.

### 3. Update

- `set(ref, value)` replaces the value.
- `update(ref, f)` derives the next value from the current value and returns `void`.
- `modify(ref, f)` is the core operation: `f` returns `[result, nextValue]`, so one transactional snapshot determines both the returned result and the next stored value.
- `set` and `update` are convenience forms built on top of `modify`.

A useful pattern is to return a domain result directly from `modify` instead of performing a second read:

```ts
const previous = yield* TxRef.modify(ref, (current) => [
  current,
  current + 1
])
```

### 4. Compose

The main reason to use `TxRef` is composition across several pieces of mutable state:

```ts
yield* Effect.tx(
  Effect.gen(function*() {
    yield* TxRef.update(debit, (n) => n - 10)
    yield* TxRef.update(credit, (n) => n + 10)
  })
)
```

Both refs participate in the same transaction journal and are committed as one outer transaction. If that transaction fails, its journaled changes are discarded rather than partially written.

`Effect.txRetry` is the waiting primitive for transactional conditions. When a transaction retries, Effect tracks the transactional references it accessed; after one of those refs changes, the transaction can be re-run against a fresh view instead of polling mutable state manually.

## Full public surface

The live reference exposes **7 entries**:

| Family       | API          | Purpose                                              |
| ------------ | ------------ | ---------------------------------------------------- |
| Model        | `TxRef<A>`   | Transactional mutable reference                      |
| Constructors | `make`       | Effectful construction                               |
| Constructors | `makeUnsafe` | Synchronous construction                             |
| Combinators  | `get`        | Read the current transaction view                    |
| Combinators  | `set`        | Replace the value                                    |
| Combinators  | `update`     | Transform the value                                  |
| Combinators  | `modify`     | Return a result while atomically storing a new value |

## Journal model

Conceptually, a transaction keeps a journal entry for each touched `TxRef`:

```text
TxRef ── first access ──> { version, value }
                         transaction journal
```

Subsequent transactional reads and writes work against that entry. The outer transaction is responsible for validating and committing the journal. This is why nested `TxRef` helpers compose: they join the active transaction instead of creating independent partial commits.

The public `TxRef` interface currently exposes `value`, `version`, and `pending`, but application code should treat those as runtime implementation state. Use the transactional operations rather than mutating `ref.value` directly.

## Atomicity, rollback, and retry

- **Atomic commit:** several touched refs commit together when the outer transaction succeeds.
- **Rollback on failure:** journaled changes from a failing transaction are not committed to the live refs.
- **Conflict handling:** the transaction can detect that a touched ref changed since its recorded version and avoid committing a stale snapshot.
- **Retry:** `Effect.txRetry` suspends the transactional computation until relevant accessed state changes, then the body may be evaluated again.

Because transaction bodies may be retried, keep irreversible external side effects outside the transactional callback. Use the transaction to decide and commit state, then perform non-transactional effects after the state transition when appropriate.

## Version note

`effect@4.0.0-rc.112` and the live rc.115/rc.117 source expose the same seven public names and the same transactional behavior. The only code-level difference is the private TypeId string:

```text
rc.112: ~effect/transactions/TxRef
rc.115+: ~effect/TxRef
```

The lesson never depends on that marker.

## Foldkit architecture

The Foldkit `Model` contains only serializable stage/case selections. Real `TxRef` values remain module-level/runtime Effect values. Messages use `defineMessageUnion` with **direct field maps**:

```ts
export const Message = defineMessageUnion({
  SelectedTxRefStage: { stage: Stage },
  SelectedTxRefCreateCase: { createCase: CreateCase },
})
```

Do not wrap message fields with `S.Struct(...)`; Foldkit expects the fields object itself.
