# Latch

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/Latch

The current `packages/effect/src/Latch.ts` source exposes **11 public exports**:

- `Latch`
- `make`
- `makeUnsafe`
- `open`
- `openUnsafe`
- `release`
- `await`
- `close`
- `closeUnsafe`
- `whenOpen`
- `isOpen`

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `latch.ts` — real constructors, state transitions, gating effects, release
  semantics, and reusable close/open transitions.
- `latch.view.ts` — interactive visual demo.
- `latch-preview.png` — static preview of the default Create stage.

## Intended location

```text
packages/features/src/learn/latch/
├── latch.ts
└── latch.view.ts
```

No parent router/model/message/update files are modified.

## Core model

A `Latch` is a reusable two-state coordination primitive:

```text
closed
  ↓ waiters suspend

open
  ↓ waiters pass
```

The key subtlety is that the module has **two different ways to resume current
waiters**:

```text
open
release
```

They are not equivalent.

`open` changes persistent latch state:

```text
closed → open
```

and therefore affects:

```text
current waiters
future waiters
```

`release` lets the current waiting generation continue but leaves the latch
closed:

```text
closed → still closed
```

so a later waiter suspends again.

That distinction drives the visual demo.

## 1. Create

### `make`

The normal constructor is:

```ts
const latch =
    yield* Latch.make()
```

Its type is:

```text
Effect<Latch>
```

The default state is closed.

Pass:

```ts
true
```

to begin open:

```ts
const latch =
    yield* Latch.make(
        true
    )
```

### `makeUnsafe`

Synchronous allocation is available outside Effect code:

```ts
const latch =
    Latch.makeUnsafe()
```

This returns the `Latch` immediately rather than returning an Effect.

It follows the same initial-state rule:

```text
undefined / false -> closed
true              -> open
```

### `isOpen`

The synchronous predicate:

```ts
Latch.isOpen(
    latch
)
```

observes the current state without changing it or suspending.

The interface also exposes the equivalent instance method:

```ts
latch.isOpen()
```

## 2. Gate

### `await`

The exported function:

```ts
Latch.await(
    latch
)
```

and the instance field:

```ts
latch.await
```

represent:

```text
Effect<void>
```

When the latch is closed, the current fiber suspends.

When the latch is already open, the wait completes immediately.

A suspended wait can resume because of either:

```text
open
release
```

### `whenOpen`

`whenOpen` gates another Effect:

```ts
const gated =
    Latch.whenOpen(
        latch,
        Effect.succeed(
            "work ran"
        )
    )
```

It can also be used in pipe-friendly form.

The important type property is that the supplied Effect's:

```text
success
error
requirements
```

are preserved.

Conceptually:

```text
Effect<A, E, R>
        ↓ whenOpen
Effect<A, E, R>
```

The latch adds synchronization rather than changing the business Effect's type.

### Real fiber example

`latch.ts` includes an actual `open_gate_program`.

It:

1. creates a closed latch,
2. forks a child fiber waiting on `latch.await`,
3. opens the latch,
4. joins the waiting fiber.

This mirrors the public source documentation's normal coordination pattern.

## 3. Release

This is the most important distinction in the module.

### `open`

```ts
const changed =
    yield* Latch.open(
        latch
    )
```

returns:

```text
Effect<boolean>
```

The boolean is:

```text
true  closed -> open happened
false latch was already open
```

Opening also releases fibers currently waiting.

Because the latch remains open, later waiters do not suspend.

### `release`

```ts
const released =
    yield* Latch.release(
        latch
    )
```

also returns:

```text
Effect<boolean>
```

For a closed latch it resumes the current waiting generation **without opening
the latch**.

After release:

```ts
Latch.isOpen(
    latch
)
// false
```

A later waiter therefore blocks again until another:

```text
open
release
```

signal.

If `release` is called while the latch is already open, its result is `false`.

### Mental model

Use:

```text
open
```

for:

> The condition is now true; current and future fibers may pass.

Use:

```text
release
```

for:

> Let the fibers waiting right now pass, but keep the gate closed for arrivals
> after this pulse.

## 4. Reuse

Unlike a one-way countdown latch, Effect's Latch is explicitly reusable.

### `close`

```ts
const changed =
    yield* Latch.close(
        latch
    )
```

changes:

```text
open → closed
```

so future `await` and `whenOpen` calls suspend again.

The returned boolean is:

```text
true  the latch changed open -> closed
false it was already closed
```

### `openUnsafe`

```ts
Latch.openUnsafe(
    latch
)
```

performs the open transition synchronously and returns the same changed-state
boolean.

### `closeUnsafe`

```ts
Latch.closeUnsafe(
    latch
)
```

is the corresponding synchronous close transition.

The demo runs:

```text
initially open

closeUnsafe -> true
closeUnsafe -> false

openUnsafe  -> true
openUnsafe  -> false
```

to make idempotent transition reporting visible.

## Instance API versus module helpers

The `Latch` interface itself contains:

```text
open
openUnsafe
release
await
close
closeUnsafe
whenOpen
isOpen
```

and the module exposes helper functions for the same operations.

This gives both styles:

```ts
yield* latch.open
```

and:

```ts
yield* Latch.open(
    latch
)
```

Likewise:

```ts
latch.isOpen()
```

and:

```ts
Latch.isOpen(
    latch
)
```

## Latch versus Semaphore

The Effect guide describes Latch as a gate for fibers waiting on a condition or
event.

A semaphore with one permit instead models mutual exclusion or bounded
concurrency.

A concise distinction is:

```text
Latch
  "wait until this condition is signaled"

Semaphore
  "only N fibers may enter at once"
```

The Latch is especially useful for initialization gates, staged startup, test
coordination, and reusable phase barriers where a simple open / closed signal is
the right model.

## Boolean transition results

Several operations report whether they changed persistent state.

### Open

```text
closed → open = true
open   → open = false
```

### Close

```text
open   → closed = true
closed → closed = false
```

`release` is different because it is about releasing the current waiter
generation rather than changing persistent open/closed state.

## Unsafe operations

The `Unsafe` suffix here means:

```text
perform the state change synchronously now
```

rather than:

```text
return an Effect describing the transition
```

The unsafe constructor / transition helpers can be appropriate at carefully
controlled synchronous boundaries.

Inside normal Effect workflows, prefer the effectful forms.

## Type discipline

The generated demo has no explicit `any` annotations.

Every Message payload and UI callback that could lose contextual typing has an
explicit type.

The real sample programs use concrete `Array<string>` event storage and do not
weaken the fiber / effect examples with untyped callback parameters.

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
resolved, so this check is used to catch local syntax and implicit-any problems,
not to replace a full typecheck inside the target monorepo.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `LatchDemo.Message` to the parent Message union,
3. initialize `LatchDemo.init`,
4. delegate child messages to `LatchDemo.update`,
5. render `LatchDemo.view(...)` from the Latch route.

This artifact intentionally performs none of those edits.
