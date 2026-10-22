# FiberMap

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/FiberMap

The current API page is Effect `4.0.0-rc.115` and reports 19 exports. The
implementation was also checked against the current
`packages/effect/src/FiberMap.ts`.

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `fiber-map.ts` — real scoped FiberMap operations and deterministic snapshots.
- `fiber-map.view.ts` — interactive visual demo.

## Intended location

```text
packages/features/src/learn/fiber-map/
├── fiber-map.ts
└── fiber-map.view.ts
```

No parent router/model/message/update files are modified.

## Teaching stages

### 1. Manage

Creates a scoped map and starts two long-lived fibers under different keys:

```text
search
autosave
```

The stage demonstrates:

- `make`
- `run`
- `size`
- `has`
- `hasUnsafe`
- `get`
- `getUnsafe`
- iteration over the map
- `remove`
- `clear`
- `isFiberMap`

Two distinct keys can remain live at the same time.

Removing:

```ts
yield* FiberMap.remove(
    map,
    "search"
)
```

interrupts only the `search` fiber. The `autosave` entry stays alive.

`clear` then interrupts every remaining managed fiber.

Completed fibers automatically remove themselves from the map.

The owning Scope interrupts all remaining fibers when it closes.

### 2. Replace

The replacement rule is **per key**.

With normal `run`:

```text
search:first
        ↓ same key
search:replacement
```

the previous `search` fiber is interrupted and the replacement becomes current.

A separate key such as:

```text
autosave
```

is unaffected.

With:

```ts
{
    onlyIfMissing: true
}
```

the existing fiber for that key remains installed and the new incoming fiber is
immediately interrupted.

The same policy is shared by:

- `run`
- `set`
- `setUnsafe`

Re-registering the exact same Fiber object under the same key is a no-op.

### 3. Wait

This stage deliberately distinguishes:

```ts
FiberMap.awaitEmpty(map)
```

from:

```ts
FiberMap.join(map)
```

#### `awaitEmpty`

Waits until the backing map contains no managed fibers.

The implementation repeatedly awaits a current fiber until the map size reaches
zero.

Normal successful fiber completion removes entries and eventually lets
`awaitEmpty` return `void`.

#### `join`

Listens to the map's shared failure Deferred.

A non-ignored managed fiber failure such as:

```ts
Effect.fail("boom")
```

completes that Deferred and causes `join` to fail.

Normal success only removes an entry; it does not complete `join`.

Interruption-only exits are ignored by default, which is why:

- same-key replacement
- `remove`
- `clear`
- scope shutdown

do not normally propagate as parent failures.

### 4. Runtime

Covers:

```ts
FiberMap.makeRuntime
FiberMap.makeRuntimePromise
FiberMap.runtime
FiberMap.runtimePromise
```

The runtime functions accept:

```text
key + Effect
```

and fork into the managed map.

Different keys can be launched independently:

```ts
run(
    "a",
    Effect.succeed(1)
)

run(
    "b",
    Effect.succeed(2)
)
```

The Promise variants preserve the same keyed replacement semantics.

Successful Promise runs resolve with the Effect value. Failed runs reject with
the squashed Cause.

## Current public surface

### Constructors

- `make`
- `makeRuntime`
- `makeRuntimePromise`

### Combinators

- `awaitEmpty`
- `clear`
- `get`
- `getUnsafe`
- `has`
- `hasUnsafe`
- `join`
- `remove`
- `run`
- `runtime`
- `runtimePromise`
- `set`
- `setUnsafe`
- `size`

### Guards

- `isFiberMap`

### Models

- `FiberMap`

## FiberMap versus FiberHandle

`FiberHandle` manages:

```text
one fiber total
```

`FiberMap<K, A, E>` manages:

```text
at most one fiber per K
```

That makes FiberMap useful when independent work is keyed by stable identities
such as:

- request IDs
- document IDs
- UI component IDs
- background-job names
- session IDs

Replacement stays local to the key.

## Type discipline

The generated demo has no explicit `any` annotations.

Every `Message.match` destructured payload is explicitly typed, and Button
attributes are derived from `HtmlBuilder` so the demo remains safe under
`noImplicitAny`.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `FiberMapDemo.Message` to the parent Message union,
3. initialize `FiberMapDemo.init`,
4. delegate child messages to `FiberMapDemo.update`,
5. render `FiberMapDemo.view(...)` from the FiberMap route.

This artifact intentionally performs none of those edits.
