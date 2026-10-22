# MutableList

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/MutableList

The current Effect source package is `4.0.0-rc.116`.

The current `packages/effect/src/MutableList.ts` public teaching surface contains
**19 entries**:

- `MutableList`
- `MutableList.Bucket`
- `Empty`
- `make`
- `append`
- `prepend`
- `prependAll`
- `prependAllUnsafe`
- `appendAll`
- `appendAllUnsafe`
- `clear`
- `takeN`
- `takeNVoid`
- `takeAll`
- `take`
- `toArrayN`
- `toArray`
- `filter`
- `remove`

`Empty` is both a runtime unique symbol and the corresponding exported type.

The implementation and current tests were checked against:

```text
packages/effect/src/MutableList.ts
packages/effect/test/MutableList.test.ts
```

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `mutable-list.ts` — append / prepend flows, synchronous front consumption,
  bounded draining, snapshots, filtering, strict-equality removal, and empty
  sentinel handling.
- `mutable-list.view.ts` — interactive visual demo.

## Intended location

```text
packages/features/src/learn/mutable-list/
├── mutable-list.ts
└── mutable-list.view.ts
```

No parent router/model/message/update files are modified.

## Core idea

`MutableList<A>` is a mutable ordered buffer optimized for repeated writes and
front consumption.

Conceptually:

```text
prepend
   ↓
[ head ... values ... tail ]
                        ↑
                     append

take / takeN
   ↓
consume from head
```

The list exposes:

```text
head
tail
length
```

and mutating operations keep those fields current.

It is implemented as linked `Bucket<A>` nodes rather than as one monolithic
array.

## 1. Build

### `make`

```ts
const list =
    MutableList.make<
        number
    >()
```

starts with:

```text
head = undefined
tail = undefined
length = 0
```

### `append`

```ts
MutableList.append(
    list,
    value
)
```

adds one value at the tail.

It returns:

```text
void
```

because mutation is communicated through the list itself.

### `prepend`

```ts
MutableList.prepend(
    list,
    value
)
```

adds one value at the head.

For example:

```text
append 2
prepend 1
append 3
```

produces:

```text
1, 2, 3
```

The current Effect tests explicitly cover append-after-prepend behavior so the
tail linkage does not lose prepended values.

## `Bucket`

The public namespace type is:

```ts
MutableList.MutableList.Bucket<A>
```

with:

```text
array
mutable
offset
next
```

The list exposes the first and last Bucket through:

```text
head
tail
```

Most application code should treat Bucket as an implementation-oriented model
and use MutableList operations instead of manually editing these fields.

## Why buckets?

The bucket representation lets the list:

```text
append batches
prepend batches
advance an offset while taking
reuse / transfer arrays in unsafe bulk operations
```

without shifting every remaining element of one large array after each front
take.

The public contract is still simply an ordered mutable list.

## 2. Queue-like consumption

MutableList can behave like a synchronous queue buffer, but it is not Effect's
concurrent `Queue`.

### `take`

```ts
const value =
    MutableList.take(
        list
    )
```

removes the first value.

If no value exists, it immediately returns:

```ts
MutableList.Empty
```

It does **not** suspend.

That makes it appropriate for low-level synchronous buffers where the caller
already controls availability.

### `Empty`

The module exports:

```ts
MutableList.Empty
```

as a unique symbol.

A safe branch looks like:

```ts
const value =
    MutableList.take(
        list
    )

if (
    value ===
    MutableList.Empty
) {
    // no value available
} else {
    // value is A
}
```

The matching exported type is:

```ts
MutableList.Empty
```

so a take result can be typed as:

```text
A | MutableList.Empty
```

### MutableList versus Queue

`Queue.take` is an Effect operation that can suspend until a value arrives.

`MutableList.take` is synchronous:

```text
value exists
    → return and remove it

empty
    → return Empty immediately
```

So:

```text
MutableList
    synchronous data structure

Queue
    concurrent Effect synchronization primitive
```

## `takeAll`

```ts
const values =
    MutableList.takeAll(
        list
    )
```

drains every current value into an array.

Afterward:

```text
length = 0
head = undefined
tail = undefined
```

### `toArray`

```ts
const snapshot =
    MutableList.toArray(
        list
    )
```

copies the current contents **without consuming them**.

The key distinction is:

```text
toArray
    copy all, keep list

takeAll
    return all, empty list
```

### `toArrayN`

```ts
MutableList.toArrayN(
    list,
    n
)
```

copies only a bounded prefix and also leaves the list unchanged.

This is useful for peeking at upcoming items without consuming them.

## 3. Batch

### `appendAll`

```ts
const added =
    MutableList.appendAll(
        list,
        iterable
    )
```

appends all values and returns the count added.

An empty iterable returns:

```text
0
```

and is a no-op.

The tests explicitly cover empty bulk appends followed by later appends to ensure
the list remains in a valid empty / tail state.

### `prependAll`

```ts
MutableList.prependAll(
    list,
    iterable
)
```

prepends a whole iterable while preserving iterable order.

For:

```text
existing = [4, 5]
prepend = [1, 2, 3]
```

the result is:

```text
[1, 2, 3, 4, 5]
```

The tests also verify that subsequent append remains correctly linked.

## Unsafe bulk variants

The lower-level bulk helpers are:

```ts
MutableList.prependAllUnsafe(
    list,
    array,
    mutable
)

MutableList.appendAllUnsafe(
    list,
    array,
    mutable
)
```

The important option is:

```text
mutable = true
```

When enabled, the list can reuse the input array directly.

That is an ownership transfer.

After passing an array with:

```text
mutable = true
```

the caller must not continue reading or modifying that array.

The normal `appendAll` / `prependAll` APIs are safer when array ownership should
remain with the caller.

## `takeN`

```ts
const batch =
    MutableList.takeN(
        list,
        n
    )
```

removes up to `n` values from the front and returns them.

It never waits for additional values.

If `n` exceeds current length, all available values are drained.

### Count normalization

The current implementation normalizes bounded operation counts.

Finite fractional values are floored:

```text
1.9 → 1
```

`NaN` and non-positive values act like zero:

```text
takeN(list, NaN)
    → []
    → list unchanged
```

The current tests verify this behavior for:

```text
takeN
takeNVoid
toArrayN
```

### `takeNVoid`

```ts
MutableList.takeNVoid(
    list,
    n
)
```

removes up to `n` items but does not allocate / return the removed values.

Use it when the goal is simply to discard a prefix.

For example:

```text
list = [1, 2, 3]
takeNVoid(list, 1)
list = [2, 3]
```

It uses the same count normalization as `takeN`.

## Zero-copy take path

The current `takeN` implementation has a fast path when:

```text
n === list.length
one bucket
bucket offset === 0
```

In that case it can return the bucket's array directly and clear the list,
rather than copying every value.

That is an implementation optimization; callers should rely only on the
documented returned array / emptied-list behavior.

## 4. Filter

### `filter`

```ts
MutableList.filter(
    list,
    (
        value
    ) =>
        predicate(
            value
        )
)
```

filters the list in place.

The operation rebuilds the current live values into one mutable bucket and
updates:

```text
head
tail
length
```

### Filtering everything out

When no values match, the current implementation calls:

```text
clear(list)
```

so the list returns to a genuine empty state:

```text
length = 0
head = undefined
tail = undefined
```

This behavior is specifically covered by the current tests.

The July 2026 Effect v4 beta recap notes a fix to `MutableList.filter` for
all-elements-removed empty-state handling.

### Predicate index

The predicate signature is:

```ts
(
    value: A,
    i: number
) => boolean
```

The public API exposes that index parameter.

The demo intentionally focuses on value-based filtering rather than depending
on index interpretation across multiple internal Bucket nodes.

## `remove`

```ts
MutableList.remove(
    list,
    value
)
```

removes **all** occurrences matching that value.

It is implemented through:

```ts
filter(
    list,
    (
        current
    ) =>
        current !== value
)
```

That means equality is JavaScript strict equality.

It does **not** use Effect:

```text
Equal.equals
Hash
```

### Primitive example

```text
apple, banana, apple, cherry, apple
remove "apple"
→ banana, cherry
```

The current tests verify all matching string values are removed and `length`
is updated.

### Object example

For two separate objects:

```ts
const stored =
    {
        id: 1
    }

const sameShape =
    {
        id: 1
    }
```

then:

```ts
stored !== sameShape
```

so:

```ts
MutableList.remove(
    list,
    sameShape
)
```

does not remove `stored`.

This differs from Effect hash collections that can use structural equality.

## `clear`

```ts
MutableList.clear(
    list
)
```

resets:

```text
head = undefined
tail = undefined
length = 0
```

and returns `void`.

The same list object can later be reused with new append / prepend operations.

## Current public surface

### Models

- `MutableList`
- `MutableList.Bucket`

### Empty sentinel

- `Empty` runtime unique symbol / exported type

### Constructor

- `make`

### Add to ends

- `append`
- `prepend`
- `prependAll`
- `prependAllUnsafe`
- `appendAll`
- `appendAllUnsafe`

### Front consumption

- `take`
- `takeN`
- `takeNVoid`
- `takeAll`

### Snapshotting

- `toArray`
- `toArrayN`

### Filtering / reset

- `filter`
- `remove`
- `clear`

That gives the 19 public entries represented by the current source surface.

## Relationship to Array

Use an ordinary mutable Array when:

```text
random index access matters
native JS methods are sufficient
front-shifting cost is not important
```

MutableList is more specialized around:

```text
append / prepend
front draining
bulk movement
internal bucket reuse
```

rather than arbitrary indexed access.

## Relationship to Queue

Use Effect `Queue` when producers and consumers need:

```text
fiber suspension
back-pressure
bounded capacity
shutdown
concurrent synchronization
```

Use `MutableList` when the requirement is only:

```text
fast synchronous ordered buffering
```

and higher-level code already owns synchronization.

## Type discipline

The generated demo has no explicit `any` annotations.

Every filter callback, formatter callback, Message payload, and UI callback that
could lose contextual typing has an explicit type.

Button attributes are derived from `HtmlBuilder`.

The upstream `MutableList.ts` implementation currently uses internal `any` casts
when clearing consumed mutable bucket positions; that is separate from the
generated artifact constraint.

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
resolved, so this check catches local syntax and implicit-any issues rather than
replacing a full typecheck inside the target monorepo.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `MutableListDemo.Message` to the parent Message union,
3. initialize `MutableListDemo.init`,
4. delegate child messages to `MutableListDemo.update`,
5. render `MutableListDemo.view(...)` from the MutableList route.

This artifact intentionally performs none of those edits.
