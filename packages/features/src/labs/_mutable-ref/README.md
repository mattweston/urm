# MutableRef

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/MutableRef

The current Effect source package is `4.0.0-rc.116`.

The current `packages/effect/src/MutableRef.ts` source exposes **17 public
exports**:

- `MutableRef`
- `make`
- `compareAndSet`
- `decrement`
- `decrementAndGet`
- `get`
- `getAndDecrement`
- `getAndIncrement`
- `getAndSet`
- `getAndUpdate`
- `increment`
- `incrementAndGet`
- `set`
- `setAndGet`
- `update`
- `updateAndGet`
- `toggle`

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `mutable-ref.ts` — direct `current` access, set/update return semantics,
  increment/decrement helpers, toggle, and Equal-aware `compareAndSet`.
- `mutable-ref.view.ts` — interactive visual demo.

## Intended location

```text
packages/features/src/labs/mutable-ref/
├── mutable-ref.ts
└── mutable-ref.view.ts
```

No parent router/model/message/update files are modified.

## Core idea

`MutableRef<A>` is a small synchronous mutable reference.

It stores exactly one public mutable field:

```ts
current: A
```

Conceptually:

```text
MutableRef<A>
    ↓
 current: A
    ↓
read / replace / transform synchronously
```

This is deliberately different from Effect `Ref`.

```text
MutableRef
    synchronous operations
    direct `.current` access
    no Effect required

Ref
    Effect-based state operations
    intended for shared state inside Effect programs
    composes with Effect concurrency
```

The visual demo therefore focuses on ordinary synchronous mutation rather than
`yield*`-based Effect workflows.

## 1. Create

### `make`

```ts
const ref =
    MutableRef.make(
        10
    )
```

creates one stable reference object initialized with:

```text
current = 10
```

### Direct `current` access

The model intentionally exposes:

```ts
ref.current
```

for direct reads and writes:

```ts
ref.current
// 10

ref.current =
    20
```

This is the most direct API.

### `get`

```ts
MutableRef.get(
    ref
)
```

returns the current value synchronously.

It is useful when code prefers the module-function / pipeable style used across
Effect's standard library.

### `set`

```ts
const returned =
    MutableRef.set(
        ref,
        30
    )
```

replaces the value and returns:

```text
the same MutableRef
```

so:

```ts
returned === ref
```

is true.

That makes `set` useful for mutation pipelines where reference identity should
remain visible.

## 2. Update

The module has a systematic family of helpers whose names communicate which
value is returned.

## Plain `set`

```ts
MutableRef.set(
    ref,
    value
)
```

returns:

```text
MutableRef<A>
```

while storing the new value.

## `getAndSet`

```ts
const old =
    MutableRef.getAndSet(
        ref,
        newValue
    )
```

returns the **previous** value.

Example:

```text
ref = 10

getAndSet(ref, 20)
    returns 10
    ref becomes 20
```

This resembles a post-assignment operation.

## `setAndGet`

```ts
const next =
    MutableRef.setAndGet(
        ref,
        newValue
    )
```

returns the **new** value.

Example:

```text
ref = 20

setAndGet(ref, 30)
    returns 30
    ref becomes 30
```

## `update`

```ts
MutableRef.update(
    ref,
    (
        value
    ) =>
        transform(
            value
        )
)
```

transforms the current value and returns the same reference.

For example:

```ts
MutableRef.update(
    ref,
    (
        value: number
    ) =>
        value * 2
)
```

changes:

```text
5 → 10
```

while returning the `MutableRef`.

## `getAndUpdate`

```ts
const old =
    MutableRef.getAndUpdate(
        ref,
        transform
    )
```

returns the value **before** the transformation.

Example:

```text
ref = 30

getAndUpdate(ref, n => n * 2)
    returns 30
    ref becomes 60
```

## `updateAndGet`

```ts
const next =
    MutableRef.updateAndGet(
        ref,
        transform
    )
```

returns the value **after** the transformation.

Example:

```text
ref = 60

updateAndGet(ref, n => n + 1)
    returns 61
    ref becomes 61
```

## Naming rule

A useful rule for remembering the API is:

```text
getAndX
    return old value

XAndGet
    return new value

plain X
    return the ref
```

This pattern carries into the numeric helpers too.

## Dual / pipe-friendly forms

The general set / update helpers support both data-first and data-last forms.

For example:

```ts
MutableRef.set(
    ref,
    "running"
)
```

and:

```ts
const setRunning =
    MutableRef.set(
        "running"
    )

setRunning(
    ref
)
```

perform the same mutation.

Likewise, the update helpers can be partially applied.

## 3. Numeric helpers

Numeric MutableRefs have convenience operations for `number`.

## `increment`

```ts
MutableRef.increment(
    counter
)
```

adds one and returns the same MutableRef.

## `incrementAndGet`

```ts
const next =
    MutableRef.incrementAndGet(
        counter
    )
```

increments first and returns the new number.

This behaves like conceptual pre-increment:

```text
++counter
```

For:

```text
counter = 5
```

the result is:

```text
6
```

and the ref also contains `6`.

## `getAndIncrement`

```ts
const old =
    MutableRef.getAndIncrement(
        counter
    )
```

returns the old number and then increments.

This behaves like conceptual post-increment:

```text
counter++
```

For:

```text
counter = 5
```

it returns:

```text
5
```

and leaves:

```text
counter = 6
```

## `decrement`

```ts
MutableRef.decrement(
    counter
)
```

subtracts one and returns the same ref.

## `decrementAndGet`

Pre-decrement style:

```text
decrement
then return new value
```

## `getAndDecrement`

Post-decrement style:

```text
return old value
then decrement
```

So the numeric family is symmetrical:

```text
getAndIncrement
incrementAndGet

getAndDecrement
decrementAndGet
```

## `toggle`

Boolean refs have:

```ts
MutableRef.toggle(
    flag
)
```

which performs:

```text
false → true
true  → false
```

and returns the same MutableRef.

The implementation is simply the boolean-specialized form of an in-place
`update`.

## 4. Compare

### `compareAndSet`

```ts
const changed =
    MutableRef.compareAndSet(
        ref,
        expected,
        replacement
    )
```

checks the current value against `expected`.

If it matches:

```text
current = replacement
return true
```

If it does not:

```text
current unchanged
return false
```

### Match example

```text
current = "initial"

compareAndSet(
    expected = "initial",
    replacement = "updated"
)
    → true
    → current = "updated"
```

### Miss example

After the first update:

```text
current = "updated"

compareAndSet(
    expected = "initial",
    replacement = "failed"
)
    → false
    → current remains "updated"
```

## Effect equality, not only `===`

The implementation compares using:

```ts
Equal.equals(
    expected,
    ref.current
)
```

This is an important semantic point.

The demo defines a value object:

```ts
class Version
    implements Equal.Equal
{
    constructor(
        readonly value: number
    ) {}

    [Equal.symbol](
        that:
            Equal.Equal
    ): boolean {
        return (
            that instanceof Version &&
            this.value ===
                that.value
        )
    }

    [Hash.symbol](): number {
        return Hash.string(
            String(
                this.value
            )
        )
    }
}
```

Then:

```ts
const current =
    new Version(
        1
    )

const expected =
    new Version(
        1
    )
```

are different JavaScript references:

```text
current !== expected
```

but they compare equal under Effect equality.

Therefore:

```ts
MutableRef.compareAndSet(
    ref,
    expected,
    new Version(
        2
    )
)
```

can succeed.

That behavior is more expressive than a CAS built only on object reference
identity.

## Stale expected values

Once the ref has changed from:

```text
Version(1)
```

to:

```text
Version(2)
```

a later compare-and-set still expecting:

```text
Version(1)
```

returns false and leaves the value unchanged.

This makes the operation useful for conditional synchronous replacement based on
an expected state.

## Equality / Hash contract

For custom `Equal` values, preserve the standard Effect contract:

```text
if a equals b
then their hashes should agree
```

The custom demo type keeps its equality / hash field readonly so identity stays
stable.

## MutableRef versus Ref

This distinction matters more than the similar names suggest.

### `MutableRef`

```text
synchronous
mutable object
direct current field
helpers return values immediately
```

For example:

```ts
const ref =
    MutableRef.make(
        0
    )

MutableRef.increment(
    ref
)

const value =
    MutableRef.get(
        ref
    )
```

No Effect runtime is involved.

### `Ref`

Effect's `Ref` is designed for shared mutable state inside Effect programs.

Its operations are Effect values and participate in Effect's controlled
concurrency model.

Conceptually:

```text
MutableRef
    local imperative state primitive

Ref
    Effect-managed shared state primitive
```

Use the model that matches where the mutation lives.

## MutableRef and Foldkit

A Foldkit feature's core `Model` / `update` loop is normally modeled as explicit
data transformation.

MutableRef is therefore not a replacement for the Foldkit Model.

A reasonable role for MutableRef is lower-level localized synchronous state
around an integration boundary, cache, counter, or implementation helper where
object identity and in-place mutation are intentional.

For feature-visible application state, keep using the Foldkit Model / Message /
Update flow so changes remain explicit.

## Inspectable / Pipeable model behavior

`MutableRef` also implements:

```text
Pipeable
Inspectable
```

and its JSON representation contains:

```text
{
    _id:
        "MutableRef",
    current:
        ...
}
```

These model behaviors are implemented on the prototype rather than exposed as
separate top-level exports.

## Current public surface

### Model

- `MutableRef`

### Constructor

- `make`

### Read / write

- `get`
- `set`
- `setAndGet`
- `getAndSet`
- `update`
- `updateAndGet`
- `getAndUpdate`

### Conditional update

- `compareAndSet`

### Numeric helpers

- `increment`
- `incrementAndGet`
- `getAndIncrement`
- `decrement`
- `decrementAndGet`
- `getAndDecrement`

### Boolean helper

- `toggle`

That accounts for all 17 current exports.

## Type discipline

The generated demo has no explicit `any` annotations.

The custom equality value explicitly types `Equal.Equal`, and every update
callback, Message payload, and UI callback that could lose contextual typing has
an explicit type.

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
resolved, so this check catches local syntax and implicit-any issues rather than
replacing a full typecheck inside the target monorepo.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/labs/*` demos:

1. add the child Model to the parent learn Model,
2. add `MutableRefDemo.Message` to the parent Message union,
3. initialize `MutableRefDemo.init`,
4. delegate child messages to `MutableRefDemo.update`,
5. render `MutableRefDemo.view(...)` from the MutableRef route.

This artifact intentionally performs none of those edits.
