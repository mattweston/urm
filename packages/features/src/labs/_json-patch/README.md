# JsonPatch

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/JsonPatch

The current Effect source package is `4.0.0-rc.116`, and `JsonPatch.ts` exposes
four public API entries:

- `JsonPatchOperation`
- `JsonPatch`
- `get`
- `apply`

The implementation was checked against the current:

```text
packages/effect/src/JsonPatch.ts
packages/effect/src/JsonPointer.ts
```

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `json-patch.ts` — deterministic diff, immutable apply, array semantics, JSON
  Pointer escaping, and error examples.
- `json-patch.view.ts` — interactive visual demo.
- `json-patch-preview.png` — static preview of the default Diff stage.

## Intended location

```text
packages/features/src/labs/json-patch/
├── json-patch.ts
└── json-patch.view.ts
```

No parent router/model/message/update files are modified.

## Core model

A patch is:

```ts
type JsonPatch =
    ReadonlyArray<
        JsonPatchOperation
    >
```

and each operation is one of:

```text
add
remove
replace
```

addressed by a JSON Pointer path.

The module intentionally implements a deterministic subset of RFC 6902 rather
than every RFC operation.

There is no:

```text
move
copy
test
```

operation in `JsonPatchOperation`.

## 1. Diff

The primary generator is:

```ts
JsonPatch.get(
    oldValue,
    newValue
)
```

It recursively compares two `Schema.Json` values and returns an ordered patch.

### Identical values

When:

```ts
Object.is(
    oldValue,
    newValue
)
```

the recursive comparison stops immediately.

For a fully unchanged JSON document:

```text
patch = []
```

### Objects

Object keys are gathered from both documents and sorted before comparison.

That makes generated operation ordering deterministic.

For a nested example containing:

```text
count
meta
users
```

the diff walks those object keys in sorted order.

For each key it emits:

```text
replace  if both sides contain a changed value
add      if only the new object contains the key
remove   if only the old object contains the key
```

Nested arrays and objects recurse instead of automatically replacing the whole
subtree.

### Primitive / incompatible structural changes

When the two sides are not both arrays and are not both JSON objects, the diff
falls back to:

```ts
{
    op: "replace",
    path,
    value: newValue
}
```

At the root, the path is:

```text
""
```

so changing:

```text
"draft"
```

to:

```json
{"status":"published"}
```

becomes one root replace operation.

### Deterministic, not necessarily minimal

`get` is designed to produce stable patches.

It does not promise the smallest possible number of operations.

That distinction matters most for arrays because elements are compared by index
rather than by move detection or identity matching.

## 2. Apply

The replay API is:

```ts
JsonPatch.apply(
    patch,
    document
)
```

Operations run sequentially from first to last.

That means a later operation observes changes made by every earlier operation.

### Immutability

`apply` does not mutate the supplied JSON document.

When changing a nested array or object, the implementation:

1. resolves the parent path,
2. copies the affected parent container,
3. applies the local operation,
4. rebuilds copied ancestors back to the root.

This gives an immutable result while preserving structural sharing outside the
changed path where possible.

The demo records the source document before and after apply to show it remains
unchanged.

### Empty patch

For:

```ts
JsonPatch.apply(
    [],
    document
)
```

the implementation simply returns the original document value.

For object or array documents this means:

```text
same reference = true
```

### Root replacement

The empty pointer:

```text
""
```

means the document root.

For:

```ts
{
    op: "replace",
    path: "",
    value: {
        ready: true
    }
}
```

`apply` returns the replacement value directly.

Root `add` behaves the same way in the current implementation.

Root `remove` is explicitly rejected.

### Description

Operations may carry:

```ts
description?: string
```

for documentation.

`apply` ignores that descriptive field and executes the structural operation.

## 3. Arrays

Arrays are deliberately simple and deterministic.

### Shared prefix

For the portion where both arrays have indexes, `get` recursively compares by
position.

Given:

```text
before = ["a", "b", "c", "d"]
after  = ["A", "b"]
```

the shared prefix produces:

```text
replace /0 = "A"
```

while index `1` is unchanged.

### Shrinking arrays

Removals are generated from highest index to lowest.

The example therefore produces:

```text
remove /3
remove /2
```

rather than the other way around.

This prevents an earlier removal from shifting the index of a later removal.

### Growing arrays

For:

```text
before = [1]
after  = [1, 2, 3]
```

generated additions ascend:

```text
add /1 = 2
add /2 = 3
```

### Manual append

For array `add`, the final pointer token may be:

```text
-
```

which appends at the current array length:

```ts
{
    op: "add",
    path: "/items/-",
    value: "c"
}
```

### Index validation

Numeric array path tokens must use canonical non-negative integer syntax.

Examples accepted by the implementation include:

```text
0
1
25
```

Examples rejected include forms such as:

```text
-1
01
1.5
```

For `add`, an index equal to the current length is allowed.

For `remove` or `replace`, the index must already exist.

The `-` token is valid only for `add`.

## 4. JSON Pointer behavior

Generated object property paths use RFC 6901 token escaping.

Within one path segment:

```text
~ -> ~0
/ -> ~1
```

Therefore a property named:

```text
a/b
```

appears in a patch as:

```text
/a~1b
```

and:

```text
c~d
```

appears as:

```text
/c~0d
```

The corresponding unescaping happens while applying the patch.

## Sequential operations

A patch document is ordered state transition data.

For example:

```ts
[
    {
        op: "add",
        path: "/items/-",
        value: "b"
    },
    {
        op: "replace",
        path: "/items/1",
        value: "B"
    },
    {
        op: "add",
        path: "/ready",
        value: true
    }
]
```

applied to:

```json
{"items":["a"]}
```

works because operation 2 sees the appended element created by operation 1.

## Errors

`apply` throws ordinary `Error` values for invalid patch structure at runtime.

Examples include:

```text
non-empty pointer without leading /
missing parent path
remove / replace of a missing object property
out-of-bounds array index
invalid array index token
"-" used for remove or replace
remove at the root
attempting to descend through a primitive
```

The module does not wrap these failures in `Effect` or `Result`.

The demo catches one missing-property error only to make the failure text visible
in the UI.

## Current public surface

### Models

- `JsonPatch`
- `JsonPatchOperation`

### Transforming

- `apply`
- `get`

That is the full module surface.

## JsonPatch versus JsonPointer

`JsonPatch` owns the change document:

```text
what operation?
what path?
what value?
```

`JsonPointer` defines path syntax and token escaping.

`JsonPatch` uses the JsonPointer helpers internally to encode object keys while
generating patches and decode path tokens while applying them.

The demo keeps its public API focused on `JsonPatch`; pointer escaping is shown
because it is observable in generated operation paths.

## JsonPatch versus mutable object editing

A direct JavaScript update might mutate:

```ts
document.user.name =
    "Bob"
```

A JsonPatch workflow instead creates explicit data:

```ts
[
    {
        op: "replace",
        path: "/user/name",
        value: "Bob"
    }
]
```

That patch can then be:

```text
logged
stored
sent over a wire
replayed
inspected
compared
```

while `apply` still produces a new JSON document rather than changing the source.

## Type discipline

The generated demo has no explicit `any` annotations.

Every operation mapper, error handler, Message payload, and UI callback that
could lose contextual typing has an explicit type.

Button attributes are derived from `HtmlBuilder`.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/labs/*` demos:

1. add the child Model to the parent learn Model,
2. add `JsonPatchDemo.Message` to the parent Message union,
3. initialize `JsonPatchDemo.init`,
4. delegate child messages to `JsonPatchDemo.update`,
5. render `JsonPatchDemo.view(...)` from the JsonPatch route.

This artifact intentionally performs none of those edits.
