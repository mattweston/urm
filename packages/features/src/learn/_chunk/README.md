# Effect 4 Chunk — Foldkit visual demo

Based on the current Effect v4 Chunk API:

- <https://effect.website/docs/v4/api/effect/Chunk>

The API reference was `effect 4.0.0-rc.115` when this demo was created.

## Mental model

Effect describes `Chunk<A>` as:

> an immutable, ordered collection optimized for efficient concatenation and
> access patterns.

It fills a different niche from a normal mutable JavaScript Array.

Conceptually:

```text
Array
  familiar JS collection
  mutable by default
  native random access

Chunk
  immutable ordered collection
  persistent combine / slice operations
  useful throughout Effect internals / APIs
  implements Iterable + Equal + Pipeable
```

You can always cross the boundary with:

```ts
Chunk.toArray(chunk)
Chunk.toReadonlyArray(chunk)
Chunk.fromIterable(iterable)
```

## `Chunk` vs `NonEmptyChunk`

Effect tracks known non-emptiness separately:

```ts
Chunk.Chunk<A>
Chunk.NonEmptyChunk<A>
```

Constructors such as:

```ts
Chunk.make(...)
Chunk.of(...)
Chunk.range(...)
Chunk.makeBy(...)
```

return a `NonEmptyChunk`.

That lets APIs such as:

```ts
Chunk.headNonEmpty
Chunk.lastNonEmpty
```

return `A` directly rather than `Option<A>`.

Operations that guarantee non-empty output preserve that information where
possible.

For example:

```ts
const values =
  Chunk.make(
    1,
    2,
    3
  )
// NonEmptyChunk<number>

const mapped =
  Chunk.map(
    values,
    n => n * 2
  )
// NonEmptyChunk<number>
```

and:

```ts
Chunk.append(
  Chunk.empty<number>(),
  1
)
// NonEmptyChunk<number>
```

## 1. Build / access

Create a non-empty Chunk:

```ts
const values =
  Chunk.make(
    1,
    2,
    3
  )
```

Range:

```ts
Chunk.range(
  1,
  5
)
// Chunk(1, 2, 3, 4, 5)
```

The range is inclusive.

If start is greater than end:

```ts
Chunk.range(
  5,
  1
)
```

returns a one-element Chunk containing `5`.

### Safe indexed access

```ts
Chunk.get(
  values,
  1
)
// Option.some(2)

Chunk.get(
  values,
  99
)
// Option.none()

Chunk.get(
  values,
  -1
)
// Option.none()
```

Unsafe access is also available:

```ts
Chunk.getUnsafe(
  values,
  1
)
```

but throws on invalid index.

### Head / last

For a possibly empty Chunk:

```ts
Chunk.head(chunk)
Chunk.last(chunk)
```

return:

```ts
Option<A>
```

For `NonEmptyChunk`:

```ts
Chunk.headNonEmpty(chunk)
Chunk.lastNonEmpty(chunk)
```

return `A`.

There are also unsafe variants:

```ts
Chunk.headUnsafe
Chunk.lastUnsafe
```

### Convert to arrays

```ts
Chunk.toArray(chunk)
```

returns a mutable `Array`.

For a `NonEmptyChunk`, its return type preserves non-emptiness as a
`NonEmptyArray`.

```ts
Chunk.toReadonlyArray(chunk)
```

returns the read-only array representation.

## Unsafe array wrapping

Effect 4 also exposes:

```ts
Chunk.fromArrayUnsafe(array)
Chunk.fromNonEmptyArrayUnsafe(array)
```

These wrap the source array **without copying**.

This is useful when avoiding the copy matters and the array can be treated as
immutable.

The gotcha is important:

```ts
const source = [
  1,
  2,
  3
]

const chunk =
  Chunk.fromArrayUnsafe(
    source
  )

source[0] = 999
```

can change what the Chunk observes.

Use normal:

```ts
Chunk.fromIterable(source)
```

when that sharing contract is not appropriate.

# 2. Immutable concatenation

A major reason Chunk exists is efficient immutable concatenation.

```ts
const left =
  Chunk.make(
    1,
    2,
    3
  )

const right =
  Chunk.make(
    4,
    5
  )

const combined =
  Chunk.appendAll(
    left,
    right
  )
```

Result:

```text
1 2 3 4 5
```

The inputs remain unchanged:

```text
left  = 1 2 3
right = 4 5
```

The implementation represents concatenation structurally and balances the
concatenation tree rather than requiring callers to mutate one collection.

You normally interact with this through the public Chunk API rather than its
backing representation.

## Append / prepend

One element:

```ts
Chunk.append(
  chunk,
  value
)

Chunk.prepend(
  chunk,
  value
)
```

Both return `NonEmptyChunk`.

Several values:

```ts
Chunk.appendAll(
  first,
  second
)

Chunk.prependAll(
  self,
  prefix
)
```

Non-empty typing is preserved when either side guarantees a non-empty result.

# 3. Persistent slices

Take:

```ts
Chunk.take(
  chunk,
  3
)
```

Drop:

```ts
Chunk.drop(
  chunk,
  3
)
```

Related helpers include:

```ts
Chunk.takeRight
Chunk.dropRight
Chunk.takeWhile
Chunk.dropWhile
```

Split in one operation:

```ts
const [
  before,
  after
] =
  Chunk.splitAt(
    chunk,
    3
  )
```

For a known `NonEmptyChunk`:

```ts
Chunk.splitNonEmptyAt(
  chunk,
  3
)
```

guarantees that the first result remains non-empty.

These APIs still return Chunks rather than converting the collection into an
Array.

# 4. Transform

## map

```ts
Chunk.map(
  Chunk.make(
    1,
    2,
    3
  ),
  (n, index) =>
    n * 10 + index
)
```

returns:

```text
10 21 32
```

`map` preserves non-empty information.

## flatMap

```ts
Chunk.flatMap(
  Chunk.make(
    1,
    2,
    3
  ),
  n =>
    Chunk.make(
      n,
      n * 10
    )
)
```

returns:

```text
1 10 2 20 3 30
```

`flatMap` combines the returned Chunks using Chunk concatenation.

When the input is non-empty and every returned Chunk is also statically
non-empty, the result remains `NonEmptyChunk`.

## flatten

For:

```ts
Chunk<
  Chunk<A>
>
```

use:

```ts
Chunk.flatten
```

# 5. Filtering with Result

Like Effect 4 Array, Chunk's `filterMap` uses `Result`.

```ts
Chunk.filterMap(
  values,
  n =>
    n % 2 === 0
      ? Result.succeed(
          n * 10
        )
      : Result.fail(
          undefined
        )
)
```

Only Success values are kept.

Result:

```text
20 40
```

## filter

Normal predicate / refinement:

```ts
Chunk.filter(
  values,
  n =>
    n % 2 === 0
)
```

A TypeScript refinement narrows the returned Chunk element type.

## filterMapWhile

This differs from `filterMap`.

```ts
Chunk.filterMapWhile(
  chunk,
  f
)
```

keeps mapping while `f` succeeds and stops at the first failure.

`filterMap` instead keeps scanning after failures.

This is useful for parsing a valid prefix.

# 6. Partition

`partition` keeps both Result channels:

```ts
const [
  excluded,
  satisfying
] =
  Chunk.partition(
    values,
    n =>
      n % 2 === 0
        ? Result.succeed(n)
        : Result.fail(
            `odd:${n}`
          )
  )
```

Result:

```text
excluded
  odd:1
  odd:3
  odd:5

satisfying
  2
  4
```

For a Chunk that already contains Results:

```ts
Chunk.separate(
  resultChunk
)
```

returns:

```ts
[
  failures,
  successes
]
```

as two Chunks.

# 7. Reshaping

## chunksOf

```ts
Chunk.chunksOf(
  Chunk.range(1, 5),
  2
)
```

produces a Chunk of Chunks:

```text
[1, 2]
[3, 4]
[5]
```

## split

Where `chunksOf` asks:

```text
how large should each chunk be?
```

`Chunk.split` asks:

```text
how many chunks should I make?
```

## zip / zipWith

```ts
Chunk.zip(
  Chunk.make(
    1,
    2,
    3
  ),
  Chunk.make(
    "a",
    "b",
    "c"
  )
)
```

or:

```ts
Chunk.zipWith(
  numbers,
  weights,
  (number, weight) =>
    number * weight
)
```

Zipping stops at the shorter input.

Reverse a zipped Chunk with:

```ts
Chunk.unzip
```

# 8. Deduplication and set-style helpers

Remove duplicates globally:

```ts
Chunk.dedupe(
  chunk
)
```

Remove only adjacent duplicates:

```ts
Chunk.dedupeAdjacent(
  Chunk.make(
    1,
    1,
    2,
    2,
    3,
    1,
    1
  )
)
// 1, 2, 3, 1
```

Set-style helpers:

```ts
Chunk.union
Chunk.intersection
Chunk.difference
```

There are custom-equivalence forms where relevant:

```ts
Chunk.containsWith
Chunk.differenceWith
```

Effect's default collection equality semantics are used by the ordinary forms.

# 9. Search / predicates

The current API also includes:

```ts
Chunk.contains
Chunk.findFirst
Chunk.findFirstIndex
Chunk.findLast
Chunk.findLastIndex

Chunk.every
Chunk.some

Chunk.isEmpty
Chunk.isNonEmpty
```

`isNonEmpty` is a type guard:

```ts
if (
  Chunk.isNonEmpty(
    chunk
  )
) {
  // chunk:
  // NonEmptyChunk<A>
}
```

# 10. Modify / replace / remove

Chunk provides immutable position updates:

```ts
Chunk.modify(
  chunk,
  index,
  value => ...
)

Chunk.replace(
  chunk,
  index,
  newValue
)

Chunk.remove(
  chunk,
  index
)
```

The safe forms return `Option` when the requested position is invalid.

# 11. Fold

Left-to-right:

```ts
Chunk.reduce(
  Chunk.range(1, 5),
  0,
  (sum, n) =>
    sum + n
)
// 15
```

Right-to-left:

```ts
Chunk.reduceRight(...)
```

For a fold that also produces a mapped Chunk:

```ts
Chunk.mapAccum(...)
```

returns:

```ts
[
  finalState,
  mappedChunk
]
```

# 12. Sort

```ts
Chunk.sort(
  chunk,
  Order.Number
)
```

and:

```ts
Chunk.sortWith(...)
```

return new Chunks.

# Why choose Chunk?

Chunk is especially natural when:

- an Effect API already produces / consumes Chunk
- you want immutable collection semantics
- you expect repeated concatenation
- you want non-empty information propagated by collection operations
- you want to stay inside the Effect collection vocabulary without converting
  repeatedly to Arrays

Use Array when ordinary JS array interoperability / native ecosystem APIs are
the primary concern.

Cross between them explicitly:

```ts
Chunk.fromIterable(array)
Chunk.toArray(chunk)
```

# Real Effect 4 APIs used

The source includes:

- `Chunk.range`
- `Chunk.make`
- `Chunk.get`
- `Chunk.headNonEmpty`
- `Chunk.lastNonEmpty`
- `Chunk.toArray`
- `Chunk.append`
- `Chunk.appendAll`
- `Chunk.take`
- `Chunk.drop`
- `Chunk.map`
- `Chunk.flatMap`
- `Chunk.filterMap`
- `Chunk.partition`
- `Chunk.chunksOf`
- `Chunk.dedupeAdjacent`
- `Chunk.zipWith`
- `Chunk.union`
- `Chunk.intersection`
- `Chunk.difference`
- `Chunk.reduce`
- `Option`
- `Result`

The README also covers:

- `empty`
- `of`
- `fromIterable`
- unsafe array wrapping
- `filter`
- `filterMapWhile`
- `separate`
- `flatten`
- splitting
- search/predicates
- immutable modify/replace/remove
- sorting
- `mapAccum`

## Suggested placement

```text
packages/features/src/learn/foldkit/
├── examples/
│   └── chunk.ts
└── chunk.view.ts
```
