# Effect 4 Combiner — Foldkit visual demo

Based on:

- <https://effect.website/docs/v4/api/effect/Combiner>

## Mental model

A `Combiner<A>` answers one question:

```text
given two A values,
how do I merge them into one A?
```

Its whole interface is:

```ts
interface Combiner<A> {
  readonly combine:
    (
      self: A,
      that: A
    ) => A
}
```

That is deliberately smaller than `Reducer`.

A Combiner has:

```text
combine
```

but does **not** have:

```text
initialValue
combineAll
```

Use it when an API only needs pairwise merge behavior and should not require an
arbitrary empty value.

# 1. `make`

Create a reusable combining strategy:

```ts
const Sum =
  Combiner.make<number>(
    (self, that) =>
      self + that
  )

Sum.combine(
  3,
  4
)
// 7
```

Custom object merge:

```ts
type Config = {
  retries: number
  label: string
}

const MergeConfig =
  Combiner.make<Config>(
    (self, that) => ({
      retries:
        Math.max(
          self.retries,
          that.retries
        ),

      label:
        `${self.label}+${that.label}`
    })
  )
```

The type remains:

```text
Config × Config → Config
```

## Laws are not enforced

`Combiner.make` accepts any binary function.

Effect does not prove that it is:

- associative
- pure
- immutable
- commutative

Those properties depend on the function you supply.

This matters because generic fold/merge APIs may expect associativity for
stable grouping behavior.

# 2. `min`

```ts
const Min =
  Combiner.min(
    Number.Order
  )
```

Then:

```ts
Min.combine(
  8,
  3
)
// 3
```

`min` is generic over any Effect `Order<A>`.

When the values compare equal, the implementation returns the second argument.

# 3. `max`

```ts
const Max =
  Combiner.max(
    Number.Order
  )
```

```ts
Max.combine(
  8,
  3
)
// 8
```

Again, equal values choose the second argument.

This distinction can matter for reference-bearing values where two values are
equal according to the `Order` but are not the same object.

# 4. `first`

```ts
const First =
  Combiner.first<string>()
```

```ts
First.combine(
  "old",
  "new"
)
// "old"
```

This implements:

```text
first write wins
```

Use it when the left-hand value should always take precedence.

# 5. `last`

```ts
const Last =
  Combiner.last<string>()
```

```ts
Last.combine(
  "old",
  "new"
)
// "new"
```

This implements:

```text
last write wins
```

This is a useful generic merge strategy for:

- configuration overlays
- map collision policy
- defaults overridden by later sources

when all you need is the pairwise rule.

# 6. `constant`

```ts
const AlwaysFallback =
  Combiner.constant(
    "fallback"
  )
```

Both inputs are ignored:

```ts
AlwaysFallback.combine(
  "A",
  "B"
)
// "fallback"
```

Use when a generic abstraction requires a Combiner but your merge result is
predetermined.

# 7. `flip`

```ts
const Prepend =
  Combiner.flip(
    String.ReducerConcat
  )
```

`String.ReducerConcat` normally combines:

```text
"a" + "b"
→ "ab"
```

The flipped Combiner does:

```ts
Prepend.combine(
  "a",
  "b"
)
// "ba"
```

`flip` simply changes:

```text
combine(self, that)
```

into:

```text
original.combine(
  that,
  self
)
```

It makes no visible difference for a commutative Combiner such as numeric
addition.

It is meaningful for non-commutative operations such as string concatenation,
ordered structures, or precedence rules.

# 8. `intercalate`

Wrap a base Combiner so a fixed value is inserted between the pair.

```ts
const Csv =
  Combiner.intercalate(
    ","
  )(
    String.ReducerConcat
  )
```

Then:

```ts
Csv.combine(
  "a",
  "b"
)
// "a,b"
```

The rule is:

```ts
combiner.combine(
  self,
  combiner.combine(
    middle,
    that
  )
)
```

Path-style example:

```ts
const Path =
  Combiner.intercalate(
    "/"
  )(
    String.ReducerConcat
  )

Path.combine(
  "api",
  "users"
)
// "api/users"
```

`intercalate` is curried:

```text
separator
→ base Combiner
→ wrapped Combiner
```

# 9. Combiner vs Reducer

This is the most important conceptual distinction.

Current Effect v4 defines:

```ts
interface Reducer<A>
  extends Combiner<A> {
  readonly initialValue: A

  readonly combineAll:
    (
      collection:
        Iterable<A>
    ) => A
}
```

So:

```text
Reducer
  IS a Combiner
  PLUS an identity
  PLUS whole-collection reduction
```

## Pairwise merge

Both can do:

```ts
combine(
  3,
  4
)
```

## Empty collections

A Reducer can answer:

```text
what is the result of no values?
```

because it has:

```ts
initialValue
```

Example:

```ts
const SumReducer =
  Reducer.make<number>(
    (a, b) =>
      a + b,
    0
  )

SumReducer.combineAll([])
// 0
```

A plain Combiner has no answer to the empty case.

That is not a missing feature.

It is the point of the smaller abstraction.

# 10. Why smaller is useful

Consider minimum.

For two values:

```text
min(a, b)
```

is obvious.

For a non-empty collection, minimum is also obvious if you seed from the first
element.

But:

```text
minimum of an empty generic A collection
```

does not have a natural answer unless your domain invents one.

So:

```ts
Combiner.min(order)
```

does not force you to manufacture an identity value.

The same applies to:

```text
first
last
max
```

This is why APIs that only need pairwise/non-empty merging should accept:

```ts
Combiner<A>
```

rather than requiring:

```ts
Reducer<A>
```

# 11. Non-empty folds with a Combiner

Given a known non-empty collection you can fold with only a Combiner:

```ts
function combineNonEmpty<A>(
  first: A,
  rest: Iterable<A>,
  combiner: Combiner.Combiner<A>
): A {
  let out = first

  for (
    const value
    of rest
  ) {
    out =
      combiner.combine(
        out,
        value
      )
  }

  return out
}
```

No identity is necessary because the first actual value seeds the accumulation.

For arbitrary possibly-empty collections, use a Reducer or represent absence
explicitly with another abstraction such as `Option`.

# 12. Existing Reducers can be used as Combiners

Because:

```ts
Reducer<A>
extends
Combiner<A>
```

a Reducer can be passed anywhere a Combiner is requested.

That is why this is valid:

```ts
Combiner.flip(
  String.ReducerConcat
)
```

or:

```ts
Combiner.intercalate(",")(
  String.ReducerConcat
)
```

The Combiner functions only care about the `combine` part.

# 13. Where Combiner appears

The v4 docs specifically position Combiner as a reusable strategy accepted by
higher-level generic APIs.

Examples of the kind of API that can use a Combiner:

```text
structured merging
Option merging
map collision policy
non-empty aggregation
configuration precedence
generic library combinators
```

The benefit is dependency inversion:

```text
generic algorithm
does not hardcode
how A values merge
```

Instead it receives:

```ts
Combiner<A>
```

# 14. Combiner vs a plain function

You could pass:

```ts
(a, b) =>
  a + b
```

directly.

The `Combiner` object becomes useful when:

- generic Effect APIs standardize on the algebra type
- you want named reusable strategies
- you want constructors such as `min`, `max`, `first`, `last`
- you want higher-order transforms such as `flip` / `intercalate`
- you want compatibility with Reducer, which extends the same interface

So it is a tiny abstraction with useful ecosystem interoperability.

# Real Effect 4 API

The entire current public `Combiner` module is small:

```ts
Combiner.Combiner

Combiner.make

Combiner.flip

Combiner.min
Combiner.max

Combiner.first
Combiner.last

Combiner.constant

Combiner.intercalate
```

The demo uses every public operation.

It also uses:

```ts
Number.Order
String.ReducerConcat
Reducer.make
```

to show how Combiner fits into the wider Effect algebra vocabulary.
