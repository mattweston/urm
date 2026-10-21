# Effect 4 Array — Foldkit visual demo

## Mental model

Effect's `Array` module is a functional collection API over ordinary JavaScript
arrays and iterables.

It adds several useful things beyond just renaming `Array.prototype` methods:

- pipe-friendly data-first / data-last helpers
- safe access with `Option`
- refinements that preserve narrowed element types
- `Result`-based filter / partition helpers
- `NonEmptyArray` preservation where the operation guarantees non-emptiness
- fixed tuple types for literal-sized sliding windows
- Effect structural equality for set-like operations

## The four sections

### 1. Construct / access

Create a non-empty integer range:

```ts
Array.range(1, 5)
// [1, 2, 3, 4, 5]
```

Safe indexed access:

```ts
Array.get(
  [1, 2, 3],
  1
)
// Option.some(2)

Array.get(
  [1, 2, 3],
  99
)
// Option.none()
```

`get` floors its numeric index and uses `Option` for out-of-bounds access.

Unsafe access is also available:

```ts
Array.getUnsafe(array, index)
```

but throws on invalid indexes.

Search safely:

```ts
Array.findFirst(
  [1, 2, 3, 4, 5],
  (n) => n > 3
)
// Option.some(4)
```

Other useful accessors include:

```ts
Array.head
Array.last
Array.findLast
Array.findFirstIndex
Array.findFirstWithIndex
```

When a value is statically known to be a `NonEmptyArray`, APIs such as
`headNonEmpty` and `lastNonEmpty` can return values directly rather than
`Option`.

## 2. Transform

Map one input to one output:

```ts
Array.map(
  [1, 2, 3],
  (n) => n * 2
)
// [2, 4, 6]
```

`map` also receives the index and preserves non-empty shape information.

Map one input to zero or more outputs:

```ts
Array.flatMap(
  [1, 2, 3],
  (n) => [n, n * 10]
)
// [1, 10, 2, 20, 3, 30]
```

Zip two sequences together with a function:

```ts
Array.zipWith(
  [1, 2, 3],
  [10, 20, 30],
  (a, b) => a + b
)
// [11, 22, 33]
```

Zipping stops at the shorter iterable.

Related APIs include:

```ts
Array.flatten
Array.zip
Array.unzip
Array.scan
Array.mapAccum
```

## 3. Filter / partition

Simple predicate:

```ts
Array.filter(
  [1, 2, 3, 4, 5],
  (n) => n % 2 === 0
)
// [2, 4]
```

A TypeScript refinement can be supplied instead of a boolean predicate, in
which case the returned element type is narrowed.

### filterMap

In Effect 4, `filterMap` uses `Result`:

```ts
Array.filterMap(
  [1, 2, 3, 4],
  (n) =>
    n % 2 === 0
      ? Result.succeed(n * 10)
      : Result.fail(undefined)
)
// [20, 40]
```

Only `Success` values are retained.

### partition

`partition` keeps both Result channels:

```ts
const [excluded, satisfying] =
  Array.partition(
    [1, 2, 3, 4, 5],
    (n) =>
      n % 2 === 0
        ? Result.succeed(n)
        : Result.fail(`odd:${n}`)
  )

// excluded   = ["odd:1", "odd:3", "odd:5"]
// satisfying = [2, 4]
```

For an array that already contains Results:

```ts
Array.separate(results)
```

splits failures and successes directly.

## 4. Shape / group / fold

### chunksOf

Non-overlapping chunks:

```ts
Array.chunksOf(
  [1, 2, 3, 4, 5],
  2
)
// [[1, 2], [3, 4], [5]]
```

Each chunk is a `NonEmptyArray`.

### window

Overlapping windows:

```ts
Array.window(
  [1, 2, 3, 4, 5],
  3
)
// [
//   [1, 2, 3],
//   [2, 3, 4],
//   [3, 4, 5]
// ]
```

A useful v4 typing detail:

```ts
Array.window(values, 3)
```

returns windows typed as exact 3-element tuples rather than generic arrays.

### groupBy

```ts
Array.groupBy(
  people,
  (person) => person.team
)
```

returns a Record keyed by the produced string/symbol key. Every created group
is a `NonEmptyArray`.

### reduce

```ts
Array.reduce(
  [1, 2, 3, 4, 5],
  0,
  (sum, n) => sum + n
)
// 15
```

Use `scan` when you also need the intermediate accumulator states.

## Set-style operations

Effect Array also includes:

```ts
Array.dedupe
Array.union
Array.intersection
Array.difference
```

These use Effect's `Hash` + `Equal` semantics rather than JavaScript reference
equality alone.

For custom equality there are corresponding `...With` variants.

## Other useful families

The current API also includes:

- `take`, `takeRight`, `drop`, `dropRight`
- `takeWhile`, `dropWhile`, `span`
- `insertAt`, `replace`, `modify`, `remove`
- `reverse`, `rotate`
- `sort`, `sortBy`, `sortWith`
- `splitAt`, `split`, `splitWhere`
- `group`, `groupWith`, `groupBy`
- `cartesian`, `cartesianWith`
- `every`, `some`, `countBy`
- `min`, `max`
- `fromOption`, `fromNullishOr`, `liftPredicate`, `liftOption`, `liftResult`
- `Do`, `bind`, `bindTo`

## Real Effect 4 APIs used

The source includes:

- `Array.range`
- `Array.get`
- `Array.head`
- `Array.last`
- `Array.findFirst`
- `Array.map`
- `Array.flatMap`
- `Array.zipWith`
- `Array.filter`
- `Array.filterMap`
- `Array.partition`
- `Array.chunksOf`
- `Array.window`
- `Array.groupBy`
- `Array.reduce`
- `Array.union`
- `Array.intersection`
- `Array.difference`
- `Option`
- `Result`
