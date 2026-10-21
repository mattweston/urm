# Effect v4 `Types` — standalone lesson

A standalone Foldkit lesson for Effect's `Types` module. The repo scaffold under `packages/features/src/learn/_types` remains untouched.

## Lesson flow

**Variance → Shape → Tuples → Control**

The important difference from most Effect modules is that `Types` is **entirely compile-time**. It exports no runtime constructors, services, values, or functions. The lesson therefore keeps the Effect examples type-only and uses runtime state only for the Foldkit lesson UI.

## Version checked

- Workspace target: `effect@4.0.0-rc.112`
- Live API page checked: `effect@4.0.0-rc.117`
- Live docs: **35 documented entries**
- Source: **32 unique top-level exported names**

The 35-vs-32 difference comes from `Invariant`, `Covariant`, and `Contravariant`: each is documented once as a type alias and once as a namespace containing the nested `.Type` extractor.

## Full public surface

### Variance and inference

- `Covariant<A>`
    - phantom output-position variance marker
    - `Covariant.Type<A>` extracts the carried type
- `Contravariant<A>`
    - phantom input-position variance marker
    - `Contravariant.Type<A>` extracts the carried type
- `Invariant<A>`
    - phantom invariant marker
    - `Invariant.Type<A>` extracts the carried type
- `NoInfer<A>`
    - makes a position type-check against `A` without participating in inference

### Tagged unions, object shapes, equality, and mutability

- `Tags<E>` — extracts `_tag` literals from tagged union members
- `ExtractTag<E, K>` — keeps tagged members matching `K`
- `ExcludeTag<E, K>` — removes tagged members matching `K`
- `UnionToIntersection<T>` — distributes a union into an inferred intersection
- `Simplify<A>` — remaps an intersection/object for a cleaner displayed shape
- `Equals<X, Y>` — exact type-level equality boolean
- `EqualsWith<A, B, Y, N>` — custom equality branch
- `Has<A, Key>` — checks whether at least one candidate key exists
- `MergeLeft<Source, Target>` — left-biased object merge
- `MergeRight<Target, Source>` — right-biased object merge
- `Mutable<T>` — removes top-level `readonly`
- `DeepMutable<T>` — recursively removes structural `readonly`
- `VoidIfEmpty<S>` — maps an empty object shape to `void`
- `NotFunction<T>` — removes callable members from a union
- `NoExcessProperties<T, U>` — maps keys present in `U` but absent in `T` to `never`
- `IsUnion<T>` — detects whether `T` is a union
- `RequiredKeys<T>` — extracts keys whose properties are required

### Tuple and arity helpers

- `TupleOf<N, T>` — exactly `N` values of `T`
- `TupleOfAtLeast<N, T>` — at least `N` values of `T`, then a variadic tail

### Concurrency, reason-tagged errors, and internal markers

- `Concurrency` — `number | "unbounded"`
- `ReasonOf<E>` — extracts an error's nested `reason` union
- `ReasonTags<E>` — extracts `_tag` literals from nested reasons
- `ExtractReason<E, K>` — returns the matching nested reason variant
- `NarrowReason<E, K>` — preserves the enclosing error while narrowing `reason`
- `OmitReason<E, K>` — preserves the enclosing error while excluding a reason variant
- `ExcludeReason<E, K>` — returns the remaining nested reason union
- `unassigned` — internal branded marker for an unassigned type parameter
- `unhandled` — internal branded marker for an unhandled error type

## What the lesson emphasizes

### 1. Variance is a phantom typing tool

The variance aliases are function types used to influence assignability of generic parameters. They do not create runtime values from the `Types` module.

- `Covariant<A> = (_: never) => A`
- `Contravariant<A> = (_: A) => void`
- `Invariant<A> = (_: A) => A`

The nested `.Type` namespaces recover the carried type.

### 2. `NoInfer` controls where inference comes from

`NoInfer<A>` still checks compatibility with `A`, but the annotated position does not become an inference source. This is useful for defaults, fallback values, comparison operands, or secondary configuration values that should follow a type chosen elsewhere.

### 3. Shape helpers are compile-time rewrites only

`MergeLeft`, `MergeRight`, `Mutable`, `DeepMutable`, `Simplify`, and `NoExcessProperties` do not clone or transform JavaScript data. They only alter TypeScript's view of a value.

### 4. Tag helpers work on discriminated unions

`Tags`, `ExtractTag`, and `ExcludeTag` are useful when library code needs to manipulate a tagged union without repeating each variant manually.

### 5. Reason helpers distinguish nested values from enclosing errors

There are two families:

- `ExtractReason` / `ExcludeReason` return nested **reason values**.
- `NarrowReason` / `OmitReason` keep the **outer error shape** while narrowing its `reason` field.

That distinction matters when writing error-handling APIs that need to preserve contextual fields on the parent error.

## rc.112 → rc.117 behavior refinements

The public names are unchanged, but three type definitions were refined in live rc.117.

### `TupleOf`

Workspace rc.112 handles integer literals and negative values, but a positive fractional literal can recurse until TypeScript's instantiation limit. Live rc.117 detects non-integer literals and degrades them to `Array<T>` instead. Negative values still produce `never`, and the general `number` type still degrades to `Array<T>`.

The runnable lesson uses integer tuple sizes so it is compatible with both versions.

### `DeepMutable`

Workspace rc.112 recursively mapped most non-primitive, non-function objects. Live rc.117 treats objects with methods or symbol-keyed properties as opaque and preserves them, while still deeply transforming plain objects, arrays/tuples, `Map`, and `Set`.

This protects built-ins and Effect data types from being structurally rewritten into misleading mutable shapes.

### `RequiredKeys`

Workspace rc.112 applies the required-property test directly across `keyof T`. Live rc.117 handles arrays explicitly and removes broad string/number/symbol index signatures before extracting required named keys.

This makes results more useful for types that mix named fields with index signatures.

## Stage guide

### Variance

Cases:

- **Covariant** — output-direction phantom variance
- **Contravariant** — input-direction phantom variance
- **Invariant** — exact generic identity
- **NoInfer** — type-check without driving inference

### Shape

Cases:

- **Tags** — tagged-union extraction and exclusion
- **Merge** — left/right key-precedence merges
- **Mutable** — shallow vs deep readonly removal
- **Exactness** — excess-property constraints

### Tuples

Cases:

- **TupleOf** — exact arity
- **AtLeast** — minimum arity with variadic tail
- **Required** — required-key extraction
- **Union** — intersection conversion and union detection

### Control

Cases:

- **Concurrency** — finite or unbounded concurrency option type
- **Reason** — nested reason-tag manipulation
- **Equality** — `Equals`, `EqualsWith`, `Has`
- **Markers** — `unassigned`, `unhandled`, `VoidIfEmpty`, `NotFunction`

## Foldkit integration

The Foldkit `Model` stores only stage/case strings. All messages use the corrected direct field-map form:

```ts
export const Message = defineMessageUnion({
    SelectedTypesStage: { stage: Stage },
    SelectedTypesVarianceCase: { varianceCase: VarianceCase },
    SelectedTypesShapeCase: { shapeCase: ShapeCase },
    SelectedTypesTuplesCase: { tuplesCase: TuplesCase },
    SelectedTypesControlCase: { controlCase: ControlCase },
})
```

No `S.Struct(...)` wrappers are used inside `defineMessageUnion`.

## Validation

The standalone check used:

```sh
tsc --noEmit --noResolve --allowImportingTsExtensions \
  --target ES2022 --module ESNext --moduleResolution bundler \
  --skipLibCheck --noImplicitAny types.ts types.view.ts
```

Expected diagnostics are only the unresolved workspace imports:

- `effect`
- `foldkit`
- `foldkit/message`
- `foldkit/struct`
- `@foldkit/ui`
- `foldkit/html`

There are no additional TypeScript diagnostics and no explicit `any` annotations in the generated lesson files.
