# Random

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/Random

The current Effect source package is `4.0.0-rc.116`.

The current `packages/effect/src/Random.ts` source exposes **9 exported names**:

- `Random` — merged service interface + `Context.Reference`
- `next`
- `nextBoolean`
- `nextInt`
- `nextBetween`
- `nextIntBetween`
- `shuffle`
- `choice`
- `withSeed`

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `random.ts` — injectable Random service, scalar/range generators,
  collection helpers, and seeded programs.
- `random.view.ts` — interactive visual demo.
- `random-preview.png` — static preview of the default Service stage.

## Intended location

```text
packages/features/src/labs/random/
├── random.ts
└── random.view.ts
```

No parent router/model/message/update files are modified.

## Core idea

Random is an **Effect service**, not a set of direct `Math.random()` calls.

All high-level generators read the current `Random.Random` service from the
fiber:

```text
Random.Random service
    ↓
nextDoubleUnsafe / nextIntUnsafe
    ↓
Random.next
Random.nextBoolean
Random.nextInt
Random.nextBetween
Random.nextIntBetween
Random.shuffle
Random.choice
```

That gives application code ordinary effectful random generators while allowing
tests or local regions of a program to replace the underlying generator.

## 1. Service

### `Random.Random` interface

The current service contract is only:

```ts
interface Random {
    nextIntUnsafe():
        number

    nextDoubleUnsafe():
        number
}
```

The same exported name also has the runtime `Context.Reference` value:

```ts
Random.Random
```

So:

```text
Random.Random
```

is both the public type name and the Effect service reference in the merged
TypeScript namespace.

## Higher-level generators

Internal generator helpers retrieve the current Random service from the fiber,
then call one of those two primitive methods.

This means:

```text
Random.next
```

does not call a hard-coded global RNG directly.

Instead it asks the currently provided service for:

```text
nextDoubleUnsafe()
```

Likewise `nextInt` delegates to:

```text
nextIntUnsafe()
```

## Replacing the service

The demo defines:

```ts
const fixed:
    Random.Random = {
        nextIntUnsafe:
            () =>
                7,
        nextDoubleUnsafe:
            () =>
                0.75
    }
```

and locally provides it:

```ts
Random.next.pipe(
    Effect.provideService(
        Random.Random,
        fixed
    )
)
```

That program deterministically produces:

```text
0.75
```

This is useful when tests need exact random draws rather than seeded sequences.

## Default implementation

The current source documentation states that the default implementation is
based on pseudo-random generation and is not intended as a cryptographically
secure source.

Do not use the default `Random` service for:

```text
passwords
cryptographic keys
security tokens
nonces requiring cryptographic unpredictability
```

A replaceable service architecture makes stronger implementations possible, but
the default should be treated as application/testing pseudo-randomness.

## 2. Generate

### `next`

```ts
yield* Random.next
```

returns a floating-point number in:

```text
[0, 1)
```

So:

```text
0
    possible

1
    excluded
```

The current tests explicitly assert both bounds.

## `nextBoolean`

```ts
yield* Random.nextBoolean
```

uses:

```text
nextDoubleUnsafe() > 0.5
```

The threshold is **strictly greater than** `0.5`.

Current tests verify:

```text
draw = 0.5
    → false

draw = 0.500001
    → true

draw = 0.1
    → false
```

This is a small but exact implementation detail.

## `nextInt`

```ts
yield* Random.nextInt
```

returns a JavaScript safe integer.

Current tests check:

```text
Number.isSafeInteger(value)
```

and bounds between:

```text
Number.MIN_SAFE_INTEGER
Number.MAX_SAFE_INTEGER
```

inclusive.

## `nextBetween`

```ts
yield* Random.nextBetween(
    min,
    max
)
```

returns a floating-point number in the half-open range:

```text
[min, max)
```

The implementation does not round the bounds.

Example:

```ts
Random.nextBetween(
    10.5,
    20.5
)
```

remains a floating-point range based on those exact numeric endpoints.

## Degenerate `nextBetween`

When:

```text
min === max
```

the current implementation preserves that bound.

For example:

```text
nextBetween(10, 10)
    → 10
```

The test suite documents this behavior.

## Non-finite bounds

Current tests also document existing behavior for unsupported/non-finite bounds,
rather than presenting them as a validated input domain.

For example, a range ending at `Infinity` can currently produce `Infinity`.

The module does not provide a validation error for such bounds.

If finite ranges are required, validate inputs before calling the generator.

## `nextIntBetween`

```ts
yield* Random.nextIntBetween(
    min,
    max
)
```

first normalizes numeric bounds:

```text
lower:
    Math.ceil(min)

upper:
    Math.floor(max)
```

By default the integer interval is **closed**.

Example:

```ts
Random.nextIntBetween(
    1,
    6
)
```

can return:

```text
1, 2, 3, 4, 5, or 6
```

This differs from `nextBetween`, whose upper bound is excluded.

## Half-open integer ranges

Pass:

```ts
{
    halfOpen:
        true
}
```

to exclude the rounded upper bound.

Example:

```ts
Random.nextIntBetween(
    1,
    6,
    {
        halfOpen:
            true
    }
)
```

can return:

```text
1 through 5
```

but never `6`.

The current tests explicitly verify the upper-bound exclusion using a
near-maximum random draw.

## 3. Collections

### `shuffle`

```ts
yield* Random.shuffle(
    values
)
```

accepts any `Iterable<A>` and returns:

```text
Effect<Array<A>>
```

The implementation first materializes:

```ts
Array.from(
    elements
)
```

then shuffles that new array.

The original iterable / source array is not modified.

The current test suite verifies this by asserting the input array remains
unchanged after shuffling.

## Shuffle algorithm

The implementation walks backward from the end of the copied array and swaps
the current item with an index derived from the active random generator.

It has the shape of a Fisher–Yates shuffle.

The important public behavior is:

```text
same elements
new order
new Array
source unchanged
```

## `choice`

```ts
Random.choice(
    iterable
)
```

selects one value from the materialized iterable.

The interesting part is the **conditional error type**.

## Known non-empty input

For a non-empty readonly array:

```ts
Random.choice(
    [
        "red",
        "green",
        "blue"
    ] as const
)
```

the result is infallible:

```text
Effect<
    "red" | "green" | "blue"
>
```

There is no `NoSuchElementError` because TypeScript already proves an element
exists.

## `NonEmptyIterable`

The same applies to:

```text
NonEmptyIterable.NonEmptyIterable<A>
```

The preceding NonEmptyIterable demo is therefore directly relevant here.

A non-empty iterable yields:

```text
Effect<A>
```

without an empty-input error type.

## General Iterable

For:

```ts
const values:
    ReadonlyArray<string> =
    []
```

TypeScript cannot prove non-emptiness.

So:

```ts
Random.choice(
    values
)
```

has the shape:

```text
Effect<
    string,
    Cause.NoSuchElementError
>
```

## Empty general Iterable

At runtime an empty general iterable fails with:

```text
NoSuchElementError
```

whose current message is:

```text
Cannot select a random element from an empty array
```

The current unit test verifies both the error type and message.

## Why this typing matters

The same runtime operation can therefore become safer as the input type becomes
stronger:

```text
Iterable<A>
    → may be empty
    → Effect<A, NoSuchElementError>

NonEmptyIterable<A>
    → cannot be empty
    → Effect<A>
```

This is a good example of Effect APIs using type-level invariants to remove
impossible errors.

## 4. Seed

### `withSeed`

```ts
program.pipe(
    Random.withSeed(
        seed
    )
)
```

runs the Effect with a deterministic seeded Random service.

Supported seed types are:

```text
string
number
```

## Reproducibility

Given:

```ts
const program =
    Effect.all([
        Random.next,
        Random.next,
        Random.nextInt
    ])
```

then:

```ts
program.pipe(
    Random.withSeed(
        "demo"
    )
)
```

will produce the same sequence every time when run from the same initial seed.

The current test suite verifies same-seed determinism for:

```text
next
nextInt
nextBoolean
shuffle
choice
```

## Different seeds

Current tests also verify that different numeric or string seeds produce
different tested sequences.

For example:

```text
12345
67890
```

do not produce the same sequence in the covered test.

Likewise distinct one-character strings and strings that differ only in their
trailing UTF-8 bytes are tested independently.

## Unicode string seeds

The current tests explicitly include astral Unicode characters such as emoji
and verify distinct seeds are not collapsed together.

This matters because string seed handling must account for UTF-8 encoding
rather than simply truncating to simplistic character codes.

## Seed implementation

Current `withSeed` works by locally providing a seeded Random service:

```text
Effect
    ↓
Random.withSeed(seed)
    ↓
Effect.provideService(
    Random.Random,
    seeded generator
)
```

The seeded generator is implemented in the current source using an
ISAAC-derived pseudo-random generator.

Application code should depend on the public deterministic behavior rather than
that internal algorithm unless compatibility with exact sequences is a project
requirement.

## Seeded examples from current docs

Current source examples document:

```text
Random.next
with seed "example"
→ 0.1633802591287037
```

and:

```text
Random.nextBoolean
with seed "example"
→ false
```

The current `nextIntBetween` example with that seed documents:

```text
[1, 4, 0]
```

for three range calls.

These are useful teaching fixtures, but application code should normally assert
repeatability / valid bounds rather than couple to exact PRNG output unless the
exact sequence is part of the contract.

## Seed is not cryptographic security

A deterministic seed exists specifically to make output reproducible.

That is valuable for:

```text
tests
property-test fixtures
simulations
game replays
debug reproduction
deterministic demos
```

It is the opposite of the unpredictability required for secure secrets.

## Current public surface

### Service

- `Random` interface / reference

### Scalar generators

- `next`
- `nextBoolean`
- `nextInt`
- `nextBetween`
- `nextIntBetween`

### Collections

- `shuffle`
- `choice`

### Providing

- `withSeed`

That accounts for all **9 exported names** in the current source.

## Random and NonEmptyIterable

The previous NonEmptyIterable module directly affects `Random.choice` typing.

This relationship is worth remembering:

```text
NonEmptyIterable
    proves an element exists

Random.choice
    uses that proof
    to remove NoSuchElementError
```

It is a concrete example of a type-only invariant changing an Effect error
channel.

## Random and Effect services

Because Random is a Context Reference, application code does not need a
different API for:

```text
production pseudo-randomness
seeded test randomness
fully fixed test randomness
custom generator implementations
```

All of those can feed the same public generators through service provision.

That keeps domain code independent from the generator implementation.

## Foldkit integration

Random generation is an effectful runtime concern.

Avoid calling random generation directly from a pure Foldkit `view` or `update`.

A clean pattern is:

```text
Foldkit Message
    requests random action

Effect/runtime command
    runs Random generator

resulting random value
    becomes a new Foldkit Message

pure update
    stores value in Model
```

This preserves replayability and testability of the pure Model/update layer.

## Deterministic Foldkit testing

`Random.withSeed` is especially useful for runtime tests around Foldkit
features.

For example:

```text
same initial Model
same Message
same seed
    ↓
same random runtime result
    ↓
same follow-up Message
    ↓
same Model transition
```

This gives reproducible tests without moving random side effects into the pure
update function.

## Type discipline

The generated demo has no explicit `any` annotations.

Every custom Random service method, Foldkit Message payload, and UI callback
that could lose contextual typing has an explicit type where appropriate.

Button attributes are derived from `HtmlBuilder`.

The upstream current `choice` implementation uses an internal `as any` cast to
express its conditional return type. That is separate from the generated
artifact constraint.

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
`features/labs/*` demos:

1. add the child Model to the parent learn Model,
2. add `RandomDemo.Message` to the parent Message union,
3. initialize `RandomDemo.init`,
4. delegate child messages to `RandomDemo.update`,
5. render `RandomDemo.view(...)` from the Random route.

This artifact intentionally performs none of those edits.
