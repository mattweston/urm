# Ref

Standalone FoldKit teaching demo for:

https://effect.website/docs/v4/api/effect/Ref

The current Effect v4 API reference displays `4.0.0-rc.116` and reports 17 API
entries. The URM workspace pins Effect `4.0.0-rc.112`, while the vendored
`.context/effect` snapshot identifies itself as `4.0.0-rc.108`. The runtime
functions used by this lesson are present in the vendored `Ref.ts` source and
match the current v4 reference used for the lesson.

## Files

- `ref.ts` — real Effect programs, Schema model, messages, pure update, and
  visual teaching snapshots.
- `ref.view.ts` — interactive FoldKit view.
- `ref-preview.png` — static preview of the initial Create / Effect state.

## Intended location

```text
packages/features/src/learn/_ref/
├── README.md
├── ref.ts
└── ref.view.ts
```

The existing `_ref` git scaffold is intentionally left untouched. No parent
router, model, message, update, export map, or repository file is changed by
this artifact.

## What Ref is for

`Ref<A>` is a fiber-safe mutable cell used inside Effect programs.

It holds one `A` and exposes reads, replacements, and state transformations as
Effects:

```text
Ref<A>
    one current A

Ref.get
    read A

Ref.set / update / modify
    atomically change A
```

The important difference from an ordinary mutable variable is not merely the
API shape. The state operations are explicit Effect values and the transform
helpers perform their read/derive/write sequence as one synchronous atomic
operation.

## Public surface

The current API page reports 17 entries. They consist of the `Ref` model / type
namespace plus 15 runtime functions.

### Construction

- `make`
- `makeUnsafe`

### Reading

- `get`
- `getUnsafe`

### Replacement

- `set`
- `getAndSet`
- `setAndGet`

### Transformation

- `update`
- `getAndUpdate`
- `updateAndGet`
- `modify`

### Conditional transformation

- `updateSome`
- `getAndUpdateSome`
- `updateSomeAndGet`
- `modifySome`

## 1. Create

### `Ref.make`

```ts
import { Effect, Ref } from "effect"

const program = Effect.gen(function* () {
    const counter = yield* Ref.make(0)

    const before = yield* Ref.get(counter)

    yield* Ref.update(
        counter,
        (value) => value + 1
    )

    const after = yield* Ref.get(counter)

    return { before, after }
})
```

`Ref.make` returns an Effect. That keeps ordinary construction in the same
runtime model as the reads and mutations that follow.

### Unsafe construction / read

```ts
const counter = Ref.makeUnsafe(7)
const value = Ref.getUnsafe(counter)
```

These two functions are synchronous escape hatches. They are useful for trusted
low-level integration code that already owns the runtime boundary.

They are not the normal recommendation for code that is already inside Effect.
Prefer:

```text
Ref.make
Ref.get
```

there.

### Model shape

`Ref<A>` internally contains a `MutableRef<A>`. Its type parameter is invariant:
the same cell both produces and consumes `A` values.

That is different from a pure application model. The live reference represents
runtime identity and mutation, so it should normally stay at the runtime / service
boundary rather than being serialized into FoldKit UI state.

## 2. Exchange

The replacement APIs differ mostly by what they return.

### `set`

```ts
yield* Ref.set(ref, 42)
```

Stores `42` and returns `void`.

### `getAndSet`

```ts
const previous = yield* Ref.getAndSet(
    ref,
    "review"
)
```

If the Ref held `"draft"`:

```text
result  → "draft"
stored  → "review"
```

### `setAndGet`

```ts
const current = yield* Ref.setAndGet(
    ref,
    "published"
)
```

The new value is both stored and returned:

```text
result  → "published"
stored  → "published"
```

### Why not `get` followed by `set`?

When multiple fibers share a Ref, a separate read and write leave an interleaving
point between two independent operations.

Use the combined helper when the read and replacement belong to one atomic
exchange.

## 3. Transform

### `update`

```ts
yield* Ref.update(
    counter,
    (n) => n * 2
)
```

The callback receives the current value and returns the next stored value. The
Effect result is `void`.

### Previous vs current

```ts
const previous = yield* Ref.getAndUpdate(
    counter,
    (n) => n * 2
)
```

For an initial value of `10`:

```text
returns 10
stores  20
```

By contrast:

```ts
const current = yield* Ref.updateAndGet(
    counter,
    (n) => n * 2
)
```

returns the newly stored value.

### `modify`

`modify` is the general atomic primitive:

```ts
const message = yield* Ref.modify(
    counter,
    (n) => [
        `previous value: ${n}`,
        n + 1,
    ] as const
)
```

The callback returns:

```text
[result, nextState]
```

so the Effect result does not have to be either the old or new Ref value.

### Keep the transform synchronous

The callback supplied to `update`, `getAndUpdate`, `updateAndGet`, or `modify`
is an ordinary synchronous function.

That is what lets the implementation perform the whole read/transform/write
without yielding between those steps.

Do not hide asynchronous or Effect execution inside that callback. When the
state transition itself needs effects, use an abstraction designed for that,
such as `SynchronizedRef`.

## 4. Conditional

The conditional family uses `Option`:

```text
Option.some(next)
    store next

Option.none()
    leave the current value unchanged
```

`none` is not a failure. The Effect still succeeds.

### `updateSome`

```ts
yield* Ref.updateSome(
    counter,
    (n) =>
        n % 2 === 0
            ? Option.some(n * 2)
            : Option.none()
)
```

### `getAndUpdateSome`

This always returns the **previous** value, even when `Option.none()` means no
write occurs.

That means the return value alone does not tell you whether the conditional
update applied.

### `updateSomeAndGet`

This returns the **resulting current** value after the optional update.

If the callback returns `none`, that result is simply the unchanged current
value.

### `modifySome`

This is the most general conditional form:

```ts
const note = yield* Ref.modifySome(
    counter,
    (n) => [
        n >= 20
            ? "cap reached"
            : "incremented",
        n >= 20
            ? Option.none()
            : Option.some(n + 1),
    ] as const
)
```

It can return a result explaining the decision while independently choosing
whether a new state should be stored.

## Ref and concurrency

A Ref is useful when multiple fibers intentionally share one state cell.

Prefer one of the atomic transform helpers when a new value depends on the old
value:

```text
update
getAndUpdate
updateAndGet
modify

or their conditional *Some variants
```

Avoid this pattern for a dependent update:

```text
get
    ↓
compute from old value
    ↓
set
```

because those are separate Ref operations.

## Ref and FoldKit

`Ref` and a FoldKit `Model` solve different state problems.

A FoldKit feature normally uses explicit immutable state transitions:

```text
Model + Message
    ↓
update
    ↓
new Model
```

A `Ref` is shared runtime mutation:

```text
Effect runtime / service
    ↓
Ref<A>
    ↓
atomic Effect operations
```

Do not put a live `Ref` in the pure UI Model just to avoid modeling a state
transition.

A useful boundary is:

```text
FoldKit Model
    serializable feature-visible data

Effect runtime / services
    Ref and other mutable concurrency primitives

runtime adapter
    turns meaningful outcomes into Messages
```

## Current API families covered by the visual lesson

### Create

```text
Ref
make
makeUnsafe
get
getUnsafe
```

### Exchange

```text
get
set
getAndSet
setAndGet
```

### Transform

```text
update
getAndUpdate
updateAndGet
modify
```

### Conditional

```text
updateSome
getAndUpdateSome
updateSomeAndGet
modifySome
```

Together the lesson exercises every runtime function on the current Ref page.

## Type discipline

The generated demo has no explicit `any` annotations.

Every custom Ref transformation, FoldKit Message payload, and UI callback that
could lose contextual typing is explicitly typed where useful.

Button attributes are derived from `HtmlBuilder`.

## Validation note

The standalone validation command is:

```text
tsc --noEmit --noResolve --allowImportingTsExtensions
    --target ES2022
    --module ESNext
    --moduleResolution bundler
    --skipLibCheck
    --noImplicitAny
```

In this environment the actual `effect`, `foldkit`, and UI packages are not
resolved, so this check catches local syntax and implicit-any problems rather
than replacing a full typecheck inside the target monorepo.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `RefDemo.Message` to the parent Message union,
3. initialize `RefDemo.init`,
4. delegate child messages to `RefDemo.update`,
5. render `RefDemo.view(...)` from the Ref route.

This artifact intentionally performs none of those edits.
