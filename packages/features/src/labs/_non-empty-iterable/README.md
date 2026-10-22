# NonEmptyIterable

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/NonEmptyIterable

The current Effect source package is `4.0.0-rc.116`.

The current `packages/effect/src/NonEmptyIterable.ts` source contains **3 named
public teaching entries**:

- `nonEmpty`
- `NonEmptyIterable`
- `unprepend`

The first two are type-level declarations. `unprepend` is the module's runtime
operation.

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `non-empty-iterable.ts` — real `Chunk.make(...)` non-empty values,
  `unprepend`, iterator consumption, generic `Iterable` usage, and
  `Random.choice` integration.
- `non-empty-iterable.view.ts` — interactive visual demo.
- `non-empty-iterable-preview.png` — static preview of the default Guarantee
  stage.

## Intended location

```text
packages/features/src/labs/non-empty-iterable/
├── non-empty-iterable.ts
└── non-empty-iterable.view.ts
```

No parent router/model/message/update files are modified.

## Core idea

`NonEmptyIterable<A>` means:

```text
ordinary JavaScript Iterable<A>
+
compile-time evidence that at least one A exists
```

The current interface is conceptually:

```ts
interface NonEmptyIterable<A>
    extends Iterable<A>
{
    readonly [nonEmpty]: A
}
```

The extra field is a unique-symbol brand used by the type system.

The normal JavaScript iteration protocol is unchanged:

```text
Symbol.iterator()
    ↓
Iterator<A>
    ↓
next()
```

This lets a non-empty iterable work everywhere a normal `Iterable<A>` is
accepted, while APIs that care about emptiness can use the stronger type.

## 1. Guarantee

### `nonEmpty`

The source declares:

```ts
export declare const nonEmpty:
    unique symbol
```

This symbol is used as the brand key on `NonEmptyIterable`.

It is a type-level declaration rather than a runtime wrapper around the
iterable.

Conceptually:

```text
plain Iterable<A>
    maybe empty

NonEmptyIterable<A>
    iterable + evidence of first element
```

## `NonEmptyIterable<A>`

The model extends the standard built-in interface:

```ts
Iterable<A>
```

so ordinary code still works:

```ts
for (
    const value
    of nonEmpty
) {
    // normal iteration
}
```

No conversion to a special collection format is required.

## Why brand the type?

Without a brand, these two types would have the same structural shape:

```text
Iterable<A>
NonEmptyIterable<A>
```

and TypeScript could not distinguish whether the producer had actually proved
non-emptiness.

The unique-symbol property gives the stronger model a distinct compile-time
identity.

## Producer responsibility

The brand is only useful when a producer earns it legitimately.

For example, Effect's `Chunk.NonEmptyChunk<A>` extends `NonEmptyIterable<A>` and
`Chunk.make(1, 2, 3)` produces a known non-empty Chunk.

A user-written unsafe assertion could lie to the type system.

That matters because consumers are allowed to rely on the non-empty contract.

## Defensive runtime check

Although the type says an element must exist, the current implementation of
`unprepend` still checks:

```text
iterator.next().done
```

If it somehow sees an empty iterator, it throws an internal “BUG” error asking
the user to report the impossible state.

So the design is:

```text
type system
    prevents normal empty inputs

runtime guard
    catches a violated / forged invariant
```

It is not a general empty-checking API like `Option`-returning head functions.

## 2. Split

### `unprepend`

This is the runtime operation exported by the module.

```ts
const [
    first,
    remaining
] =
    NonEmptyIterable.unprepend(
        Chunk.make(
            10,
            20,
            30
        )
    )
```

The result type is:

```text
[
    firstElement: A,
    remainingElements: Iterator<A>
]
```

For the example:

```text
first
    10

remaining
    iterator positioned before 20
```

## Why no `Option`?

A general iterable may be empty, so retrieving its first item normally needs an
empty case.

For a `NonEmptyIterable`, that case is impossible by contract.

Therefore:

```text
NonEmptyIterable.unprepend
    returns A directly
```

instead of:

```text
Option<A>
```

or:

```text
A | undefined
```

This is the main benefit of preserving non-emptiness in the type.

## How `unprepend` works

The implementation is intentionally small:

1. call `self[Symbol.iterator]()`,
2. call `iterator.next()` once,
3. take that value as the head,
4. return the **same iterator** as the remainder.

Conceptually:

```text
source iterator

before:
    ↓
[10] [20] [30]

unprepend reads one next()

head = 10

returned iterator:
         ↓
[10] [20] [30]
```

There is no tail array allocation inside `unprepend`.

## Materializing the tail

If an array is needed, the returned Iterator can be wrapped as an Iterable:

```ts
Array.from({
    [Symbol.iterator]:
        () =>
            remaining
})
```

For:

```text
10 · 20 · 30
```

the result is:

```text
[20, 30]
```

That materialization is performed by the caller, not by `unprepend`.

## 3. Iterator semantics

The returned tail is:

```text
Iterator<A>
```

rather than:

```text
ReadonlyArray<A>
```

or even a promise of a fresh reusable iterable.

That distinction matters.

## Live cursor

For:

```ts
const [
    first,
    rest
] =
    NonEmptyIterable.unprepend(
        Chunk.make(
            10,
            20,
            30,
            40
        )
    )
```

then:

```text
first = 10
```

and:

```ts
rest.next()
```

returns the next element:

```text
20
```

Calling it again returns:

```text
30
```

The cursor has moved.

## One-pass nature

An `Iterator` is stateful.

Once an element is consumed through:

```ts
next()
```

that same iterator does not rewind automatically.

So after reading:

```text
20
30
```

the only remaining value is:

```text
40
```

This is useful because `unprepend` can preserve lazy iteration without copying
the rest of the input.

## Arbitrary iterables

Because the module works with the standard iteration protocol, a
`NonEmptyIterable` does not need to be an array.

It could represent a proven-non-empty:

```text
Chunk
generator-backed structure
linked collection
custom iterable
```

provided the producer can correctly establish the non-empty brand.

## Infinite inputs

The design also makes sense for infinite iterables.

`unprepend` only reads one element.

It does **not** try to materialize the tail, so an infinite remainder can remain
lazy.

Of course, calling `Array.from` on an infinite remainder would never finish;
that is a property of the caller's materialization, not `unprepend`.

## 4. Integration

The value of the type becomes clearer when other APIs use it.

## `Chunk.NonEmptyChunk`

Current Effect `Chunk` defines:

```ts
interface NonEmptyChunk<A>
    extends Chunk<A>,
        NonEmptyIterable<A>
{}
```

and its documentation uses:

```ts
const chunk:
    Chunk.NonEmptyChunk<number> =
    Chunk.make(
        1,
        2,
        3
    )
```

That means a non-empty Chunk can be passed directly to `unprepend`.

The demo uses:

```ts
export const words =
    Chunk.make(
        "alpha",
        "beta",
        "gamma"
    )
```

with no extra wrapper.

## `Random.choice`

The current `Random.choice` signature distinguishes a proven non-empty input
from a general iterable.

Conceptually:

```text
NonEmptyIterable<A>
    ↓
Random.choice
    ↓
Effect<A>
```

There is no empty-input error because the type guarantees a candidate exists.

For a general iterable:

```text
Iterable<A>
    ↓
Random.choice
    ↓
Effect<A, NoSuchElementError>
```

because that iterable may be empty.

The current Effect type test explicitly verifies this distinction.

This is a strong example of why carrying non-emptiness through types matters:

```text
producer proves invariant once
    ↓
consumer removes impossible failure
```

## Generic Iterable compatibility

A function can ask for the stronger input:

```ts
const sum = (
    values:
        NonEmptyIterable
            .NonEmptyIterable<
                number
            >
): number => {
    let total = 0

    for (
        const value
        of values
    ) {
        total += value
    }

    return total
}
```

The implementation does not need special iteration logic.

It simply uses the normal `for...of` protocol.

For:

```text
10 · 20 · 30 · 40
```

it produces:

```text
100
```

The type guarantee can therefore improve API contracts without complicating the
runtime algorithm.

## NonEmptyIterable versus NonEmptyArray

A non-empty array typically carries the guarantee through a tuple shape such as:

```text
readonly [A, ...A[]]
```

That says both:

```text
array
and
at least one element
```

`NonEmptyIterable<A>` is more abstract.

It says:

```text
iterable
and
at least one element
```

without requiring random access, a `length`, or array storage.

Choose the narrowest abstraction the consumer actually needs.

If all the consumer needs is:

```text
iterate
and safely obtain first
```

`NonEmptyIterable` avoids over-constraining callers to arrays.

## NonEmptyIterable versus Chunk

`Chunk` is a concrete Effect collection with many operations.

`NonEmptyIterable` is a tiny interface contract.

A `NonEmptyChunk` can satisfy that contract, but the two abstractions have
different roles:

```text
Chunk.NonEmptyChunk
    concrete collection

NonEmptyIterable
    minimal non-empty iteration capability
```

This makes `NonEmptyIterable` useful in generic APIs that should accept more than
one collection implementation.

## Why the module is so small

The module has only one runtime operation because the abstraction is primarily a
type-level guarantee.

Most transformation operations already belong to:

```text
Iterable
Chunk
Array
other collection modules
```

`NonEmptyIterable` only needs to express:

```text
this iterable definitely has a first item
```

and provide the canonical safe deconstruction operation.

## Public teaching surface

### Brand symbol

- `nonEmpty`

### Model

- `NonEmptyIterable`

### Getter / deconstruction

- `unprepend`

That accounts for the **3 named public teaching entries** in the current source.

## Runtime surface nuance

`nonEmpty` is declared with:

```ts
export declare const
```

and `NonEmptyIterable` is an interface.

Both are type-level declarations.

`unprepend` is the actual runtime function implemented by this module.

This distinction is why a simple runtime-export counter can undercount the
teaching surface.

## Foldkit integration

`NonEmptyIterable` is a domain/type utility, so it fits naturally in pure
Foldkit feature code.

For example, a feature Model or helper can require:

```text
at least one selected item
at least one active filter
at least one route segment
at least one validation rule
```

through a non-empty type rather than checking emptiness repeatedly downstream.

A useful design is:

```text
boundary / constructor
    prove non-empty

feature core
    accept NonEmptyIterable<A>

consumer
    safely use unprepend
    or pass to another non-empty-aware API
```

This is especially useful when an empty state is genuinely invalid for the
domain rather than just temporarily absent in the UI.

## Type discipline

The generated demo has no explicit `any` annotations.

Every iterator callback, Foldkit Message payload, and UI callback that could lose
contextual typing has an explicit type where useful.

Button attributes are derived from `HtmlBuilder`.

The upstream Effect source is separate from this generated-artifact constraint.

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
2. add `Demo.Message` to the parent Message union,
3. initialize `Demo.init`,
4. delegate child messages to `Demo.update`,
5. render `Demo.view(...)` from the NonEmptyIterable route.

This artifact intentionally performs none of those edits.
