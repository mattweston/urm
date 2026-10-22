# Effect 4 Tuple — Foldkit visual demo

Copy these files into your Foldkit learn folder:

- `examples/tuple.ts`
- `tuple.view.ts`

`tuple-preview.png` is a static visual reference.

No integration patches or repository edits are included.

## Mental model

A tuple is a fixed-position array:

```ts
[string, number, boolean]
```

Unlike a normal homogeneous array, every position can have a different type.

Effect's Tuple module focuses on operations that preserve that fixed shape at
the type level wherever possible.

## The four sections

### 1. Make / Get

Create a typed tuple without a manual `as const`:

```ts
const person = Tuple.make(
  "Ada",
  36,
  true
)
// ["Ada", 36, true]
```

Extract an exact position:

```ts
Tuple.get(person, 0)
// "Ada"

Tuple.get(person, 1)
// 36
```

The index is constrained to valid positions, and the result type is the exact
type stored at that index.

### 2. Pick / Omit / Append

Keep selected positions:

```ts
Tuple.pick(
  person,
  [0, 2]
)
// ["Ada", true]
```

Remove selected positions:

```ts
Tuple.omit(
  person,
  [1]
)
// ["Ada", true]
```

Extend the fixed shape:

```ts
Tuple.appendElement(
  person,
  "admin"
)
// ["Ada", 36, true, "admin"]
```

There is also:

```ts
Tuple.appendElements(
  person,
  ["UK", 2026] as const
)
```

### 3. Evolve / Rename

Apply different transformations to different positions:

```ts
Tuple.evolve(
  person,
  [
    (name) => name.toUpperCase(),
    (age) => age + 1
  ]
)
// ["ADA", 37, true]
```

Reorder positions:

```ts
Tuple.renameIndices(
  person,
  ["2", "1", "0"]
)
// [true, 36, "Ada"]
```

`renameIndices` uses stringified source indices and preserves the reordered
position types.

The Tuple module also includes `map`, `mapPick`, and `mapOmit` for
`Struct.Lambda`-based transformations.

### 4. Guards / Order / Reduce

Runtime length guard:

```ts
const values: Array<number> = [10, 20, 30]

if (Tuple.isTupleOf(values, 3)) {
  // values: [number, number, number]
}
```

There is also:

```ts
Tuple.isTupleOfAtLeast(values, 2)
```

Per-position ordering:

```ts
const PersonOrder = Tuple.makeOrder([
  String.Order,
  Number.Order
])
```

Per-position reduction:

```ts
const SummaryReducer =
  Tuple.makeReducer<readonly [number, string]>([
    Number.ReducerSum,
    String.ReducerConcat
  ])

SummaryReducer.combineAll([
  [1, "a"],
  [2, "b"],
  [3, "c"]
])
// [6, "abc"]
```

This is useful when each position has a different algebra.

## Real Effect 4 APIs used

The source includes:

- `Tuple.make`
- `Tuple.get`
- `Tuple.pick`
- `Tuple.omit`
- `Tuple.appendElement`
- `Tuple.appendElements`
- `Tuple.evolve`
- `Tuple.renameIndices`
- `Tuple.isTupleOf`
- `Tuple.makeOrder`
- `Tuple.makeReducer`
- `Number.Order`
- `Number.ReducerSum`
- `String.Order`
- `String.ReducerConcat`

## Suggested placement

```text
packages/features/src/labs/foldkit/
├── examples/
│   └── tuple.ts
└── tuple.view.ts
```
