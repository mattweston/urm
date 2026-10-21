# SubscriptionRef

Standalone learning artifact for Effect's `SubscriptionRef` module.

The repository's empty `_subscription-ref` scaffold is intentionally left untouched. These files are generated under `/mnt/data/subscription-ref/` only.

## Lesson stages

1. **Create** — construct a ref, read its current value, narrow unknown values, and understand `getUnsafe`.
2. **Observe** — consume `changes`, understand replay-1 semantics, and see when updates do or do not publish.
3. **Update** — compare set/get-and/update helpers, including effectful and conditional forms.
4. **Modify** — return a value different from the stored value while committing the state transition atomically.

## Core model

A `SubscriptionRef<A>` combines three pieces of runtime machinery:

```text
current A
+ Semaphore(1)
+ PubSub<A> with replay 1
```

The current value is mutable. Every mutation runs under the one-permit semaphore, so competing updates are serialized. Every committed value is published to the PubSub. `changes(ref)` simply exposes that PubSub as a `Stream<A>`.

This is runtime synchronization state, not serializable application state. The Foldkit `Model` in this lesson stores only stage/case selections; the live `SubscriptionRef`, `Semaphore`, `PubSub`, `Stream`, `Effect`, fibers, and deferreds stay at the runtime boundary.

## Construction and current reads

```ts
const ref = yield* SubscriptionRef.make(10)
const current = yield* SubscriptionRef.get(ref)
```

`make` creates:

- an unbounded `PubSub<A>` with `replay: 1`,
- a one-permit semaphore,
- the current value,
- and an immediate publication of that initial value.

`get` wraps the current read in `Effect.sync`.

`getUnsafe` returns the current value immediately with direct field access. It is appropriate only when concurrent mutation is controlled.

`isSubscriptionRef` checks the runtime brand and narrows unknown input.

## Observation with `changes`

```ts
SubscriptionRef.changes(ref)
```

returns an ordinary `Stream<A>` built from the internal PubSub.

Because the PubSub has replay capacity `1` and the initial value is published during `make`, a newly attached subscriber starts with the latest replayed value, then sees subsequent committed mutations.

This is **not** an append-only history of every value since the ref was created. Replay retains the latest value for late subscribers.

The lesson's `observe_program` coordinates a subscriber with `Deferred`, then commits values `1` and `2`, producing:

```text
0 → 1 → 2
```

## What counts as a publication

The internal commit helper does two things together:

```text
self.value = newValue
publish(newValue)
```

All normal write/update helpers eventually use that commit path.

Conditional helpers are different: when an `updateSome*` or `modifySome*` function produces `Option.none`, the current value is left unchanged and **nothing is published**.

That makes the optional forms useful when a domain-level no-op should also remain silent to subscribers.

## Serialized mutation

Every mutation uses the internal one-permit semaphore.

For a pure update:

```text
acquire permit
read current
compute next
commit + publish
release permit
```

For an effectful update, the permit remains held while the update `Effect` executes. This prevents two concurrent state transitions from observing the same stale current value and then overwriting one another.

A consequence is that long-running effectful update functions also block competing mutations for their duration.

## Effectful failure semantics

Effectful helpers commit inside `Effect.map` after the update effect succeeds.

So if an update effect fails:

- the previous value remains current,
- no new value is published,
- and the failure is returned to the caller.

This applies to `getAndUpdateEffect`, `updateEffect`, `updateAndGetEffect`, `modifyEffect`, and their optional/effectful variants.

## Old value vs new value helpers

Several helpers perform the same serialized state transition but differ in what they return.

### Return old value

- `getAndSet`
- `getAndUpdate`
- `getAndUpdateEffect`
- `getAndUpdateSome`
- `getAndUpdateSomeEffect`

### Return new/current value afterward

- `setAndGet`
- `updateAndGet`
- `updateAndGetEffect`
- `updateSomeAndGet`
- `updateSomeAndGetEffect`

Choosing the helper whose return value matches the caller avoids reconstructing old/new state outside the critical section.

## `modify`: result and state are separate

`modify` is the most general pure atomic operation:

```ts
SubscriptionRef.modify(ref, (state) => [result, nextState])
```

The returned `result` can be a completely different type from the stored state.

The effectful and optional forms are:

- `modifyEffect`
- `modifySome`
- `modifySomeEffect`

For `modifySome*`, `Option.none` means "return the result, but do not change or publish state".

## Public API inventory

The live Effect v4 page used during generation shows **26 API entries** on `4.0.0-rc.115`.

### Models — 2 docs entries

- `SubscriptionRef` interface
- `SubscriptionRef` namespace, containing the variance marker

### Guard — 1

- `isSubscriptionRef`

### Constructor — 1

- `make`

### Subscription — 1

- `changes`

### Getters — 7

- `getUnsafe`
- `get`
- `getAndSet`
- `getAndUpdate`
- `getAndUpdateEffect`
- `getAndUpdateSome`
- `getAndUpdateSomeEffect`

### Mutations — 14

- `modify`
- `modifyEffect`
- `modifySome`
- `modifySomeEffect`
- `set`
- `setAndGet`
- `update`
- `updateEffect`
- `updateAndGet`
- `updateAndGetEffect`
- `updateSome`
- `updateSomeEffect`
- `updateSomeAndGet`
- `updateSomeAndGetEffect`

The source contains 25 unique top-level declaration names because the interface and companion namespace share the name `SubscriptionRef`; the docs render them separately.

## Workspace vs live API

Workspace Effect pin: `4.0.0-rc.112`.

Live page during generation: `4.0.0-rc.115`.

The upstream `SubscriptionRef.ts` source is byte-identical between those versions. No compatibility shim or version branch is needed in this lesson.

## Real programs included in `subscription-ref.ts`

### `create_program`

Creates a ref and demonstrates `get`, `getUnsafe`, and `isSubscriptionRef`.

### `observe_program`

Starts a `changes` subscriber, waits for its replayed initial observation, commits two updates, and joins the observer fiber.

### `update_program`

Shows old-value return, new-value return, effectful update, and a no-op `Option.none` update.

### `modify_program`

Shows result/state separation with `modify`, `modifyEffect`, and `modifySome`.

## Foldkit message shape

`defineMessageUnion` receives field maps directly:

```ts
export const Message = defineMessageUnion({
  SelectedSubscriptionRefStage: { stage: Stage },
  SelectedSubscriptionRefCreateCase: { createCase: CreateCase },
})
```

Do not wrap the individual variant fields in `S.Struct(...)`; Foldkit constructs the tagged structs itself.

## Validation

Generated files are checked with:

```sh
tsc --noEmit \
  --noResolve \
  --allowImportingTsExtensions \
  --target ES2022 \
  --module ESNext \
  --moduleResolution bundler \
  --skipLibCheck \
  --noImplicitAny \
  subscription-ref.ts subscription-ref.view.ts
```

The expected isolated diagnostics are only unresolved workspace imports:

- `effect`
- `foldkit`
- `foldkit/message`
- `foldkit/struct`
- `@foldkit/ui`
- `foldkit/html`

No explicit TypeScript `any` annotations should appear in the generated lesson files.

## References used

- Live Effect v4 `SubscriptionRef` API page (`4.0.0-rc.115`).
- Workspace vendored `.context/effect/packages/effect/src/SubscriptionRef.ts`.
- Upstream `effect@4.0.0-rc.112` and `effect@4.0.0-rc.115` source comparison.
- `.context/foldkit/packages/foldkit/src/schema/index.ts` for `defineMessageUnion` field-map semantics.
- Existing standalone Foldkit lesson artifacts for UI structure.
