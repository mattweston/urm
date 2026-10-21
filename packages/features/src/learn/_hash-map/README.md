# HashMap

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/HashMap

The current API page is Effect `4.0.0-rc.116` and reports **40 exports**. The
implementation was also checked against:

- `packages/effect/src/HashMap.ts`
- `packages/effect/src/internal/hashMap.ts`
- `packages/effect/src/Hash.ts`

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `hash-map.ts` — real HashMap construction, lookup, transformation, and transient
  mutation examples.
- `hash-map.view.ts` — interactive visual demo.
- `hash-map-preview.png` — static preview of the default Build stage.

## Intended location

```text
packages/features/src/learn/hash-map/
├── hash-map.ts
└── hash-map.view.ts
```

No parent router/model/message/update files are modified.

## Core model

`HashMap<K, V>` is an immutable Hash Array Mapped Trie.

Normal operations such as:

```ts
HashMap.set
HashMap.remove
HashMap.modify
HashMap.map
HashMap.filter
```

return persistent map values.

The implementation hashes keys with:

```ts
Hash.hash(key)
```

and then resolves candidate keys with Effect equality.

That means the key model is broader than JavaScript `Map` reference identity.

## 1. Build

The Build stage covers:

```ts
HashMap.empty
HashMap.make
HashMap.fromIterable
HashMap.isHashMap
HashMap.isEmpty
HashMap.size
```

plus all primary iteration views:

```ts
HashMap.keys
HashMap.values
HashMap.entries
HashMap.toValues
HashMap.toEntries
```

### Structural object keys

The demo stores:

```ts
{
    id: 1,
    scope: "prod"
}
```

and looks it up with a fresh object containing the same fields.

Because Effect's hashing and equality semantics are compatible, the structurally
equal lookup succeeds.

This comes with an important hash rule: ordinary objects should be treated as
immutable after their first hash computation.

Effect caches object hashes. Mutating a key after hashing can make the cached
hash inconsistent with its new structural contents and therefore break
hash-based lookups.

If mutable object identity is the desired key behavior, use a reference-oriented
hash/equality strategy instead of structural content.

## 2. Lookup

### Safe lookup

```ts
HashMap.get(
    map,
    key
)
```

returns:

```text
Option<V>
```

so missing keys remain explicit data.

### Known-present lookup

```ts
HashMap.getUnsafe(
    map,
    key
)
```

returns `V` directly but throws when the key is absent.

The demo only uses it for a key known to exist.

### Precomputed hashes

```ts
const hash =
    Hash.string(
        "downloads"
    )

HashMap.getHash(
    map,
    "downloads",
    hash
)

HashMap.hasHash(
    map,
    "downloads",
    hash
)
```

avoid recomputing a hash that the caller already has.

The hash is only the bucket selector. Key equality still has to match.

Therefore:

```text
matching hash + different key
```

does not make the key equal, and:

```text
wrong hash + correct key
```

cannot locate the existing bucket.

### Predicate search

The demo also covers:

```ts
HashMap.hasBy
HashMap.findFirst
HashMap.some
HashMap.every
```

These operate directly over entries without first converting the HashMap to an
array.

## 3. Transform

The Update case covers the persistent update family:

```ts
HashMap.set
HashMap.setMany
HashMap.modify
HashMap.modifyAt
HashMap.remove
HashMap.removeMany
```

### `modify`

Only updates an existing key.

If the key is absent, the map stays unchanged.

### `modifyAt`

The update function receives:

```text
Some(existingValue)
```

or:

```text
None
```

and returns another Option.

That lets one operation express:

```text
insert
update
remove
leave absent
```

`modifyHash` is the corresponding pre-hashed variant.

### Filtering

The Filter case demonstrates:

```ts
HashMap.filter
HashMap.filterMap
HashMap.compact
```

`filterMap` returns only `Result.Success` values and can transform those values
at the same time.

`compact` converts:

```text
HashMap<K, Option<A>>
```

into:

```text
HashMap<K, A>
```

by removing None entries.

### Combining

`union` inserts all entries from the right map into the left map.

When both maps contain equal keys, the right value wins.

The stage also shows `flatMap`, which maps each entry to another HashMap and
flattens those maps.

### Mapping and folding

Covered APIs:

```ts
HashMap.map
HashMap.reduce
HashMap.forEach
```

`map` preserves keys while changing values.

`reduce` folds entries to one value.

`forEach` visits every key/value pair for side effects outside the map itself.

## 4. Batch

Ordinary persistent operations are excellent for normal updates, but repeated
large batches can use a temporary editable HAMT.

### `mutate`

The convenient form is:

```ts
const next =
    HashMap.mutate(
        original,
        (mutable) => {
            HashMap.set(
                mutable,
                "c",
                3
            )

            HashMap.remove(
                mutable,
                "a"
            )
        }
    )
```

Inside this callback, update operations reuse the transient data structure.

The original persistent HashMap remains unchanged.

### Manual mutation window

The lower-level form is:

```ts
const mutable =
    HashMap.beginMutation(
        original
    )

HashMap.set(
    mutable,
    "c",
    3
)

HashMap.remove(
    mutable,
    "a"
)

const finalized =
    HashMap.endMutation(
        mutable
    )
```

The implementation marks the transient map editable.

During this window:

```ts
HashMap.set(
    mutable,
    "c",
    3
) === mutable
```

because the editable instance is updated in place.

`endMutation` marks that same transient object immutable and returns it.

The original map continues to reference its persistent structure independently.

## Current API families

The 40 documented exports are organized into these major groups.

### Combining

- `union`

### Constructors

- `empty`
- `fromIterable`
- `make`

### Filtering

- `compact`
- `filter`
- `filterMap`

### Folding

- `reduce`

### Getters / iteration

- `entries`
- `get`
- `getHash`
- `keys`
- `size`
- `toEntries`
- `toValues`
- `values`

### Guards / predicates / search

- `every`
- `findFirst`
- `has`
- `hasBy`
- `hasHash`
- `isEmpty`
- `isHashMap`
- `some`

### Mapping / sequencing / traversal

- `flatMap`
- `forEach`
- `map`

### Mutations / transient helpers

- `beginMutation`
- `endMutation`
- `mutate`

### Transforming

- `modify`
- `modifyAt`
- `modifyHash`
- `remove`
- `removeMany`
- `set`
- `setMany`

### Unsafe

- `getUnsafe`

### Model / namespace types

The `HashMap` model and namespace also provide type-level helpers such as:

```ts
HashMap.HashMap.Key<T>
HashMap.HashMap.Value<T>
HashMap.HashMap.Entry<T>
HashMap.HashMap.UpdateFn<V>
```

These extract map types or describe Option-based update functions.

## HashMap versus JavaScript Map

JavaScript `Map` normally compares object keys by reference identity.

Effect HashMap uses Effect hashing and equality semantics, which lets immutable
structural values act naturally as keys.

HashMap also provides persistent immutable updates with structural sharing,
whereas JavaScript `Map#set` mutates the map object itself.

For efficient update batches, HashMap's transient mutation helpers temporarily
recover in-place efficiency without changing the persistent public model.

## Type discipline

The generated demo has no explicit `any` annotations.

All callback parameters that could lose contextual typing in the standalone
`--noResolve` check have explicit types.

Every `Message.match` payload is explicitly typed, and Button attributes are
derived from `HtmlBuilder`.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `HashMapDemo.Message` to the parent Message union,
3. initialize `HashMapDemo.init`,
4. delegate child messages to `HashMapDemo.update`,
5. render `HashMapDemo.view(...)` from the HashMap route.

This artifact intentionally performs none of those edits.
