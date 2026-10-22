# Semaphore

Standalone Foldkit teaching demo for `effect/Semaphore`.

- Intended repository location: `packages/features/src/labs/_semaphore/`
- Repository scaffold remains untouched (`README.md`, `x.ts`, `x.view.ts` are still empty in git).
- Generated artifacts live only in `/mnt/data/semaphore/`.
- Workspace Effect version: `4.0.0-rc.112`.
- Live Effect API page checked during generation: `4.0.0-rc.115`.
- The rc.112 and rc.115 `Semaphore.ts` sources are byte-identical and expose the same 11 public exports.

## Teaching shape

The lesson uses four stages:

1. **Create** — establish the permit budget and choose `make` vs `makeUnsafe`.
2. **Guard** — prefer automatic permit bracketing with `withPermit`, `withPermits`, and `withPermitsIfAvailable`.
3. **Manual** — use `take`, `takeIfAvailable`, `release`, and `releaseAll` for lower-level protocols.
4. **Resize** — change total capacity without revoking permits already held.

The Foldkit `Model` stores only the selected stage/case. The live `Semaphore` itself stays in runtime Effect code rather than serializable UI state.

## Public API inventory — 11 exports

### Model

- `Semaphore`

### Constructors

- `make`
- `makeUnsafe`

### Combinators

- `resize`
- `withPermits`
- `withPermit`
- `withPermitsIfAvailable`
- `take`
- `takeIfAvailable`
- `release`
- `releaseAll`

The same operations are also available as instance members on the `Semaphore` interface, while the module-level functions provide data-first / curried forms where applicable.

## Core mental model

A semaphore tracks:

```text
free permits = total permits - currently taken permits
```

A guarded effect starts only when its requested permit count fits the current free count. Automatic wrappers then return the permits when the wrapped effect exits.

Permits represent capacity units, not necessarily tasks. A task may take one permit, or several permits if it consumes several units of a shared constrained resource.

## Automatic wrappers

Prefer these APIs whenever permit ownership lines up with one Effect:

```ts
const semaphore = yield* Semaphore.make(2)

const value = yield* Semaphore.withPermit(
    semaphore,
    work
)
```

`withPermits(semaphore, n, effect)` waits until all `n` permits are available before entering `effect`. The permits are returned on success, typed failure, defect, or interruption because release is attached to the effect exit path.

`withPermitsIfAvailable` is the fail-fast variant. It does not wait:

```ts
const result = yield* Semaphore.withPermitsIfAvailable(
    semaphore,
    2,
    work
)
```

- enough permits: runs `work`, returns `Option.some(value)`, then releases the permits;
- not enough permits: returns `Option.none` immediately and never starts `work`.

This is useful for opportunistic background work, load shedding, or fallback paths where queuing would be undesirable.

## Manual permits

Manual permit APIs are intentionally lower level:

- `take(semaphore, n)` waits until `n` permits can be acquired and returns `n`;
- `takeIfAvailable(semaphore, n)` returns `true` only when all `n` permits were acquired immediately;
- `release(semaphore, n)` returns permits and reports the resulting free count;
- `releaseAll(semaphore)` returns all currently taken permits.

Keep manual accounting balanced. If a permit lifetime can be expressed as one guarded Effect, prefer `withPermit` or `withPermits` so failure/interruption paths cannot leak permits.

## Waiter ordering is not strict FIFO

The implementation stores waiting observers in registration order and scans them in that order when permits are released. However, an observer resumes only when enough permits are available for **its own request**.

That means a smaller later request can overtake a larger earlier request. Example:

```text
earlier waiter: needs 3
later waiter:   needs 1
currently free: 1
```

The earlier waiter is inspected first but remains blocked. The later waiter can run because its one-permit request fits. Do not build correctness assumptions on strict FIFO fairness across different requested permit counts.

## Resize semantics

`resize(semaphore, permits)` changes the semaphore's total capacity, not the set of permits already held.

If two permits are currently taken and the total is resized from `2` to `1`:

```text
total = 1
taken = 2
free  = -1
```

The already-running holders are not cancelled or force-released. New acquisitions wait until releases bring the semaphore back within the new capacity.

Growing capacity can immediately make queued requests satisfiable; the implementation schedules the waiting observers to re-check the free count.

So resizing is admission control for future work, not cancellation of current work.

## `make` vs `makeUnsafe`

Use `Semaphore.make(n)` in normal Effect code:

```ts
const semaphore = yield* Semaphore.make(4)
```

Use `Semaphore.makeUnsafe(n)` only when an immediate synchronous value is intentionally needed at a controlled runtime setup or test boundary.

Both produce the same runtime semaphore behavior; the difference is construction boundary.

## Real programs included in `semaphore.ts`

### `bounded_concurrency_program`

Runs four unbounded fibers through a semaphore with two permits and records the peak guarded concurrency.

### `automatic_release_program`

Runs a failing effect through `withPermit`, then proves the permit was returned by acquiring it immediately afterward.

### `immediate_guard_program`

Shows `withPermitsIfAvailable` returning `None` while a permit is held, then `Some` once the permit is released.

### `manual_permit_program`

Demonstrates `take`, `takeIfAvailable`, `release`, and `releaseAll` with explicit permit accounting.

### `resize_program`

Shows that shrinking below currently held permits does not revoke them, and that later releases / growth make new acquisitions possible.

## Foldkit boundary

The Foldkit model is deliberately pure:

```ts
Model = {
  stage,
  createCase,
  guardCase,
  manualCase,
  resizeCase
}
```

Do not put a live `Semaphore` into model state that is intended to be serialized, rendered, replayed, or persisted. Keep the semaphore in Effect runtime/service wiring and have messages express serializable intent such as “start job” or “run guarded request”.

## Validation

Generated files were checked with:

```sh
tsc --noEmit \
  --noResolve \
  --allowImportingTsExtensions \
  --target ES2022 \
  --module ESNext \
  --moduleResolution bundler \
  --skipLibCheck \
  --noImplicitAny \
  semaphore.ts semaphore.view.ts
```

The only diagnostics are the expected unresolved workspace imports (`effect`, `foldkit`, `foldkit/message`, `foldkit/struct`, `@foldkit/ui`, `foldkit/html`) caused by validating these standalone artifacts outside the repository dependency graph.

An explicit `any` scan over the generated TypeScript returns no matches.

## References used

- Live Effect v4 `Semaphore` API page.
- Workspace vendored `.context/effect/packages/effect/src/Semaphore.ts`.
- Upstream `effect@4.0.0-rc.112` and `effect@4.0.0-rc.115` `Semaphore.ts` source comparison.
- `.context/foldkit` conventions plus the neighboring generated Foldkit lesson artifacts.
