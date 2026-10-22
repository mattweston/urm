# TxHashMap

Standalone Foldkit lesson artifact for Effect's `TxHashMap` module. The repository scaffold at `packages/features/src/labs/_tx-hash-map/` is intentionally untouched; these files live only under `/mnt/data/tx-hash-map/`.

## Lesson shape

The interactive lesson uses four conceptual stages:

1. **Create** — `empty`, `make`, `fromIterable`, and the `TxHashMap.Key` / `Value` / `Entry` type utilities.
2. **Read** — safe lookup, enumeration, predicates, hash-aware lookup, and immutable snapshots.
3. **Mutate** — in-place transactional `set`, `remove`, `modify`, `modifyAt`, bulk updates, and multi-step `Effect.tx` invariants.
4. **Transform** — whole-map derivations and queries such as `map`, `filter`, `reduce`, `filterMap`, search predicates, `flatMap`, and `compact`.

The Foldkit `Model` contains only stage/case strings. Live `TxHashMap`, `TxRef`, and `HashMap` values stay at module scope in Effect programs rather than being stored in serializable application state.

## Core model

A `TxHashMap<K, V>` stores an immutable `HashMap<K, V>` inside a `TxRef`. The reference is mutable transactional state; each individual `HashMap` value is immutable.

That gives the module two distinct families of behavior:

- **Mutating combinators** update the existing `TxHashMap` reference by installing a new immutable `HashMap` value in its `TxRef`.
- **Derived-map combinators** read the current snapshot and allocate a new `TxHashMap`, leaving the source transactional map unchanged.

Single `TxHashMap` operations participate in Effect transactions automatically. When several reads and writes together form one invariant, group them in one explicit `Effect.tx(...)` block so they commit as one transaction.

## Public surface

The live v4 API page currently renders **38 entries**. The source contains **37 unique top-level names** because `TxHashMap` is documented twice: once for the interface and once for its namespace of type utilities.

### Model and type utilities — 2 docs entries

- `TxHashMap` — transactional map interface backed by `TxRef<HashMap<K, V>>`.
- `TxHashMap` namespace — `Key<T>`, `Value<T>`, and `Entry<T>` type extraction helpers.

### Constructors — 3

- `empty`
- `make`
- `fromIterable`

### Reads, guards, and predicates — 14

- `get`
- `has`
- `size`
- `isEmpty`
- `isNonEmpty`
- `keys`
- `values`
- `entries`
- `toEntries`
- `toValues`
- `snapshot`
- `getHash`
- `hasHash`
- `isTxHashMap`

### Mutating operations — 8

- `set`
- `remove`
- `clear`
- `modify`
- `modifyAt`
- `union`
- `removeMany`
- `setMany`

### Derived transforms and queries — 11

- `map`
- `filter`
- `reduce`
- `filterMap`
- `hasBy`
- `findFirst`
- `some`
- `every`
- `forEach`
- `flatMap`
- `compact`

## Semantics worth remembering

### `get` vs `snapshot`

`get` reads one key transactionally and returns `Option<V>`. `snapshot` returns the current immutable `HashMap<K, V>` value. Because that `HashMap` is immutable, later writes to the `TxHashMap` do not mutate a snapshot already returned to you.

### Enumeration order is HashMap order

`keys`, `values`, and `entries` materialize arrays from the underlying `HashMap`. Do not assume sorted key order. Sort explicitly when deterministic presentation order matters.

### `modify` returns the old value

`modify(map, key, f)` updates an existing entry only. It returns `Option.some(previousValue)` when the key existed, or `Option.none()` when it did not.

This makes it different from `modifyAt`.

### `modifyAt` can insert, update, remove, or do nothing

`modifyAt` receives the existing `Option<V>` and returns the next `Option<V>`:

- `None -> Some(v)` inserts.
- `Some(old) -> Some(next)` updates.
- `Some(old) -> None` removes.
- `None -> None` leaves the map unchanged.

It is the most general pure single-key transition in the module.

### Multi-step invariants need one transaction

A transfer-like operation should put the related reads and writes in one `Effect.tx`:

```ts
const transfer = Effect.tx(
  Effect.gen(function*() {
    const alice = yield* TxHashMap.get(balances, "alice")
    const bob = yield* TxHashMap.get(balances, "bob")

    if (Option.isSome(alice) && Option.isSome(bob) && alice.value >= 3) {
      yield* TxHashMap.set(balances, "alice", alice.value - 3)
      yield* TxHashMap.set(balances, "bob", bob.value + 3)
    }
  })
)
```

Running those same reads and writes as separate transactions would not give the same all-or-nothing invariant.

### Hash-aware lookup is an expert API

`getHash` and `hasHash` let callers supply a precomputed key hash. The supplied hash must correspond to the same key. A mismatched hash can make an existing entry look absent.

Use ordinary `get` / `has` unless you already own the correct precomputed hash in a hot path.

### `union` mutates the target

`union(self, otherHashMap)` merges a plain immutable `HashMap` into the existing `TxHashMap`. When both maps contain the same key, the value from `otherHashMap` wins.

### Whole-map transforms return new transactional maps

`map`, `filter`, `filterMap`, `flatMap`, and `compact` build new `TxHashMap` references. The source map remains unchanged.

- `map` preserves keys and changes values.
- `filter` keeps matching entries.
- `filterMap` uses `Result.succeed` to keep/transform and `Result.fail` to drop.
- `compact` unwraps `Option.some` and removes `Option.none`.
- `flatMap` expands each source entry to another transactional map and flattens those entries into a fresh result map.

When flattened maps contain duplicate keys, later inserted entries replace earlier values according to normal `HashMap.set` semantics.

### Queries read a snapshot

`reduce`, `hasBy`, `findFirst`, `some`, `every`, and `forEach` operate over the current map snapshot rather than replacing the source map.

`findFirst` returns an `Option<[K, V]>` when you need the matched entry; `hasBy`, `some`, and `every` return booleans.

## Version note

Workspace Effect is pinned to **4.0.0-rc.112**. The live API page currently renders **4.0.0-rc.115**. The 37 unique public top-level names are the same in rc.112, rc.115, and rc.117.

The source delta starting in rc.115 is only the private runtime marker:

- rc.112: `~effect/transactions/TxHashMap`
- rc.115+: `~effect/TxHashMap`

The lesson never hard-codes that marker, so the runnable TypeScript targets the workspace rc.112 API without a compatibility shim.

## Generated files

- `tx-hash-map.ts` — Effect examples, schemas, model, messages, update function, and lesson snapshots.
- `tx-hash-map.view.ts` — generic Foldkit view.
- `tx-hash-map-preview.png` — static preview of the initial **Create / Make** state.
- `tx-hash-map-bundle.zip` — the three files above plus this README.

## Validation

The standalone check used:

```sh
tsc --noEmit --noResolve \
  --allowImportingTsExtensions \
  --target ES2022 \
  --module ESNext \
  --moduleResolution bundler \
  --skipLibCheck \
  --noImplicitAny \
  tx-hash-map.ts tx-hash-map.view.ts
```

The only diagnostics are the expected unresolved workspace imports for `effect`, `foldkit`, `foldkit/message`, `foldkit/struct`, `@foldkit/ui`, and `foldkit/html`. No local TypeScript diagnostics remain, and the generated `.ts` files contain no explicit `any` annotations.
