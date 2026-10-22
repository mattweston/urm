# Effect v4 — TxDeferred lesson

A standalone Foldkit lesson for Effect's `TxDeferred` module.

- Live docs page checked: Effect `4.0.0-rc.115`
- Live docs surface: **8 exports**
- Workspace source target: Effect `4.0.0-rc.112`
- Teaching stages: **Create → Wait → Complete → Inspect**
- Repo scaffold `packages/features/src/labs/_tx-deferred/` is intentionally untouched.

## What TxDeferred is

`TxDeferred<A, E>` is a write-once transactional cell backed by a `TxRef<Option<Result<A, E>>>`.

It has three meaningful states:

1. **Empty** — `Option.none()`
2. **Completed successfully** — `Option.some(Result.succeed(value))`
3. **Completed with typed failure** — `Option.some(Result.fail(error))`

The write-once rule is enforced transactionally: the first completion stores the `Result` and returns `true`; later completion attempts leave the stored result unchanged and return `false`.

## The key distinction: `await` vs `poll`

`TxDeferred.await` and `TxDeferred.poll` both read the same transactional backing state, but they deliberately mean different things.

`await` runs transactionally. If the deferred is empty, it calls `Effect.txRetry`, causing the transaction to retry only when relevant transactional state changes. Once a completion exists, `await` unwraps the `Result`: success becomes the Effect success value and failure becomes the typed Effect error.

`poll` never retries merely because the cell is empty. It returns the raw `Option<Result<A, E>>`, so absence and failure remain values the caller can inspect.

```ts
const deferred = yield* TxDeferred.make<number, string>()

const before = yield* TxDeferred.poll(deferred)
// Option.none()

yield* TxDeferred.succeed(deferred, 42)

const after = yield* TxDeferred.poll(deferred)
// Option.some(Result.succeed(42))

const value = yield* TxDeferred.await(deferred)
// 42
```

## Write-once completion

All three completion helpers share the same atomic rule.

```ts
const deferred = yield* TxDeferred.make<number, string>()

const first = yield* TxDeferred.succeed(deferred, 42)
const second = yield* TxDeferred.fail(deferred, "too late")

// first  === true
// second === false
```

`succeed` and `fail` are convenience wrappers around `done`:

```ts
TxDeferred.succeed(deferred, value)
// equivalent intent to:
TxDeferred.done(deferred, Result.succeed(value))

TxDeferred.fail(deferred, error)
// equivalent intent to:
TxDeferred.done(deferred, Result.fail(error))
```

`done` is the lower-level completion operation when producer code already has a `Result<A, E>`.

## Transactional composition

A `TxDeferred` participates in Effect transactions just like other transactional references. This means completion can be committed atomically with changes to other `TxRef`-backed state.

```ts
const deferred = yield* TxDeferred.make<number, string>()
const version = yield* TxRef.make(0)

yield* Effect.tx(
  Effect.gen(function*() {
    yield* TxRef.set(version, 1)
    yield* TxDeferred.succeed(deferred, 42)
  })
)
```

This is the important difference from ordinary `Deferred`: `TxDeferred` is designed for coordination **inside the transactional state model**. If a larger invariant spans the deferred plus other transaction variables, put those operations in the same `Effect.tx`.

## Full live API surface

The live API page documents 8 entries.

### Constructors

- `make`

Creates a new empty transactional deferred. Internally it creates a `TxRef<Option<Result<A, E>>>` initialized to `Option.none()`.

### Getters

- `await`
- `poll`

`await` retries the transaction while empty and later unwraps success/failure into the Effect channels.

`poll` returns `Option<Result<A, E>>` immediately without retrying merely because the cell is empty.

### Guards

- `isTxDeferred`

Narrows an unknown value to `TxDeferred<unknown, unknown>` by checking the runtime marker.

### Models

- `TxDeferred`

The interface is inspectable and pipeable and exposes its transactional backing `ref`.

### Mutations

- `done`
- `fail`
- `succeed`

Each returns `Effect<boolean>`. `true` means that operation performed the first completion; `false` means the deferred was already completed.

## Source-count note

A simple regex over the TypeScript source finds 7 unique declared top-level names because `await` is implemented as a local `await_` and re-exported as `await`:

```ts
export { await_ as await }
```

The public docs correctly count that alias, giving 8 public entries.

## rc.112 → rc.115/rc.117 delta

The public API and observable transactional behavior are stable across the workspace pin and the newer tags checked.

The only source-level change is the private runtime marker:

| Version         | private TypeId                    |
| --------------- | --------------------------------- |
| rc.112          | `~effect/transactions/TxDeferred` |
| rc.115 / rc.117 | `~effect/TxDeferred`              |

The lesson does not hard-code that string. Use `TxDeferred.isTxDeferred` when narrowing unknown values.

## Lesson map

### Create

- `Empty` — construct and poll an empty cell
- `TypedError` — understand `TxDeferred<A, E>` as a success/error contract
- `Guard` — narrow unknown values with `isTxDeferred`
- `Backing` — inspect the `TxRef<Option<Result<A, E>>>` model

### Wait

- `Await` — transactional waiting
- `Retry` — why emptiness causes `Effect.txRetry`
- `Success` — completed success unwraps into the success channel
- `Failure` — completed failure unwraps into the typed error channel

### Complete

- `Succeed` — complete with a value
- `Fail` — complete with a typed error
- `Done` — complete with an existing `Result`
- `FirstWins` — subsequent completion attempts return `false`

### Inspect

- `PollEmpty` — inspect without blocking
- `PollSuccess` — successful result remains data
- `PollFailure` — failure remains data when polling
- `Transaction` — complete atomically with another `TxRef` update

## Foldkit design

The Foldkit model contains only serializable lesson selections:

```ts
{
  stage,
  createCase,
  waitCase,
  completeCase,
  inspectCase
}
```

Live `TxDeferred`, `TxRef`, `Option`, and `Result` values stay in module-level Effect programs rather than being stored inside the UI model.

The message union uses Foldkit's current direct fields-map shape:

```ts
export const Message = defineMessageUnion({
  SelectedTxDeferredStage: { stage: Stage },
  // ...
})
```

Do not wrap those fields in `S.Struct(...)`; `defineMessageUnion` itself constructs the tagged structs.

## Validation

The standalone lesson was checked with:

```sh
tsc --noEmit --noResolve --allowImportingTsExtensions \
  --target ES2022 --module ESNext --moduleResolution bundler \
  --skipLibCheck --noImplicitAny \
  tx-deferred.ts tx-deferred.view.ts
```

Only the expected unresolved package imports remain in this isolated `/mnt/data` build:

- `effect`
- `foldkit`
- `foldkit/message`
- `foldkit/struct`
- `@foldkit/ui`
- `foldkit/html`

There are no additional TypeScript diagnostics and no explicit `any` annotations in the generated lesson files.
