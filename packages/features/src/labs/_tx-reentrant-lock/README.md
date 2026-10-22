# `TxReentrantLock`

`TxReentrantLock` is a transactional, fiber-owned read/write lock. Multiple fibers may hold read locks together, one fiber may hold the write lock exclusively, and the same fiber may reacquire locks without deadlocking itself. Conflicting acquisitions use transactional retry rather than polling.

This standalone lesson uses four stages:

- **Create** — construct the lock and inspect lock state.
- **Read** — shared reads, same-fiber reentrancy, concurrency, and manual release.
- **Write** — exclusive ownership, writer reentrancy, read-to-write upgrade, and manual release.
- **Scope** — scoped locks and wrapper helpers that pair acquisition with release.

## Public surface

The live v4 reference renders `effect` **4.0.0-rc.115** with **17 exports** for `TxReentrantLock`.

### Model

- `TxReentrantLock`

### Constructor

- `make`

### Read/write mutations

- `acquireRead`
- `acquireWrite`
- `releaseRead`
- `releaseWrite`
- `readLock`
- `writeLock`
- `withReadLock`
- `withWriteLock`
- `withLock`

### Getters

- `locked`
- `readLocked`
- `readLocks`
- `writeLocked`
- `writeLocks`

### Guard

- `isTxReentrantLock`

## Mental model

Internally the lock keeps one transactional state value:

```ts
{
  readers: HashMap<fiberId, reentrantReadCount>,
  writer: Option<[fiberId, reentrantWriteCount]>
}
```

Ownership is therefore **per fiber** rather than global. A second acquisition by the same fiber increments that fiber's count and each acquisition must later be released.

## Read locking

`acquireRead` succeeds when there is no writer owned by another fiber. Other readers do not conflict, so many fibers may read concurrently. If the current fiber already owns the write lock, it may also acquire a read lock.

When another fiber owns the writer, the acquisition uses `Effect.txRetry`; the transaction suspends until observed transactional state changes.

`releaseRead` decrements the current fiber's count and returns the remaining count. The final release removes that fiber from the reader map. Releasing when the current fiber holds no read lock returns `0`.

## Write locking

`acquireWrite` succeeds only when no conflicting owner exists:

- another fiber's writer blocks it;
- another fiber's positive read count blocks it;
- the same fiber's existing writer does **not** block it;
- the same fiber's existing read locks do **not** block it.

That last rule permits a same-fiber read-to-write **upgrade** when the current fiber is the only reader. The read lock is not consumed by the upgrade; read and write counts remain independent.

`releaseWrite` decrements the current writer's reentrant count. At zero the writer slot becomes empty. A non-owner release returns `0` without changing the actual owner.

## Scoped and wrapper forms

Manual acquire/release is available, but the safer default is bracketed ownership:

- `readLock` acquires one read count for a `Scope` and releases it when the scope closes.
- `writeLock` does the same for exclusive write ownership.
- `withReadLock(lock, effect)` runs one effect under a read lock.
- `withWriteLock(lock, effect)` runs one effect under a write lock.
- `withLock` is an alias for `withWriteLock`.

The wrapper forms use acquire/use/release semantics, so release follows success, typed failure, defects, and interruption of the protected effect.

## Counts and status

`readLocks` is the **total** number of read acquisitions across all fibers. `writeLocks` is `0` when there is no writer or the current writer's reentrant count otherwise. `readLocked` and `writeLocked` answer whether either mode is held, while `locked` combines both.

These APIs expose current state; they do not describe queued waiters or promise any fairness policy.

## Version note

The workspace pin (`4.0.0-rc.112`) and live rc.115/rc.117 expose the same 17-name public surface and the same lock behavior. After stripping comments and whitespace, the only code-level source difference is the private runtime marker:

- rc.112: `~effect/transactions/TxReentrantLock`
- rc.115+: `~effect/TxReentrantLock`

The lesson uses only exported APIs and `isTxReentrantLock`, so it does not depend on either private marker string.

## Foldkit architecture

The Foldkit model stores only serializable lesson state: selected stage and case names. The live `TxReentrantLock`, its `TxRef`, fiber ownership, and lock counts remain runtime Effect values.

`defineMessageUnion` uses Foldkit's direct field-map shape:

```ts
export const Message = defineMessageUnion({
  SelectedTxReentrantLockStage: { stage: Stage },
  SelectedTxReentrantLockCreateCase: { createCase: CreateCase },
  SelectedTxReentrantLockReadCase: { readCase: ReadCase },
  SelectedTxReentrantLockWriteCase: { writeCase: WriteCase },
  SelectedTxReentrantLockScopeCase: { scopeCase: ScopeCase },
})
```

## Files

- `tx-reentrant-lock.ts` — Effect examples, schemas, model, messages, update, and visual snapshots.
- `tx-reentrant-lock.view.ts` — generic Foldkit UI.
- `tx-reentrant-lock-preview.png` — initial **Create / Make** state.
