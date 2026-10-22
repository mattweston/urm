# MutableHashMap

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/MutableHashMap

The current Effect source package is `4.0.0-rc.116`.

The current `packages/effect/src/MutableHashMap.ts` source exposes **17 public
exports**:

- `MutableHashMap`
- `isMutableHashMap`
- `empty`
- `make`
- `fromIterable`
- `get`
- `keys`
- `values`
- `has`
- `set`
- `modify`
- `modifyAt`
- `remove`
- `clear`
- `size`
- `isEmpty`
- `forEach`

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `mutable-hash-map.ts` — constructors, Option lookup, iteration, in-place
  mutation, and Equal / Hash key semantics.
- `mutable-hash-map.view.ts` — interactive visual demo.

## Intended location

```text
packages/features/src/learn/mutable-hash-map/
├── mutable-hash-map.ts
└── mutable-hash-map.view.ts
```

No parent router/model/message/update files are modified.

## Core idea

`MutableHashMap<K, V>` is a mutable key/value collection.

The important behavioral difference from immutable `HashMap` is:

```text
MutableHashMap
    mutating operations update the same instance

HashMap
    updates return a new immutable map
```

The demo therefore makes reference identity visible for:

```text
set
modify
modifyAt
remove
clear
```

rather than presenting them as persistent collection transformations.

## 1. Create

### `empty`

```ts
const map =
    MutableHashMap.empty<
        string,
        number
    >()
```

creates a fresh empty mutable map.

Each call produces a different map object.

### `make`

```ts
const map =
    MutableHashMap.make(
        ["one", 1],
        ["two", 2]
    )
```

constructs from explicit entries.

The key and value types are inferred from those tuples.

### `fromIterable`

```ts
const map =
    MutableHashMap.fromIterable(
        new Map([
            ["a", 10],
            ["b", 20]
        ])
    )
```

accepts any iterable of readonly `[K, V]` pairs.

This makes it convenient to copy entries from:

```text
Map
Array
generator
other iterable sources
```

### `isMutableHashMap`

```ts
MutableHashMap.isMutableHashMap(
    value
)
```

checks the module's runtime marker and narrows an unknown value.

It does not inspect or validate the generic key/value types.

## 2. Lookup

### `get`

```ts
MutableHashMap.get(
    map,
    key
)
```

returns:

```text
Option<V>
```

rather than throwing or returning an ambiguous `undefined`.

That means:

```text
present key
    → Some(value)

missing key
    → None
```

Both data-first and pipe-friendly forms are supported.

### `has`

```ts
MutableHashMap.has(
    map,
    key
)
```

returns a boolean membership result.

Internally it is based on whether `get` returns `Some`.

### `keys`

```ts
MutableHashMap.keys(
    map
)
```

returns an iterable over the stored keys.

### `values`

```ts
MutableHashMap.values(
    map
)
```

returns an iterable over values.

### The map itself is iterable

`MutableHashMap` implements:

```text
Iterable<[K, V]>
```

so:

```ts
Array.from(
    map
)
```

produces the key/value entries.

### `size`

```ts
MutableHashMap.size(
    map
)
```

returns the number of entries in the backing map.

### `isEmpty`

```ts
MutableHashMap.isEmpty(
    map
)
```

is equivalent in intent to:

```text
size === 0
```

### `forEach`

```ts
MutableHashMap.forEach(
    map,
    (
        value,
        key
    ) => {
        ...
    }
)
```

matches native `Map.prototype.forEach` callback order:

```text
value first
key second
```

Iteration follows the backing Map's iteration order.

## 3. Mutate

All mutation helpers operate in place.

### `set`

```ts
const same =
    MutableHashMap.set(
        map,
        "count",
        1
    )
```

returns the map after mutation.

For the current implementation:

```ts
same === map
```

is true.

If the key is already present, its value is replaced.

If it is absent, a new entry is inserted.

### `modify`

```ts
MutableHashMap.modify(
    map,
    "count",
    (
        value: number
    ) =>
        value + 1
)
```

updates only an existing key.

If the key is missing:

```text
nothing is inserted
the map stays unchanged
```

This distinction is useful when the operation should never create a new entry.

### `modifyAt`

`modifyAt` is the most general entry-level operation.

The callback receives:

```text
Option<V>
```

representing the current state.

It returns the next:

```text
Option<V>
```

#### Insert missing key

```ts
MutableHashMap.modifyAt(
    map,
    "new",
    (
        current
    ) =>
        Option.isNone(
            current
        )
            ? Option.some(
                  42
              )
            : current
)
```

Returning `Some(value)` inserts or updates.

#### Remove existing key

```ts
MutableHashMap.modifyAt(
    map,
    "count",
    () =>
        Option.none()
)
```

removes the entry.

#### Missing key + `None`

If the key was already missing and the callback returns `None`, the map simply
remains unchanged.

A concise mental model is:

```text
current Option<V>
        ↓ callback
next Option<V>

Some → store
None → remove / remain absent
```

### `remove`

```ts
MutableHashMap.remove(
    map,
    key
)
```

deletes one key in place.

Removing a missing key is a no-op.

### `clear`

```ts
const same =
    MutableHashMap.clear(
        map
    )
```

removes every entry while preserving the map object.

Therefore:

```text
same reference
size = 0
```

after the call.

The map can be populated again afterward.

## 4. Equality

The current implementation combines:

```text
native Map storage
+
Effect hashing / equality for object keys
```

The demo uses an explicit `Equal` / `Hash` domain key so the lookup contract is
easy to see.

### Custom key

```ts
class UserId
    implements Equal.Equal
{
    constructor(
        readonly value: string
    ) {}

    [Equal.symbol](
        that:
            Equal.Equal
    ): boolean {
        return (
            that instanceof UserId &&
            this.value ===
                that.value
        )
    }

    [Hash.symbol](): number {
        return Hash.string(
            this.value
        )
    }
}
```

The equality contract is:

```text
if a equals b
then Hash.hash(a) must equal Hash.hash(b)
```

### Value-based lookup

```ts
const map =
    MutableHashMap.make(
        [
            new UserId("42"),
            "Ada"
        ]
    )

MutableHashMap.get(
    map,
    new UserId("42")
)
```

can return:

```text
Some("Ada")
```

even though the lookup key is a different object instance.

The reason is that both `UserId("42")` values:

```text
compare equal
produce the same hash
```

### Primitive keys

Primitive keys use the normal native Map path.

That includes values such as:

```text
string
number
boolean
symbol
undefined
```

### Stable-key requirement

Hashing and equality must remain stable while an object is used as a key.

Do not mutate fields that participate in:

```text
Equal
Hash
```

after insertion.

Effect's Hash documentation explicitly notes that object hashes are cached, so
changing an object's hashed structure after the first hash can leave stale hash
information and break hash-based lookup.

Using readonly value-object keys is the simplest safe pattern.

## Internal storage model

The public `MutableHashMap` interface exposes:

```text
backing
buckets
```

The current implementation uses:

```text
backing:
    Map<K, V>

buckets:
    Map<number, NonEmptyArray<K>>
```

The backing Map stores actual entries and supplies iteration / size.

Hash buckets support locating equal object keys by hash and then checking
`Equal.equals` inside a bucket.

Application code should normally use the public functions rather than
manipulating these structures directly.

## `get` lookup path

At a high level, current lookup behavior follows this shape:

```text
same key reference already in backing?
    → native Map hit

simple primitive key?
    → native Map miss

otherwise
    → compute Effect hash
    → find hash bucket
    → compare bucket keys with Equal.equals
```

This combines fast native lookup for ordinary keys with Effect's equality model
for hashed object keys.

## Pipe-friendly dual APIs

Several functions support both forms.

### Data first

```ts
MutableHashMap.set(
    map,
    "a",
    1
)
```

### Data last

```ts
MutableHashMap.set(
    "a",
    1
)(
    map
)
```

The same pattern applies to:

```text
get
has
set
modify
modifyAt
remove
forEach
```

where documented by their dual signatures.

## MutableHashMap versus native `Map`

Both mutate in place and expose iterable key/value behavior.

MutableHashMap adds Effect-specific behavior such as:

```text
Option-based get
pipe-friendly dual functions
Effect Equal / Hash-aware object-key lookup
Inspectable / Pipeable integration
```

while still using a native Map internally for entry storage.

## MutableHashMap versus immutable `HashMap`

Choose `MutableHashMap` when:

```text
updates are localized
in-place mutation is intentional
you are building / maintaining a map incrementally
you do not need prior versions after each update
```

Choose immutable `HashMap` when:

```text
persistent values should be shareable
previous versions must remain valid
updates should return new collection values
functional transformation is the desired model
```

The two APIs have similarly named operations, but the mutation semantics are
different.

## Current public surface by category

### Models

- `MutableHashMap`

### Guards

- `isMutableHashMap`

### Constructors

- `empty`
- `make`
- `fromIterable`

### Getters / predicates

- `get`
- `keys`
- `values`
- `has`
- `size`
- `isEmpty`

### Mutations

- `set`
- `modify`
- `modifyAt`
- `remove`
- `clear`

### Traversing

- `forEach`

That accounts for all 17 current public exports.

## Type discipline

The generated demo has no explicit `any` annotations.

The custom equality key explicitly types:

```text
Equal.Equal
```

and all mutation callbacks, iterator destructuring, Option callbacks, Message
payloads, and UI callbacks that could lose contextual typing have explicit
types.

Button attributes are derived from `HtmlBuilder`.

The upstream Effect implementation itself uses generic `any` in a few helper
signatures; that is separate from the generated artifact constraint.

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
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `MutableHashMapDemo.Message` to the parent Message union,
3. initialize `MutableHashMapDemo.init`,
4. delegate child messages to `MutableHashMapDemo.update`,
5. render `MutableHashMapDemo.view(...)` from the MutableHashMap route.

This artifact intentionally performs none of those edits.
