# Effect v4 — TxHashSet

Standalone Foldkit lesson for the Effect `TxHashSet` module.

The repository scaffold at `packages/features/src/learn/_tx-hash-set/` is intentionally left untouched. These files are standalone artifacts only.

## Lesson shape

The UI groups the module into four concepts:

- **Create** — `empty`, `make`, `fromIterable`, `fromHashSet`
- **Mutate** — `add`, `remove`, `clear`, membership reads, and explicit multi-step `Effect.tx`
- **Algebra** — `union`, `intersection`, `difference`, `isSubset`
- **Transform** — `map`, `filter`, `reduce`, immutable `toHashSet` snapshots

The Foldkit model contains only stage/case strings. Live `TxHashSet`, `TxRef`, and `HashSet` values stay in Effect programs rather than serializable UI state.

## Core model

A `TxHashSet<V>` stores the current immutable `HashSet<V>` in a `TxRef`.

That yields two distinct families of operations:

1. **In-place transactional state changes** — `add`, `remove`, and `clear` update the existing `TxHashSet` reference.
2. **Derived transactional sets** — `union`, `intersection`, `difference`, `map`, and `filter` read transactional state and return a new `TxHashSet`, leaving their inputs unchanged.

`toHashSet` leaves the transactional API entirely and returns the immutable `HashSet` value currently stored in the reference. Because `HashSet` is immutable, later updates to the `TxHashSet` do not mutate a snapshot that was already returned.

## Transaction boundary

A single `TxHashSet` operation is transactional by itself. That does **not** mean a sequence of separately executed operations forms one atomic invariant.

When several reads/writes must commit together, wrap them in one transaction:

```ts
const program = Effect.tx(
    Effect.gen(function*() {
        const hasAlice = yield* TxHashSet.has(active, "alice")

        if (hasAlice) {
            yield* TxHashSet.remove(active, "alice")
            yield* TxHashSet.add(active, "charlie")
        }
    })
)
```

The algebra helpers already read both source sets inside one `Effect.tx` before constructing the derived set.

## Important semantics

### Duplicate values

`make` and `fromIterable` use `HashSet`, so equal values collapse to one membership.

### `remove`

`remove` mutates the existing set and returns:

- `true` when the value existed and was removed
- `false` when it was already absent

### Empty-set predicates

The usual logical identities apply:

- `some(empty, predicate)` is `false`
- `every(empty, predicate)` is `true`

### Set algebra is non-mutating

`union`, `intersection`, and `difference` return new transactional sets. Neither input is modified.

### Mapping can shrink the set

`map` returns a new set. If several source values map to equal output values, they collapse under `HashSet` equality/hashing and the result can have fewer members than the source.

### Filtering can narrow types

`filter` supports a refinement overload, so the returned `TxHashSet` can carry a narrower value type.

### Reduction order

`reduce` consumes the underlying `HashSet` iteration. Treat the order as hash-set iteration rather than an insertion/sorted ordering guarantee; commutative/associative reducers are the safest default when order does not matter semantically.

## Live API inventory

The live Effect API page currently renders **23 documented exports**. The source has **22 unique top-level names** because `TxHashSet` is documented both as the interface and its namespace of type utilities.

### Models / type utilities — 2 docs entries

- `TxHashSet` interface
- `TxHashSet` namespace
    - `TxHashSet.Value<T>`

### Constructors — 4

- `empty`
- `make`
- `fromIterable`
- `fromHashSet`

### Guard — 1

- `isTxHashSet`

### Mutations — 3

- `add`
- `remove`
- `clear`

### Predicates — 5

- `has`
- `isEmpty`
- `isSubset`
- `some`
- `every`

### Getter — 1

- `size`

### Set algebra — 3

- `union`
- `intersection`
- `difference`

### Transform / fold / conversion — 4

- `map`
- `filter`
- `reduce`
- `toHashSet`

Total: **23 docs entries**.

## Version note

Workspace Effect: `4.0.0-rc.112`.

Live docs: `4.0.0-rc.115` at generation time.

The public `TxHashSet` operation surface is unchanged through rc.117. The rc.112 → rc.115 source delta is only the private runtime marker:

```text
rc.112: ~effect/transactions/TxHashSet
rc.115+: ~effect/TxHashSet
```

The lesson never hard-codes that marker, so the runnable examples target the workspace pin without a compatibility bridge.

## Foldkit architecture

`Model` is pure and serializable:

```ts
{
    stage,
    createCase,
    mutateCase,
    algebraCase,
    transformCase
}
```

Messages use the current Foldkit `defineMessageUnion` shape — direct field maps, not `S.Struct(...)` wrappers:

```ts
export const Message = defineMessageUnion({
    SelectedTxHashSetStage: { stage: Stage },
    SelectedTxHashSetCreateCase: { createCase: CreateCase },
    SelectedTxHashSetMutateCase: { mutateCase: MutateCase },
    SelectedTxHashSetAlgebraCase: { algebraCase: AlgebraCase },
    SelectedTxHashSetTransformCase: { transformCase: TransformCase },
})
```

`update` is pure and uses `Message.match` plus `evo`.

## Files

- `tx-hash-set.ts` — Effect examples + Foldkit model/update
- `tx-hash-set.view.ts` — generic Foldkit HTML view
- `tx-hash-set-preview.png` — initial `Create / Make` preview

## Validation

Standalone validation is intentionally run with `--noResolve`; in the artifact environment the workspace packages are not installed next to these standalone files. The expected diagnostics are therefore unresolved imports for `effect`, `foldkit`, `foldkit/message`, `foldkit/struct`, `@foldkit/ui`, and `foldkit/html` only.
