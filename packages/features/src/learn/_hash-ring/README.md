# HashRing

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/HashRing

The current API page is Effect `4.0.0-rc.116` and documents **9 exports**.
The implementation was also checked against:

- `packages/effect/src/HashRing.ts`
- `packages/effect/src/PrimaryKey.ts`

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `hash-ring.ts` — real HashRing construction, routing, reweighting, removal,
  and shard-assignment snapshots.
- `hash-ring.view.ts` — interactive visual demo.
- `hash-ring-preview.png` — static preview of the default Build stage.

## Intended location

```text
packages/features/src/learn/hash-ring/
├── hash-ring.ts
└── hash-ring.view.ts
```

No parent router/model/message/update files are modified.

## Core model

`HashRing<A>` is a **mutable weighted consistent-hashing ring**.

Its nodes must implement:

```ts
PrimaryKey.PrimaryKey
```

which means exposing:

```ts
[PrimaryKey.symbol](): string
```

The returned string is the ring member's identity.

The demo uses:

```ts
class CacheNode
    implements PrimaryKey.PrimaryKey
{
    constructor(
        readonly id: string,
        readonly region: string
    ) {}

    [PrimaryKey.symbol](): string {
        return this.id
    }
}
```

This makes:

```text
cache-a / eu-west
```

and:

```text
cache-a / replacement-region
```

the **same ring member**, because both expose the primary key:

```text
cache-a
```

## 1. Build

The Build stage covers:

```ts
HashRing.make
HashRing.add
HashRing.addMany
HashRing.has
HashRing.isHashRing
```

plus iteration over the ring's registered nodes.

### `make`

```ts
const ring =
    HashRing.make<CacheNode>({
        baseWeight: 8
    })
```

`baseWeight` controls virtual-point density.

The default is:

```text
128
```

and values are clamped to at least:

```text
1
```

### `add` and `addMany`

Both mutate the ring and return the **same instance**.

The demo verifies:

```ts
HashRing.add(
    ring,
    cacheA
) === ring
```

and the same for `addMany`.

This is intentionally different from persistent structures such as `HashMap`.

### Primary-key membership

`has` does not compare object identity.

It computes:

```ts
PrimaryKey.value(node)
```

and tests that string against the ring's node map.

So a newly-created object with the same PrimaryKey is already considered a
member.

Re-adding the same key updates that ring member rather than inserting a second
member.

## 2. Route

The central routing API is:

```ts
HashRing.get(
    ring,
    input
)
```

where `input` is an arbitrary string such as:

```text
user:42
order:100
session:a
```

The input is hashed and associated with a nearby virtual point on the ring.

The result is:

```text
A | undefined
```

An empty ring returns:

```text
undefined
```

### Consistent remapping

The demo routes twelve stable sample keys through three nodes.

It then adds:

```text
cache-d
```

and routes the same keys again.

The UI counts:

```text
unchanged routes
remapped routes
```

from actual `HashRing.get` calls.

The key property of consistent hashing is that a membership change should
remap only part of the keyspace rather than redistributing every input.

Removing a node follows the same principle in the opposite direction.

## 3. Weights

A ring member may be registered with:

```ts
{
    weight: number
}
```

The default node weight is:

```text
1
```

and the implementation clamps it to at least:

```text
0.1
```

### Virtual points

The approximate virtual-point count used when adding a member is:

```text
round(weight × baseWeight)
```

For example, with:

```text
baseWeight = 8
```

the demo uses:

```text
cache-a weight 1   -> 8 points
cache-b weight 2   -> 16 points
cache-c weight 0.5 -> 4 points
```

The exact current counts are displayed from the ring's public `ring` array.

### Reweighting

Re-adding a node with the same PrimaryKey and a different weight:

1. replaces the stored node object,
2. removes its previous virtual points,
3. updates `totalWeightCache`,
4. generates new virtual points for the new weight.

The demo re-adds:

```text
cache-a
```

at weight:

```text
3
```

and with a changed `region`, showing that the same PrimaryKey is updated.

### Removing

`HashRing.remove` also matches by PrimaryKey, so the object passed to remove does
not have to be the exact object stored in the ring.

Like `add`, `remove` mutates and returns the same ring.

## 4. Shards

`HashRing.getShards` is for applications that have a fixed set of numeric shard
indexes rather than arbitrary string request keys.

```ts
const owners =
    HashRing.getShards(
        ring,
        12
    )
```

returns:

```text
Array<CacheNode> | undefined
```

where array index:

```text
0
1
2
...
```

is the shard number and the value is its owner.

### Weighted balancing

The implementation tries to distribute shards according to node weights while
keeping the allocation balanced.

The demo compares:

```text
1 / 1 / 1
```

weights against:

```text
1 / 2 / 1
```

and computes owner counts from the actual returned shard array.

### Count normalization

Finite fractional counts are normalized to an integer by rounding down.

The demo asks for:

```text
8.9
```

and shows an array of length:

```text
8
```

`NaN` and non-positive counts normalize to an empty shard distribution when the
ring contains members.

An entirely empty ring returns:

```text
undefined
```

because there is no node to own a shard.

## Current public surface

### Combinators

- `add`
- `addMany`
- `get`
- `getShards`
- `has`
- `remove`

### Constructors

- `make`

### Guards

- `isHashRing`

### Models

- `HashRing`

## Mutability compared with recent collection modules

This is an important contrast with the previous `HashMap` demo.

`HashMap` normally behaves persistently:

```text
set -> new HashMap
```

`HashRing` behaves as a maintained routing structure:

```text
add    -> same HashRing
remove -> same HashRing
```

That means application code should treat a HashRing as owned mutable state rather
than assume old references preserve old membership.

The routing outputs are deterministic for a given ring state, but changing
membership or weight changes the routing state in place.

## Why virtual points exist

If each physical node appeared only once around a hash circle, placement could
be uneven.

HashRing expands each physical node into many hashed virtual positions:

```text
node-key:1
node-key:2
node-key:3
...
```

and sorts those positions by hash.

More virtual points usually make ownership smoother.

Weight controls how many virtual positions a node receives, allowing capacity
differences to influence routing.

## Type discipline

The generated demo has no explicit `any` annotations.

All callbacks that manipulate node arrays, ring points, Map entries, and message
payloads use explicit types where contextual inference could disappear under
the standalone `--noResolve` check.

Button attributes are derived from `HtmlBuilder`.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `HashRingDemo.Message` to the parent Message union,
3. initialize `HashRingDemo.init`,
4. delegate child messages to `HashRingDemo.update`,
5. render `HashRingDemo.view(...)` from the HashRing route.

This artifact intentionally performs none of those edits.
