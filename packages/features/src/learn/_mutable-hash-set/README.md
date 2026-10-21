# MutableHashSet

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/MutableHashSet

The current Effect source package is `4.0.0-rc.116`.

The current `packages/effect/src/MutableHashSet.ts` source exposes **10 public
exports**:

- `MutableHashSet`
- `isMutableHashSet`
- `empty`
- `fromIterable`
- `make`
- `add`
- `has`
- `remove`
- `size`
- `clear`

The implementation is built directly on `MutableHashMap`, and the generated
demo checks the corresponding Equal / Hash behavior explicitly.

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `mutable-hash-set.ts` — constructors, membership, in-place mutation, and a
  custom `Equal` / `Hash` value object.
- `mutable-hash-set.view.ts` — interactive visual demo.
- `mutable-hash-set-preview.png` — static preview of the default Create stage.

## Intended location

```text
packages/features/src/learn/mutable-hash-set/
├── mutable-hash-set.ts
└── mutable-hash-set.view.ts
```

No parent router/model/message/update files are modified.

## Core idea

A `MutableHashSet<V>` stores unique values and mutates in place.

Its public model exposes:

```ts
readonly keyMap:
    MutableHashMap.MutableHashMap<
        V,
        boolean
    >
```

so the set is literally implemented in terms of a mutable hash map where each
set value is stored as a key.

Conceptually:

```text
value
  ↓
MutableHashMap key
  ↓
boolean marker
  ↓
unique set membership
```

That means MutableHashSet inherits the same key equality and hashing behavior as
MutableHashMap.

## Mutable versus immutable

Effect has both:

```text
HashSet
MutableHashSet
```

The difference is mutation semantics.

### HashSet

```text
add / remove
    → return new set
    → original remains unchanged
```

### MutableHashSet

```text
add / remove / clear
    → mutate same set object
    → return that same object
```

The current Effect data-type guide recommends the mutable form for controlled,
localized code where repeated mutation is intentional, while immutable HashSet
is better when previous versions must remain stable.

## 1. Create

### `empty`

```ts
const set =
    MutableHashSet.empty<
        string
    >()
```

creates a fresh empty set.

Internally it wraps:

```text
MutableHashMap.empty()
```

as the `keyMap`.

### `make`

```ts
const set =
    MutableHashSet.make(
        "apple",
        "banana",
        "apple",
        "cherry"
    )
```

de-duplicates while constructing.

The final size is:

```text
3
```

because the repeated `"apple"` represents the same set value.

### `fromIterable`

```ts
const set =
    MutableHashSet.fromIterable(
        values
    )
```

accepts any iterable.

For example:

```ts
MutableHashSet.fromIterable(
    "hello"
)
```

iterates the characters:

```text
h e l l o
```

and stores the unique result:

```text
h e l o
```

### `isMutableHashSet`

```ts
MutableHashSet.isMutableHashSet(
    value
)
```

checks the module's runtime marker.

The current Effect test suite specifically verifies that:

```text
MutableHashSet value → true
native Set          → false
```

So this is an Effect MutableHashSet guard, not a generic "set-like" predicate.

## 2. Membership

### `has`

```ts
MutableHashSet.has(
    set,
    value
)
```

checks membership.

Both data-first and pipe-friendly forms are supported:

```ts
MutableHashSet.has(
    set,
    "apple"
)
```

or:

```ts
MutableHashSet.has(
    "apple"
)(
    set
)
```

The implementation delegates to:

```text
MutableHashMap.has(
    set.keyMap,
    value
)
```

so equality semantics come from the map.

### `size`

```ts
MutableHashSet.size(
    set
)
```

delegates to the underlying mutable map size.

It reports the number of unique values.

Adding the same value repeatedly does not increase size.

### Iterable

`MutableHashSet` implements:

```text
Iterable<V>
```

so standard JavaScript iteration works directly:

```ts
Array.from(
    set
)

[...set]

for (
    const value of set
) {
    ...
}
```

There is no separate `values()` export in this module because the set itself is
already the iterable of values.

### Iteration implementation

The current source builds the iterator from the underlying `keyMap` entries and
yields only the keys.

Application code does not need to know about the internal boolean marker.

## 3. Mutate

### `add`

```ts
const returned =
    MutableHashSet.add(
        set,
        value
    )
```

mutates the set and returns it.

The implementation forwards to:

```text
MutableHashMap.set(
    set.keyMap,
    value,
    true
)
```

and then returns:

```text
set
```

Therefore:

```ts
returned === set
```

is true.

### Duplicate add

Adding an already-present value keeps the set unchanged logically.

For example:

```ts
const set =
    MutableHashSet.make(
        1,
        2,
        3
    )

MutableHashSet.add(
    set,
    3
)
```

still has size:

```text
3
```

### `remove`

```ts
MutableHashSet.remove(
    set,
    value
)
```

mutates in place and returns the same set.

It delegates to:

```text
MutableHashMap.remove
```

on the underlying key map.

Removing a missing value is a no-op.

### `clear`

```ts
const returned =
    MutableHashSet.clear(
        set
    )
```

empties the underlying mutable map.

The set remains the same object:

```text
returned === set
```

and:

```text
size = 0
```

afterward.

The same set can be populated again after clearing.

## Pipe-friendly mutation

`add`, `has`, and `remove` are dual APIs.

For example:

```ts
const addCherry =
    MutableHashSet.add(
        "cherry"
    )

addCherry(
    set
)
```

still mutates `set`.

Pipeable syntax changes call style, not immutability.

## 4. Equality

This stage is intentionally tied to the preceding `MutableHashMap` module.

MutableHashSet uniqueness follows the equality / hashing behavior used for map
keys.

The demo uses a domain value:

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

## Distinct object references

These are different JavaScript objects:

```ts
const first =
    new UserId(
        "42"
    )

const second =
    new UserId(
        "42"
    )

first === second
// false
```

But their Effect equality is:

```ts
Equal.equals(
    first,
    second
)
// true
```

and their hashes are equal.

Therefore:

```ts
const set =
    MutableHashSet.make(
        first
    )

MutableHashSet.add(
    set,
    second
)

MutableHashSet.size(
    set
)
// 1
```

The two references represent one logical set value.

## Membership with an equal object

After storing `first`:

```ts
MutableHashSet.has(
    set,
    second
)
// true
```

even though `second` was not the exact object reference inserted initially.

A logically different key:

```ts
new UserId(
    "43"
)
```

does not match.

## Equal / Hash contract

For custom hashable equality:

```text
if a equals b
then hash(a) must equal hash(b)
```

Breaking that contract can put equal values in different hash buckets and make
membership / uniqueness incorrect.

### Stable identity

Fields used in equality or hashing should not change while a value is stored.

Effect's Hash documentation notes that object hashes may be cached. Mutating an
object after it has been hashed can therefore leave stale hash information.

The demo uses:

```ts
readonly value: string
```

to make the key stable by construction.

## Primitive values

Primitive duplicates behave as normal set duplicates.

For example:

```ts
MutableHashSet.make(
    "a",
    "a",
    "a"
)
```

has size:

```text
1
```

The underlying MutableHashMap has a direct native Map path for simple primitive
keys.

## Underlying `keyMap`

The public interface includes:

```ts
readonly keyMap:
    MutableHashMap.MutableHashMap<
        V,
        boolean
    >
```

This is useful for understanding implementation and low-level integrations, but
normal code should use the set API:

```text
add
has
remove
size
clear
```

rather than treating `keyMap` as the primary interface.

## Inspectable and Pipeable behavior

MutableHashSet also implements:

```text
Pipeable
Inspectable
Iterable
```

The current source provides:

```text
toString
toJSON
Node inspect support
pipe()
```

through its prototype.

These are model behaviors rather than separate top-level exports.

## No set algebra in this module

Unlike immutable `HashSet`, the current `MutableHashSet` API does not expose
top-level helpers for:

```text
union
intersection
difference
map
filter
reduce
```

The mutable module is intentionally small and focused on:

```text
construction
membership
in-place add/remove/clear
iteration
size
```

If set algebra is central to the workflow, immutable `HashSet` has the richer
functional surface.

## Current public surface

### Model

- `MutableHashSet`

### Guard

- `isMutableHashSet`

### Constructors

- `empty`
- `fromIterable`
- `make`

### Membership / getters

- `has`
- `size`

### Mutations

- `add`
- `remove`
- `clear`

That accounts for all 10 current public exports.

## Type discipline

The generated demo has no explicit `any` annotations.

The custom value object explicitly types `Equal.Equal`, and all iterators,
Message payloads, and UI callbacks that could lose contextual typing have
explicit types.

Button attributes are derived from `HtmlBuilder`.

The upstream Effect implementation itself may use generic `any` in other module
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
2. add `MutableHashSetDemo.Message` to the parent Message union,
3. initialize `MutableHashSetDemo.init`,
4. delegate child messages to `MutableHashSetDemo.update`,
5. render `MutableHashSetDemo.view(...)` from the MutableHashSet route.

This artifact intentionally performs none of those edits.
