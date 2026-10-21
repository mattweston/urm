# Equivalence

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/Equivalence

The current API page is Effect `4.0.0-rc.115` and documents 17 items. The
implementation was also checked against the current
`packages/effect/src/Equivalence.ts`.

The TypeScript in this artifact contains no explicit `any` annotations, and the
Foldkit message-handler payloads are explicitly typed for `noImplicitAny`.

## Files

- `equivalence.ts` — real Equivalence examples, snapshots, Foldkit Model /
  Message / update.
- `equivalence.view.ts` — interactive visual demo.
- `equivalence-preview.png` — static preview of the default Primitives stage.

## Intended location

```text
packages/features/src/learn/equivalence/
├── equivalence.ts
└── equivalence.view.ts
```

No parent router/model/message/update files are modified.

## Teaching stages

### 1. Primitives

Compares four base relations:

#### `Equivalence.Number`

```ts
Equivalence.Number(
    NaN,
    NaN
)
// true
```

The numeric instance deliberately treats two `NaN` values as equivalent.

#### `Equivalence.strictEqual`

```ts
Equivalence.strictEqual<number>()(
    NaN,
    NaN
)
// false
```

This follows JavaScript `===` exactly.

#### `Equivalence.Date`

Different `Date` objects with the same millisecond timestamp are equivalent.
Invalid dates are also compared through `Equivalence.Number`, so two invalid
Date values are equivalent because their timestamps are both `NaN`.

#### `Equivalence.make`

The demo creates a numeric tolerance relation.

`make` first checks same-reference / strict equality before calling the custom
comparison.

Every supplied custom relation should obey the three equivalence laws:

- reflexive
- symmetric
- transitive

### 2. Derive

Uses `mapInput` to derive a relation for a larger input from a smaller stable
key.

Examples:

```text
User -> user.id -> Equivalence.Number
string -> toLowerCase() -> Equivalence.String
email -> trim().toLowerCase() -> Equivalence.String
```

This is useful when equality should intentionally ignore fields that are not
part of identity.

The projection should remain pure and deterministic.

### 3. Shapes

Covers all four v4 shape combinators.

#### `Tuple`

Uses a separate Equivalence at every tuple position.

#### `Array`

Requires equal length and compares corresponding elements positionally.

#### `Struct`

Compares only the fields declared in the Struct definition.

That means values can carry additional properties and those extra properties do
not participate in the relation.

#### `Record`

Uses one value Equivalence for every own property.

Unlike Struct, Record requires both values to expose the same own-key set.
String and symbol keys are supported.

### 4. Combine

Shows three equivalent ways of requiring multiple rules:

```ts
Equivalence.combine(
    personName,
    personAge
)

Equivalence.combineAll([
    personName,
    personAge
])

Equivalence
    .makeReducer<Person>()
    .combineAll([
        personName,
        personAge
    ])
```

All use logical AND and stop at the first false relation.

The identity is an always-true Equivalence:

```ts
Equivalence.combineAll([])
```

therefore returns true for every pair.

`makeReducer` packages the same combination rule with this identity value.

## Current public surface

### Models / type support

- `Equivalence`
- `EquivalenceTypeLambda`

### Constructors

- `make`
- `strictEqual`
- `makeReducer`

### Primitive / standard instances

- `String`
- `Number`
- `Boolean`
- `BigInt`
- `Date`

### Mapping / composition

- `mapInput`
- `combine`
- `combineAll`

### Shapes

- `Tuple`
- `Array`
- `Struct`
- `Record`

## `Equal` versus `Equivalence`

The previous Equal demo answers:

> How should Effect structurally compare arbitrary values, including values that
> implement a custom Equal protocol?

Equivalence answers a different question:

> What reusable equality relation should this API use for values of a known
> type?

An `Equivalence<A>` is just:

```ts
(self: A, that: A) => boolean
```

which makes it easy to derive, combine, and pass to generic APIs.

## Type discipline

The generated TypeScript avoids explicit `any` annotations.

Message-match payload types are named explicitly rather than relying on
contextual inference, so destructured handler parameters remain safe under
`noImplicitAny`.

## Integration expectation

Follow the same child-feature integration pattern as the neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `EquivalenceDemo.Message` to the parent Message union,
3. initialize `EquivalenceDemo.init`,
4. delegate child messages to `EquivalenceDemo.update`,
5. render `EquivalenceDemo.view(...)` from the Equivalence route.

This artifact intentionally performs none of those edits.
