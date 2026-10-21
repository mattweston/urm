# Equal

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/Equal

The current API page reports Effect `4.0.0-rc.115` and 7 exports. The
implementation was also checked against the current `packages/effect/src/Equal.ts`.

The TypeScript in this artifact intentionally uses no explicit `any` types.

## Files

- `equal.ts` — real Equal / Hash examples, snapshots, Foldkit Model / Message /
  update.
- `equal.view.ts` — interactive teaching UI.
- `equal-preview.png` — static preview of the default Structural stage.

## Intended location

```text
packages/features/src/learn/equal/
├── equal.ts
└── equal.view.ts
```

No parent router/model/message/update files are modified.

## Teaching stages

### 1. Structural

Shows Effect's default deep equality rules across:

- plain nested objects
- arrays
- Maps
- Sets
- Dates
- RegExps
- `NaN`
- a nested mismatch

The important behavior is not the same as JavaScript reference equality:

```ts
Equal.equals(
    { user: { id: 1 } },
    { user: { id: 1 } }
)
// true
```

Maps and Sets are compared without relying on insertion order.

Important gotchas from the API:

- object-pair comparison results are cached in a WeakMap
- objects should not be mutated after their first comparison
- Map / Set structural comparison is O(n²)

### 2. Custom

Defines a real value class:

```ts
class Coordinate implements Equal.Equal {
    constructor(
        readonly x: number,
        readonly y: number
    ) {}

    [Equal.symbol](
        that: Equal.Equal
    ): boolean {
        return (
            that instanceof Coordinate &&
            this.x === that.x &&
            this.y === that.y
        )
    }

    [Hash.symbol](): number {
        return Hash.string(
            `${this.x},${this.y}`
        )
    }
}
```

The demo switches between:

- equal coordinates
- different coordinates
- one `Equal` implementor versus one plain object

The one-sided case is intentionally false.

`Equal.Equal` extends `Hash.Hash`, so a custom equality implementation must obey:

```text
if a equals b
then Hash.hash(a) must equal Hash.hash(b)
```

This is essential for `HashMap` / `HashSet` behavior.

### 3. Reference

Shows the two opt-outs from structural equality.

#### `Equal.byReference`

Creates a proxy:

```ts
const source = { x: 1 }
const ref = Equal.byReference(source)
```

The proxy uses identity equality, but `source` remains an ordinary structural
object.

#### `Equal.byReferenceUnsafe`

Marks the original object:

```ts
const marked =
    Equal.byReferenceUnsafe(source)

marked === source
// true
```

The marking is irreversible for the lifetime of that object.

Use `byReference` when the proxy allocation is acceptable and you do not want to
alter equality semantics on the source object.

### 4. Equivalence

Shows:

```ts
Equal.asEquivalence<A>()
```

passed directly to:

```ts
Array.dedupeWith(...)
```

with both numbers and structural object values.

`asEquivalence` is a thin typed adapter. It still uses `Equal.equals`; it does
not define a second equality system.

## Current public surface

### Equality

- `byReference`
- `equals`

### Guards

- `isEqual`

### Instances

- `asEquivalence`

### Models

- `Equal` interface

### Symbols

- `symbol`

### Unsafe

- `byReferenceUnsafe`

## Type style

The generated demo avoids explicit `any` types. Where a broad value is needed it
uses `unknown`; otherwise it keeps generic or concrete types.

## Integration expectation

Follow the same child-feature integration pattern as the neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `EqualDemo.Message` to the parent Message union,
3. initialize `EqualDemo.init`,
4. delegate child messages to `EqualDemo.update`,
5. render `EqualDemo.view(...)` from the Equal route.

This artifact intentionally performs none of those edits.
