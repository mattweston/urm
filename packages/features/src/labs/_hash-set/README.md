# HashSet

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/HashSet

The current API page is Effect `4.0.0-rc.116` and reports **20 exports**. The
implementation was also checked against:

- `packages/effect/src/HashSet.ts`
- `packages/effect/src/internal/hashSet.ts`

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `hash-set.ts` — real HashSet construction, membership, algebra, mapping,
  filtering, folding, and predicate snapshots.
- `hash-set.view.ts` — interactive visual demo.
- `hash-set-preview.png` — static preview of the default Build stage.

## Intended location

```text
packages/features/src/labs/hash-set/
├── hash-set.ts
└── hash-set.view.ts
```

No parent router/model/message/update files are modified.

## Core model

`HashSet<A>` is an immutable set of unique values.

The implementation stores its members in an internal `HashMap<A, boolean>`, so
membership inherits Effect's Hash and Equal semantics.

Conceptually:

```text
input occurrences
      ↓
Hash / Equal equality classes
      ↓
at most one set member per class
```

This differs from simply de-duplicating with JavaScript reference identity.

## 1. Build

The Build stage covers:

```ts
HashSet.empty
HashSet.make
HashSet.fromIterable
HashSet.size
HashSet.isEmpty
HashSet.isHashSet
```

and the public model / namespace helper:

```ts
HashSet.HashSet
HashSet.HashSet.Value<T>
```

### Duplicate collapse

```ts
const set =
    HashSet.make(
        "apple",
        "banana",
        "apple",
        "cherry"
    )
```

has size:

```text
3
```

because the second `"apple"` belongs to an equality class already present.

Likewise:

```ts
HashSet.fromIterable(
    "hello"
)
```

contains only:

```text
h
e
l
o
```

because the repeated `l` collapses.

### Type extraction

For a concrete set:

```ts
const fruit =
    HashSet.make(
        "apple",
        "banana"
    )
```

the namespace utility:

```ts
HashSet.HashSet.Value<
    typeof fruit
>
```

extracts the element type.

## 2. Membership

The demo defines a `Person` that implements both Effect protocols:

```ts
class Person
    implements Equal.Equal, Hash.Hash
{
    constructor(
        readonly name: string
    ) {}

    [Equal.symbol](
        other: unknown
    ): boolean {
        return (
            other instanceof Person &&
            other.name === this.name
        )
    }

    [Hash.symbol](): number {
        return Hash.string(
            this.name
        )
    }
}
```

A set storing:

```ts
new Person("Alice")
```

therefore recognizes a newly-created:

```ts
new Person("Alice")
```

as the same member.

### Persistent updates

```ts
const next =
    HashSet.add(
        original,
        value
    )
```

does not mutate `original`.

The same applies to:

```ts
HashSet.remove
```

The internal implementation also reuses the original instance for two no-op
cases:

```text
add an already-present equal value
remove a missing value
```

The demo verifies both identity optimizations.

### Predicates

The stage also covers:

```ts
HashSet.has
HashSet.some
HashSet.every
```

Remember the empty-set laws:

```text
some(empty, predicate)  = false
every(empty, predicate) = true
```

## 3. Algebra

The module provides the standard set operations.

Given:

```text
left  = a, b, c
right = b, c, d
```

### Union

```ts
HashSet.union(
    left,
    right
)
```

contains:

```text
a, b, c, d
```

### Intersection

```ts
HashSet.intersection(
    left,
    right
)
```

contains:

```text
b, c
```

### Difference

```ts
HashSet.difference(
    left,
    right
)
```

contains:

```text
a
```

Difference is directional:

```text
left \ right
```

is not generally the same as:

```text
right \ left
```

### Subset

```ts
HashSet.isSubset(
    smaller,
    larger
)
```

tests whether every value of the first set belongs to the second set.

It is reflexive:

```ts
HashSet.isSubset(
    set,
    set
)
// true
```

All these operations use the same Hash / Equal membership semantics as `has`.

## 4. Transform

### `map`

```ts
const lengths =
    HashSet.map(
        HashSet.make(
            "apple",
            "banana",
            "cherry"
        ),
        (
            value: string
        ) =>
            value.length
    )
```

produces only:

```text
5, 6
```

even though three strings were mapped.

Both `"apple"` and `"cherry"` map to `5`, and a HashSet keeps only one member
per output equality class.

This means:

```text
map can reduce set cardinality
```

even when the input function runs for every member.

### `filter`

```ts
HashSet.filter(
    HashSet.make(
        1, 2, 3, 4, 5, 6
    ),
    (
        value: number
    ) =>
        value % 2 === 0
)
```

produces:

```text
2, 4, 6
```

The API supports both ordinary predicates and TypeScript refinements, so
`filter` can narrow the element type.

### `reduce`

```ts
HashSet.reduce(
    HashSet.make(
        1, 2, 3
    ),
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
6
```

A HashSet's semantic contract does not promise a meaningful iteration order, so
reductions should not depend on a particular ordering unless the operation is
order-insensitive or the values are sorted externally first.

## Current public surface

### Combinators

- `difference`
- `intersection`
- `union`

### Constructors

- `empty`
- `fromIterable`
- `make`

### Filtering

- `filter`

### Folding

- `reduce`

### Getters

- `size`

### Guards

- `isHashSet`

### Mapping

- `map`

### Models

- `HashSet`

### Mutations

These are persistent transformations despite the category name:

- `add`
- `remove`

### Namespace / type utilities

- `HashSet`
- `HashSet.Value`

### Predicates

- `every`
- `has`
- `isEmpty`
- `isSubset`
- `some`

## HashSet versus JavaScript Set

JavaScript `Set` normally treats two distinct ordinary objects as distinct
members because membership follows JavaScript object identity.

Effect `HashSet` is built on Effect Hash / Equal semantics.

That allows custom domain values to define logical equality through compatible
Hash and Equal implementations, and Effect's broader hash/equality model can
also support structural values.

HashSet updates are persistent:

```text
add/remove -> HashSet value
```

rather than mutating the collection in place like native `Set#add` /
`Set#delete`.

## HashSet versus HashMap

The previous `HashMap` module stores:

```text
key -> value
```

HashSet effectively stores only membership:

```text
value -> present
```

and the implementation is backed by a HashMap whose keys are the set values.

This is why both structures share the same hashing and equality behavior.

## Type discipline

The generated demo has no explicit `any` annotations.

The custom `Person` gives explicit return types for both protocol methods.

All map / filter / reduce / predicate callbacks that could lose contextual
typing under the standalone `--noResolve` check have explicit parameter types.

Every `Message.match` payload is explicitly typed, and Button attributes are
derived from `HtmlBuilder`.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/labs/*` demos:

1. add the child Model to the parent learn Model,
2. add `HashSetDemo.Message` to the parent Message union,
3. initialize `HashSetDemo.init`,
4. delegate child messages to `HashSetDemo.update`,
5. render `HashSetDemo.view(...)` from the HashSet route.

This artifact intentionally performs none of those edits.
