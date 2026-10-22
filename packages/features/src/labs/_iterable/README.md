# Iterable

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/Iterable

The current API page is Effect `4.0.0-rc.116` and reports **50 exports**. The
implementation was also checked against the current:

```text
packages/effect/src/Iterable.ts
```

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `iterable.ts` — real constructor, lazy pipeline, search/grouping, folding,
  zipping, and cartesian examples.
- `iterable.view.ts` — interactive visual demo.
- `iterable-preview.png` — static preview of the default Create stage.

## Intended location

```text
packages/features/src/labs/iterable/
├── iterable.ts
└── iterable.view.ts
```

No parent router/model/message/update files are modified.

## Core idea

The module operates on ordinary JavaScript values that implement:

```ts
[Symbol.iterator]()
```

That includes:

```text
arrays
strings
sets
generators
custom lazy sequences
```

A large part of the API preserves values as `Iterable` rather than immediately
building arrays.

This makes it possible to describe:

```text
infinite sequences
lazy pipelines
partial consumption
stream-like transformations
```

with ordinary synchronous iteration.

## 1. Create

The Create stage covers the constructor family.

### `range`

```ts
Iterable.range(
    3,
    7
)
```

produces the inclusive finite sequence:

```text
3, 4, 5, 6, 7
```

With no end:

```ts
Iterable.range(1)
```

the result is unbounded.

The demo therefore combines it with:

```ts
Iterable.take(
    Iterable.range(1),
    5
)
```

before materializing.

A less obvious current behavior is:

```ts
Iterable.range(
    5,
    2
)
```

which produces only:

```text
5
```

rather than a descending range.

### `makeBy`

`makeBy` invokes a function with indexes beginning at `0`.

```ts
Iterable.makeBy(
    (index: number) =>
        index * index,
    {
        length: 5
    }
)
```

produces:

```text
0, 1, 4, 9, 16
```

Without `length` it is infinite.

### `replicate`

Repeats one value:

```ts
Iterable.replicate(
    "x",
    4
)
```

### `repeat`

Repeats an entire reusable iterable:

```ts
Iterable.repeat(
    [1, 2],
    3
)
```

produces:

```text
1, 2, 1, 2, 1, 2
```

Each repetition asks the source for a new iterator.

### `forever`

Repeats an iterable without a limit.

The demo always bounds it with `take`.

### `unfold`

`unfold` creates values from explicit state transitions.

The callback returns:

```text
Some([value, nextState])
```

to continue or:

```text
None
```

to stop.

The demo uses it to encode Fibonacci state.

### Other constructors / conversion

Also covered:

```ts
Iterable.empty
Iterable.of
Iterable.fromRecord
```

`fromRecord` lazily yields key/value tuples for the record's own properties.

## Count normalization

The current implementation normalizes several numeric parameters rather than
throwing.

For example:

- `take` / `drop` normalize to non-negative counts.
- `chunksOf` normalizes chunk size to at least `1`.
- constructor repetition lengths normalize to at least `1` where documented.

This matters when inputs may be fractional, negative, or `NaN`.

## 2. Lazy

This stage demonstrates that transformation does not imply eager evaluation.

The demo creates an infinite range and tracks how often a filter callback runs:

```ts
let visited = 0

const filtered =
    Iterable.filter(
        Iterable.range(1),
        (value: number) => {
            visited++
            return value % 2 === 0
        }
    )
```

Before consumption:

```text
visited = 0
```

Only this later consumer drives the source:

```ts
Array.from(
    Iterable.take(
        Iterable.map(
            filtered,
            (value: number) =>
                value * 10
        ),
        3
    )
)
```

which produces:

```text
20, 40, 60
```

## Mapping / filtering / sequencing

The wider lazy transformation family includes:

```ts
Iterable.map
Iterable.filter
Iterable.filterMap
Iterable.filterMapWhile
Iterable.flatMap
Iterable.flatMapNullishOr
Iterable.flatten
```

### `filterMap`

Maps each input to `Result`.

Only `Result.Success` values are emitted.

### `filterMapWhile`

Has the same Result-producing shape but stops iteration at the first failure
instead of merely skipping failures.

### `flatMapNullishOr`

Transforms values and drops results that are `null` or `undefined`.

This is useful with APIs such as:

```ts
Map.get
optional property access
nullable parsers
```

### `flatten`

Removes one Iterable layer.

It does not recursively flatten arbitrary depth.

## Slicing / splitting

Covered helpers include:

```ts
Iterable.take
Iterable.takeWhile
Iterable.drop
Iterable.chunksOf
```

`takeWhile` may also be supplied a TypeScript refinement.

`chunksOf` emits arrays and the final chunk may be shorter.

## Combining

The module provides:

```ts
Iterable.prepend
Iterable.prependAll
Iterable.append
Iterable.appendAll
Iterable.intersperse
```

The lazy behavior of `appendAll` is particularly useful:

```text
consume self
then create / consume the second iterator
```

If `self` never finishes, the suffix is never reached.

## Zip

```ts
Iterable.zip
Iterable.zipWith
```

operate positionally and stop as soon as either input ends.

## 3. Search

### Safe first element

```ts
Iterable.head(iterable)
```

returns:

```text
Option<A>
```

while:

```ts
Iterable.headUnsafe(iterable)
```

returns `A` directly and throws for an empty iterable.

### Searching

```ts
Iterable.findFirst
Iterable.findLast
```

return `Option`.

Both support predicate / refinement-style APIs, and the current API also allows
Option-producing search callbacks.

### Membership

```ts
Iterable.contains
```

uses Effect's default equality semantics.

```ts
Iterable.containsWith
```

accepts a custom equivalence.

The demo shows case-insensitive string membership.

### Predicate consumer

```ts
Iterable.some
```

short-circuits on the first matching value.

### Size / emptiness

```ts
Iterable.size
Iterable.isEmpty
```

consume enough of the input to answer their question.

`size` consumes the full iterable and therefore must not be called on an
unbounded source.

## Grouping

There are two importantly different grouping ideas.

### Consecutive grouping

```ts
Iterable.group
Iterable.groupWith
```

group only neighboring equal values.

For:

```text
1, 1, 2, 2, 3, 1
```

`group` produces:

```text
[1, 1]
[2, 2]
[3]
[1]
```

The final `1` does not join the first group.

### Global keyed grouping

```ts
Iterable.groupBy
```

groups every value that produces the same string or symbol key, even when the
values were not consecutive.

## Adjacent deduplication

```ts
Iterable.dedupeAdjacent
Iterable.dedupeAdjacentWith
```

also operate only on neighboring values.

For:

```text
1, 1, 2, 2, 3, 1, 1
```

the result is:

```text
1, 2, 3, 1
```

This is not global set-style deduplication.

## Option / Result extraction

The filtering family also includes:

```ts
Iterable.getSomes
Iterable.getSuccesses
Iterable.getFailures
```

which lazily extract the successful side of collections containing Option or
Result values.

## 4. Fold

### `reduce`

Consumes the iterable and returns one accumulator value.

```ts
Iterable.reduce(
    [1, 2, 3, 4],
    0,
    (
        sum: number,
        value: number
    ) =>
        sum + value
)
```

returns:

```text
10
```

### `scan`

`scan` keeps every accumulator state.

The initial state is emitted before the first input value is processed.

```ts
Iterable.scan(
    [1, 2, 3, 4],
    0,
    (
        sum: number,
        value: number
    ) =>
        sum + value
)
```

produces:

```text
0, 1, 3, 6, 10
```

Unlike `reduce`, `scan` itself remains lazy.

### `countBy`

Counts values satisfying a predicate.

### `forEach`

Consumes the iterable for side effects and exposes the zero-based element index.

## Cartesian versus zip

`cartesian` / `cartesianWith` produce every cross-pair.

For:

```text
[1, 2]
×
[a, b]
```

the cartesian product has four values:

```text
1a, 1b, 2a, 2b
```

`zip` instead uses positions:

```text
1:a, 2:b
```

and stops at the shorter input.

## Current public surface

The current docs group the 50 exports as follows.

### Combining

- `append`
- `appendAll`
- `cartesian`
- `cartesianWith`
- `intersperse`
- `prepend`
- `prependAll`

### Constructors

- `empty`
- `forever`
- `makeBy`
- `of`
- `range`
- `repeat`
- `replicate`
- `unfold`

### Converting

- `fromRecord`

### Filtering

- `dedupeAdjacent`
- `dedupeAdjacentWith`
- `filter`
- `filterMap`
- `filterMapWhile`
- `getFailures`
- `getSomes`
- `getSuccesses`

### Folding

- `countBy`
- `reduce`
- `scan`

### Getters

- `drop`
- `head`
- `headUnsafe`
- `size`
- `take`
- `takeWhile`

### Grouping

- `group`
- `groupBy`
- `groupWith`

### Guards

- `isEmpty`

### Mapping

- `map`

### Predicates

- `contains`
- `containsWith`
- `some`

### Searching

- `findFirst`
- `findLast`

### Sequencing

- `flatMap`
- `flatMapNullishOr`
- `flatten`

### Splitting

- `chunksOf`

### Traversing

- `forEach`

### Zipping

- `zip`
- `zipWith`

## Iterable versus Array

`Array` is already materialized storage.

`Iterable` is a protocol for producing values.

The Iterable helpers are therefore useful when:

```text
the source is lazy
the source is infinite
only a prefix may be needed
the source is a generator / Set / string
intermediate arrays would be wasteful
```

Convert with:

```ts
Array.from(iterable)
```

only at the boundary where an eager collection is actually needed.

## Type discipline

The generated demo has no explicit `any` annotations.

All transformation, predicate, reducer, grouping, mapping, and tuple callbacks
that could lose contextual typing under the standalone `--noResolve` check have
explicit parameter types.

Every `Message.match` payload is explicitly typed, and Button attributes are
derived from `HtmlBuilder`.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/labs/*` demos:

1. add the child Model to the parent learn Model,
2. add `IterableDemo.Message` to the parent Message union,
3. initialize `IterableDemo.init`,
4. delegate child messages to `IterableDemo.update`,
5. render `IterableDemo.view(...)` from the Iterable route.

This artifact intentionally performs none of those edits.
