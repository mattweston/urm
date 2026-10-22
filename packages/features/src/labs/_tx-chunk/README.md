# Effect v4 — TxChunk lesson

Standalone Foldkit lesson artifact for the Effect `TxChunk` module. The repository scaffold at `packages/features/src/labs/_tx-chunk/` is intentionally left untouched.

## Lesson shape

**Create → Mutate → Slice → Compose**

The UI keeps four cases per stage so the important transactional ideas remain visible without turning the page into a 22-button API catalogue.

## Core mental model

`TxChunk<A>` stores one immutable `Chunk<A>` inside a `TxRef`. The `TxChunk` reference is mutable transactional state: operations such as `append`, `set`, `take`, or `filter` update the backing `TxRef` rather than returning a new `TxChunk` value.

Single `TxChunk` operations are already transactional. When an invariant spans multiple operations or multiple transactional structures, group them inside one `Effect.tx(...)` so the complete sequence validates and commits atomically.

## Live API snapshot

The live Effect v4 reference currently renders **4.0.0-rc.115** and documents **22 exports**.

### Model

- `TxChunk`

### Constructors

- `empty`
- `fromIterable`
- `make`
- `makeUnsafe`

### Combinators

- `append`
- `appendAll`
- `concat`
- `drop`
- `filter`
- `get`
- `map`
- `modify`
- `prepend`
- `prependAll`
- `set`
- `size`
- `slice`
- `take`
- `update`

### Predicates

- `isEmpty`
- `isNonEmpty`

## Stage 1 — Create

### `fromIterable`

```ts
const txChunk = yield* TxChunk.fromIterable([1, 2, 3])
const current = yield* TxChunk.get(txChunk)
```

`fromIterable` is the convenient constructor for arrays and other JavaScript iterables.

### `empty`

Creates a transactional chunk whose backing value is `Chunk.empty()`.

### `make`

Use when you already have a `Chunk<A>`:

```ts
const txChunk = yield* TxChunk.make(Chunk.fromIterable([1, 2, 3]))
```

### `makeUnsafe`

Wraps an existing `TxRef<Chunk<A>>` synchronously. This is an advanced construction boundary; ordinary application code normally uses the Effect-wrapped constructors.

## Stage 2 — Mutate

### `append` / `prepend`

These update the same `TxChunk` reference:

```ts
yield* TxChunk.append(txChunk, 4)
yield* TxChunk.prepend(txChunk, 0)
```

### `set`

Replaces the complete stored Chunk.

### `update`

Transforms the current Chunk into the next Chunk:

```ts
yield* TxChunk.update(txChunk, (chunk) => Chunk.reverse(chunk))
```

### `modify`

`modify` derives both a return value and the replacement Chunk from one transactional snapshot:

```ts
const previousSize = yield* TxChunk.modify(
  txChunk,
  (chunk) => [Chunk.size(chunk), Chunk.append(chunk, 4)]
)
```

This is the most general low-level mutation helper in the module.

## Stage 3 — Slice

### `take`

Keeps the first `n` elements in the stored Chunk.

### `drop`

Removes the first `n` elements.

### `slice`

Keeps the range from `start` through `end - 1`:

```ts
yield* TxChunk.slice(txChunk, 1, 4)
```

The implementation is equivalent to dropping `start` elements and then taking `end - start` elements.

### `filter`

Removes elements that do not satisfy the predicate. The operation mutates the stored Chunk transactionally.

### `map`

`map` is intentionally same-type:

```ts
TxChunk.map(txChunk, (n: number) => n * 2)
```

Because it updates the existing `TxChunk<A>`, its callback returns `A`, not an unrelated `B`.

## Stage 4 — Compose

### `appendAll` / `prependAll`

Combine an ordinary `Chunk<A>` with the transactional chunk.

### `concat`

Combines two `TxChunk<A>` values by reading the second and appending its current Chunk to the first. The second `TxChunk` is unchanged. The implementation wraps its read-plus-write sequence in `Effect.tx`, so the operation is atomic across both transactional references.

### Explicit `Effect.tx`

For a multi-step invariant, group the steps yourself:

```ts
yield* Effect.tx(
  Effect.gen(function*() {
    yield* TxChunk.prepend(txChunk, 0)
    yield* TxChunk.append(txChunk, 4)
  })
)
```

That boundary is the important distinction between “each call is transactional” and “this whole multi-step rule is one transaction.”

## Transaction semantics

The `TxChunk` interface exposes its backing `TxRef<Chunk<A>>`. Reads participate in transaction tracking, so accessed values can be validated when a transaction commits. If the transaction detects conflicting updates, the transactional machinery can retry rather than publish a partially validated state.

`Effect.txRetry` can explicitly suspend/retry a transaction until accessed transactional values change; `TxChunk` itself does not add a second retry mechanism on top of the Effect transaction system.

## rc.112 → live rc.115 / rc.117

The public **22-name surface is unchanged** across the workspace pin (`effect@4.0.0-rc.112`), the live rc.115 docs, and rc.117 source.

The only source delta in `TxChunk.ts` is its private runtime marker:

- rc.112: `~effect/transactions/TxChunk`
- rc.115+: `~effect/TxChunk`

The lesson never hard-codes that marker, so the TypeScript stays compatible with rc.112 while teaching the live public contract.

## Foldkit architecture

The Foldkit `Model` stores only serializable UI state:

- `stage`
- `createCase`
- `mutateCase`
- `sliceCase`
- `composeCase`

Live `TxChunk`, `TxRef`, `Chunk`, and Effect values remain module-level runtime examples. The message union uses Foldkit's direct field-map syntax:

```ts
const Message = defineMessageUnion({
  SelectedTxChunkStage: { stage: Stage },
  // ...
})
```

## Files

- `tx-chunk.ts` — Effect examples + Foldkit model/update
- `tx-chunk.view.ts` — generic Foldkit HTML view
- `README.md` — API inventory and semantics
- `tx-chunk-preview.png` — initial Create / Iterable preview
