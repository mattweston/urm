# SynchronizedRef

Standalone learning module for [`effect/SynchronizedRef`](https://effect.website/docs/v4/api/effect/SynchronizedRef).

This lesson keeps the repository's `packages/features/src/learn/_synchronized-ref/` scaffold untouched. The generated files are standalone artifacts only.

## Mental model

`SynchronizedRef<A>` is mutable state whose **mutations are serialized**. Its implementation combines:

- a backing `Ref<A>` that stores the current value, and
- a one-permit `Semaphore` that guards every update / modify operation.

That distinction matters most for **effectful transitions**. `updateEffect`, `modifyEffect`, and the effectful `Some` variants hold the semaphore permit from the initial read through the effectful calculation and final commit. A competing mutation waits, then observes the latest committed value.

Reads (`get`, `getUnsafe`) do not acquire the mutation semaphore.

## Lesson stages

### 1. Create

- `make`
- `makeUnsafe`
- `get`
- `getUnsafe`
- the public shape: backing `Ref` + `Semaphore`

### 2. Serialize

- `update`
- `updateEffect`
- `getAndUpdateEffect`
- `updateAndGetEffect`
- concurrent effectful transitions
- failure-before-commit semantics

### 3. Partial

- `updateSome`
- `updateSomeEffect`
- `getAndUpdateSome`
- `getAndUpdateSomeEffect`
- `updateSomeAndGet`
- `updateSomeAndGetEffect`
- `Option.none` as an explicit no-op

### 4. Modify

- `modify`
- `modifyEffect`
- `modifySome`
- `modifySomeEffect`
- choosing previous-vs-new helpers (`getAnd*` vs `*AndGet`)

## Public API inventory

The live Effect API page currently renders `4.0.0-rc.113` and lists 24 exports.

### Constructors (2)

- `make`
- `makeUnsafe`

### Getters (2)

- `get`
- `getUnsafe`

### Model (1)

- `SynchronizedRef`

### Mutations (19)

- `getAndSet`
- `getAndUpdate`
- `getAndUpdateEffect`
- `getAndUpdateSome`
- `getAndUpdateSomeEffect`
- `modify`
- `modifyEffect`
- `modifySome`
- `modifySomeEffect`
- `set`
- `setAndGet`
- `update`
- `updateAndGet`
- `updateAndGetEffect`
- `updateEffect`
- `updateSome`
- `updateSomeAndGet`
- `updateSomeAndGetEffect`
- `updateSomeEffect`

## Important semantics

### Effectful updates are truly serialized

A plain `Ref` can atomically swap already-computed values, but an effectful transition has a wider critical section:

1. read the current value,
2. run an `Effect` that derives the next value,
3. store the derived value.

`SynchronizedRef` keeps the semaphore permit across all three steps. Two effectful updates therefore cannot both read the same old value and later race to commit independently.

### Failed effectful updates do not commit

For `updateEffect` / `modifyEffect` and their partial variants, the backing `Ref` is assigned only in the success callback. If the effect fails, the previous value remains current.

### `Option.none` means no state transition

The `Some` helpers distinguish a real no-op from an update:

- `Option.some(next)` → commit `next`
- `Option.none()` → leave the ref unchanged

The `*AndGet` helpers return the authoritative post-decision current value from the same serialized critical section.

### Return-value families

Use the smallest helper that returns what the caller actually needs:

- `set` / `update` → return `void`
- `getAndSet` / `getAndUpdate` → return the **previous** state
- `setAndGet` / `updateAndGet` → return the **new** state
- `modify` → return an arbitrary `B` while storing a new `A`

Every family has effectful / conditional variants where appropriate.

## Version note: rc.112 → rc.113+

The public function names remain the same across the workspace's Effect `4.0.0-rc.112` and the live `rc.113` page.

The meaningful type-level change is the model declaration:

- rc.112: `SynchronizedRef<A> extends Ref.Ref<A>`
- rc.113+: `SynchronizedRef<A> extends Pipeable`

The interface still exposes `backing: Ref.Ref<A>` and `semaphore: Semaphore`, but code should no longer rely on a `SynchronizedRef` being assignable to APIs that require a plain `Ref`.

The lesson therefore uses only `SynchronizedRef`'s own public operations, which are compatible with both surfaces.

## Foldkit integration

The Foldkit `Model` remains plain serializable lesson state: stage and case names only. Live `SynchronizedRef`, backing `Ref`, and `Semaphore` instances stay in Effect programs rather than in the model.

`defineMessageUnion` is used with **field maps**:

```ts
SelectedSynchronizedRefStage: { stage: Stage }
```

—not `S.Struct(...)` wrappers.

## Validation

The generated files are checked with:

```bash
tsc --noEmit --noResolve --allowImportingTsExtensions \
  --target ES2022 --module ESNext --moduleResolution bundler \
  --skipLibCheck --noImplicitAny \
  synchronized-ref.ts synchronized-ref.view.ts
```

In isolation the only expected diagnostics are unresolved workspace imports (`effect`, Foldkit packages, and `@foldkit/ui`). No explicit `any` annotations are used in the generated lesson.
