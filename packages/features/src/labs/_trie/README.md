# Effect v4 `Trie` lesson

Standalone Foldkit teaching artifact for Effect's `Trie` module.

- Live docs: `https://effect.website/docs/v4/api/effect/Trie`
- Live docs checked: Effect `4.0.0-rc.117`
- Live docs surface: **29 exports**
- Workspace pin: Effect `4.0.0-rc.112`
- Workspace and rc.117 `Trie.ts`: **byte-identical public module source**
- Lesson stages: **Build → Lookup → Prefix → Transform**

The repo scaffold at `packages/features/src/learn/_trie/` is intentionally left untouched. These files are standalone outputs under `/mnt/data/trie/`.

## Why `Trie`

`Trie<Value>` is an immutable string-keyed map optimized around prefix relationships. It is useful for autocomplete, command dispatch, route / namespace lookup, dictionaries, and any table where queries often ask about the beginning of a string rather than only exact equality.

The important distinction from a generic map is not merely implementation. The public API directly exposes prefix operations:

- enumerate stored keys that **start with** a prefix,
- materialize prefix-matching key/value entries,
- find the **longest stored key that prefixes** a longer query string.

Those are different directions of the same prefix relation and are taught separately in the lesson.

## Lesson structure

### 1. Build

Cases: `Empty`, `Make`, `Insert`, `Persistent`

Focus:

- `Trie.empty`
- `Trie.make`
- `Trie.fromIterable`
- `Trie.insert`
- `Trie.insertMany`
- `Trie.remove`
- `Trie.removeMany`
- `Trie.modify`

`Trie` updates are persistent. `insert`, `remove`, and `modify` return new tries; the implementation rebuilds the changed path instead of mutating the original trie. A missing `remove` / `modify` leaves the trie unchanged.

The underlying implementation ignores the empty string as an insertion key, and exact lookup of `""` returns no value. The lesson therefore uses non-empty keys throughout.

### 2. Lookup

Cases: `Exact`, `Unsafe`, `Presence`, `Order`

Focus:

- `Trie.get`
- `Trie.getUnsafe`
- `Trie.has`
- `Trie.isEmpty`
- `Trie.size`
- `Trie.keys`
- `Trie.values`
- `Trie.entries`
- `Trie.toEntries`

`get` returns `Option<V>` and is the normal exact-lookup API. `getUnsafe` throws when the key is absent and is appropriate only when key presence is already an invariant.

Iteration is deterministic: keys, values, entries, and direct `Trie` iteration follow **alphabetical key order**, regardless of insertion order. `size` counts stored key/value entries, not internal trie nodes.

### 3. Prefix

Cases: `Keys`, `Entries`, `Longest`, `Direction`

Focus:

- `Trie.keysWithPrefix`
- `Trie.valuesWithPrefix`
- `Trie.entriesWithPrefix`
- `Trie.toEntriesWithPrefix`
- `Trie.longestPrefixOf`

Prefix enumeration and longest-prefix lookup point in opposite directions:

```ts
Trie.toEntriesWithPrefix(trie, "app")
```

asks:

> Which stored keys begin with `"app"`?

while:

```ts
Trie.longestPrefixOf(trie, "application/json")
```

asks:

> Which stored key is the longest prefix of `"application/json"`?

For a trie containing `"app"`, `"apple"`, and `"application"`, the latter returns the `"application"` entry.

The prefix iterator helpers are lazy `IterableIterator`s; `toEntriesWithPrefix` eagerly materializes the matching entries as an array.

### 4. Transform

Cases: `Map`, `Filter`, `FilterMap`, `Reduce`

Focus:

- `Trie.map`
- `Trie.filter`
- `Trie.filterMap`
- `Trie.compact`
- `Trie.reduce`
- `Trie.forEach`

`map` preserves keys and changes the value type. `filter` rebuilds a trie from matching entries and can narrow value types through a refinement. `filterMap` uses `Result`: successes are inserted into the output trie; failures are dropped.

`compact` is the `Trie<Option<A>> → Trie<A>` convenience. `reduce` and `forEach` traverse in deterministic key order.

## Public surface inventory

The live rc.117 reference contains **29 exports**, exactly matching the unique top-level declarations in both rc.112 and rc.117 source.

### Models — 1

- `Trie`

### Constructors — 3

- `empty`
- `fromIterable`
- `make`

### Persistent mutations — 5

- `insert`
- `remove`
- `modify`
- `removeMany`
- `insertMany`

### Getters — 11

- `keys`
- `values`
- `entries`
- `toEntries`
- `keysWithPrefix`
- `valuesWithPrefix`
- `entriesWithPrefix`
- `toEntriesWithPrefix`
- `longestPrefixOf`
- `size`
- `get`

### Predicates — 2

- `has`
- `isEmpty`

### Unsafe — 1

- `getUnsafe`

### Folding — 2

- `reduce`
- `map`

### Filtering — 3

- `filter`
- `filterMap`
- `compact`

### Traversing — 1

- `forEach`

Total: **29**.

## Runnable examples in `trie.ts`

The module creates a small route/dictionary trie:

```ts
export const route_trie = Trie.make(
    ["app", "application root"],
    ["apple", "fruit"],
    ["application", "software"],
    ["apply", "verb"],
    ["banana", "fruit"],
)
```

It then demonstrates:

- empty construction,
- single and multi-entry insertion,
- removal and modification,
- safe and unsafe exact lookup,
- deterministic ordered entries,
- prefix key/value/entry iteration,
- longest-prefix lookup,
- map / filter / filterMap / compact / reduce.

## Important semantics

### Immutable does not mean “copy the whole structure”

The internal implementation uses path copying: nodes along the changed lookup path are rebuilt while untouched branches can be reused. Treat the API semantically as persistent immutable data; do not depend on internal node identity.

### Exact lookup and prefix lookup are separate

`Trie.get(trie, "application/json")` does **not** return the value stored under `"application"`. Use `longestPrefixOf` when that behavior is intended.

Likewise, `keysWithPrefix(trie, "app")` returns stored descendants beginning with `"app"`; it does not search ancestors of `"app"`.

### Iteration is sorted by key

The docs explicitly guarantee alphabetical key order for entries / keys / values. This makes output stable even when input entries were inserted in a different order.

### Updating an existing key replaces its value

Repeated insertion of an already-present key replaces that value rather than adding a duplicate entry. `size` therefore continues to count unique stored keys.

### Missing persistent mutations are no-ops

Removing or modifying a key that is not present returns the original trie unchanged.

### `getUnsafe` throws

Use `get` when absence belongs in the program's normal control flow. `getUnsafe` raises `Error("Expected trie to contain key")` for missing keys.

## Foldkit model boundary

The Foldkit model intentionally stores only lesson UI selection state:

```ts
export const Model = S.Struct({
    stage: Stage,
    buildCase: BuildCase,
    lookupCase: LookupCase,
    prefixCase: PrefixCase,
    transformCase: TransformCase,
})
```

Runtime tries stay at module scope. They are not embedded in the serializable Foldkit model.

Messages use Foldkit's current direct field-map form:

```ts
export const Message = defineMessageUnion({
    SelectedTrieStage: { stage: Stage },
    SelectedTrieBuildCase: { buildCase: BuildCase },
    SelectedTrieLookupCase: { lookupCase: LookupCase },
    SelectedTriePrefixCase: { prefixCase: PrefixCase },
    SelectedTrieTransformCase: { transformCase: TransformCase },
})
```

Each update is pure and uses `evo`.

## Version compatibility

No bridge is needed.

`packages/effect/src/Trie.ts` is byte-identical between:

- `effect@4.0.0-rc.112`
- `effect@4.0.0-rc.117`

Both contain the same 29 public names and the same implementation wiring to the internal trie module.

## Validation

Standalone validation command:

```sh
tsc --noEmit \
  --noResolve \
  --allowImportingTsExtensions \
  --target ES2022 \
  --module ESNext \
  --moduleResolution bundler \
  --skipLibCheck \
  --noImplicitAny \
  trie.ts trie.view.ts
```

With workspace packages deliberately unresolved, the expected diagnostics are only imports for:

- `effect`
- `foldkit`
- `foldkit/message`
- `foldkit/struct`
- `@foldkit/ui`
- `foldkit/html`

There are no additional local TypeScript diagnostics and no explicit `any` annotations in the generated demo files.
