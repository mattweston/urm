# `TxSemaphore`

Standalone Foldkit lesson for Effect v4 `TxSemaphore`.

The repository scaffold under `packages/features/src/learn/_tx-semaphore` is intentionally left untouched. These files live only in `/mnt/data/tx-semaphore/`.

## Learning path

The interactive lesson is organized into four stages:

1. **Create** — construct the semaphore and distinguish fixed capacity from current availability.
2. **Acquire** — compare blocking `acquire` / `acquireN` with non-blocking `tryAcquire` / `tryAcquireN`.
3. **Release** — return permits, clamp at capacity, and handle invalid multi-permit counts.
4. **Scope** — bracket effects with `withPermit`, `withPermits`, and `withPermitScoped`.

Each stage has four focused cases while the README inventories the complete public module.

## What `TxSemaphore` is

`TxSemaphore` is a fixed-capacity semaphore whose **available permit count** is stored in a `TxRef<number>`.

That matters because permit accounting can participate in the same Effect transaction as other transactional state. For example, acquiring one permit and incrementing a `TxRef` reservation counter can happen in one outer `Effect.tx` boundary: either both changes commit or neither does.

The public model contains:

- `permitsRef: TxRef<number>` — the current available permit count.
- `capacity: number` — the fixed total permit count.

`capacity` does not shrink when a permit is acquired. Only `available` changes.

## Live v4 surface

The live Effect v4 reference renders `4.0.0-rc.115` and **14 exports**.

### Model

- `TxSemaphore`

### Constructor

- `make`

### Combinators

- `available`
- `capacity`
- `acquire`
- `acquireN`
- `tryAcquire`
- `tryAcquireN`
- `release`
- `releaseN`
- `withPermit`
- `withPermits`
- `withPermitScoped`

### Guard

- `isTxSemaphore`

The source scan has the same 14 unique top-level public names.

## Construction

```ts
const semaphore = yield* TxSemaphore.make(3)
```

A new semaphore starts with:

```txt
capacity  = 3
available = 3
```

`make(0)` is valid. It produces a zero-capacity semaphore whose blocking acquisitions cannot proceed and whose try-acquire operations return `false`.

Negative construction values die with a defect.

## Blocking acquisition

`acquire` consumes one permit. If no permit is currently available, it calls `Effect.txRetry`.

Conceptually:

```txt
available > 0  -> decrement and commit
available == 0 -> retry transaction
```

`acquireN(semaphore, n)` requires **all `n` permits at once**. If fewer are available, the transaction retries until enough permits become available.

A non-positive `n` dies with a defect.

A request larger than the fixed capacity can wait forever because the semaphore can never have enough permits simultaneously.

## Non-blocking acquisition

`tryAcquire` and `tryAcquireN` never wait for permit availability.

```ts
const first = yield* TxSemaphore.tryAcquire(semaphore)
const second = yield* TxSemaphore.tryAcquire(semaphore)
```

They return:

- `true` and decrement the available count when enough permits exist.
- `false` and leave the count unchanged when they do not.

The implementation uses `TxRef.modify`, so the test and decrement are one transactional state operation.

`tryAcquireN` still requires a positive `n`; invalid counts die with a defect.

## Releasing permits

`release` returns one permit, but never grows availability above capacity.

`releaseN` returns several permits with the same capacity clamp:

```txt
nextAvailable = min(capacity, available + n)
```

So over-releasing cannot inflate the semaphore beyond its configured total.

The clamp does **not** track permit ownership. Correct acquire/release pairing remains the caller's responsibility when using the manual APIs.

## Automatic permit lifetimes

For ordinary resource-limiting code, the bracketed helpers are usually safer than manual cleanup.

### `withPermit`

Runs an effect while one permit is held.

```ts
const result = yield* TxSemaphore.withPermit(
  semaphore,
  effect
)
```

The permit is released after success, typed failure, defect, or interruption through Effect's acquire/use/release machinery.

### `withPermits`

The multi-permit form brackets `n` permits around one effect.

```ts
const result = yield* TxSemaphore.withPermits(
  semaphore,
  3,
  effect
)
```

The same positive-count rule and over-capacity waiting caveat as `acquireN` apply.

### `withPermitScoped`

Acquires one permit for the lifetime of the current `Scope`:

```ts
yield* TxSemaphore.withPermitScoped(semaphore)
```

The scope finalizer releases the permit automatically.

This is useful when several effects in one scope should share the same held permit.

## Transactional composition

The lesson includes this pattern:

```ts
const semaphore = yield* TxSemaphore.make(2)
const reservations = yield* TxRef.make(0)

yield* Effect.tx(
  Effect.gen(function*() {
    yield* TxSemaphore.acquire(semaphore)
    yield* TxRef.update(reservations, (count: number) => count + 1)
  })
)
```

Both transactional changes share the same journal and commit together.

That atomic composition is the main semantic difference from using a standalone non-transactional semaphore around unrelated mutable state.

## Version note: rc.112 → rc.115 / rc.117

The public 14-name API and runtime behavior are unchanged across the workspace pin `4.0.0-rc.112`, live docs `4.0.0-rc.115`, and upstream `4.0.0-rc.117`.

The only source difference is the private runtime marker:

```txt
rc.112: ~effect/transactions/TxSemaphore
rc.115+: ~effect/TxSemaphore
```

The lesson uses only the public API and `isTxSemaphore`, so no compatibility bridge is required.

## Foldkit architecture

The Foldkit `Model` stores only serializable UI selections:

```ts
{
  stage,
  createCase,
  acquireCase,
  releaseCase,
  scopeCase
}
```

Live `TxSemaphore` and `TxRef` values stay module-level in demonstration effects.

The message union uses Foldkit's direct field-map form:

```ts
export const Message = defineMessageUnion({
  SelectedTxSemaphoreStage: { stage: Stage },
  SelectedTxSemaphoreCreateCase: { createCase: CreateCase },
  SelectedTxSemaphoreAcquireCase: { acquireCase: AcquireCase },
  SelectedTxSemaphoreReleaseCase: { releaseCase: ReleaseCase },
  SelectedTxSemaphoreScopeCase: { scopeCase: ScopeCase },
})
```

## Files

- `tx-semaphore.ts` — real Effect examples, model, messages, update, stage data.
- `tx-semaphore.view.ts` — generic Foldkit UI.
- `tx-semaphore-preview.png` — initial `Create / Make` state.
- `README.md` — API and semantic reference.

## Validation

The standalone no-resolve TypeScript check reports only the expected unresolved workspace imports:

```txt
effect
foldkit
foldkit/message
foldkit/struct
@foldkit/ui
foldkit/html
```

There are no additional local TypeScript diagnostics and no explicit `any` annotations in the generated TypeScript files.
