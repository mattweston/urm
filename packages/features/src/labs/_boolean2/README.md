# Boolean

Based on:

- <https://effect.website/docs/v4/api/effect/Boolean>

The source was checked against Effect `4.0.0-rc.115`.

## Mental model

Effect's `Boolean` module is small, but it exposes a complete boolean toolkit:

- native truthiness coercion
- runtime guard
- lazy boolean matching
- standard `Order` / `Equivalence`
- boolean algebra helpers
- iterable `every` / `some`
- reusable AND / OR Reducers

The four demo panels separate those concerns so the difference between
**coercion**, **validation**, **logic**, and **aggregation** stays clear.

# 1. `Boolean.Boolean` vs `Boolean.isBoolean`

The module exports the native JavaScript Boolean constructor:

```ts
Boolean.Boolean(value)
```

so it follows normal JavaScript truthiness.

Examples:

```ts
Boolean.Boolean(1)
// true

Boolean.Boolean(0)
// false

Boolean.Boolean("")
// false

Boolean.Boolean("false")
// true
```

That last case is the important gotcha.

The string:

```ts
"false"
```

is non-empty, therefore truthy.

`Boolean.Boolean` does **not** parse a textual boolean language.

If you have encoded input such as:

```text
"true"
"false"
```

use an explicit Schema / parser instead.

## `isBoolean`

```ts
Boolean.isBoolean(
  value
)
```

asks a different question:

```text
is this value actually a JavaScript boolean?
```

Examples:

```ts
Boolean.isBoolean(true)
// true

Boolean.isBoolean(false)
// true

Boolean.isBoolean("true")
// false

Boolean.isBoolean(1)
// false
```

Its type is a refinement:

```ts
(
  input: unknown
) => input is boolean
```

so it narrows unknown values in TypeScript.

# 2. `not`

```ts
Boolean.not(true)
// false
```

is the unary negation helper.

# 3. Binary boolean algebra

The current API includes:

```ts
Boolean.and
Boolean.nand

Boolean.or
Boolean.nor

Boolean.xor
Boolean.eqv

Boolean.implies
```

All binary helpers support:

```text
data-first
+
data-last / pipe style
```

For example:

```ts
Boolean.and(
  true,
  false
)
```

and:

```ts
pipe(
  true,
  Boolean.and(false)
)
```

produce the same result.

## AND

```ts
Boolean.and(
  a,
  b
)
```

equivalent to:

```ts
a && b
```

Truth table:

```text
false false → false
false true  → false
true  false → false
true  true  → true
```

## NAND

```ts
Boolean.nand(
  a,
  b
)
```

is:

```ts
!(a && b)
```

It is false only when both inputs are true.

## OR

```ts
Boolean.or(
  a,
  b
)
```

is:

```ts
a || b
```

## NOR

```ts
Boolean.nor(
  a,
  b
)
```

is:

```ts
!(a || b)
```

It is true only when both inputs are false.

## XOR

```ts
Boolean.xor(
  a,
  b
)
```

is true when **exactly one** input is true:

```text
false false → false
false true  → true
true  false → true
true  true  → false
```

## EQV

```ts
Boolean.eqv(
  a,
  b
)
```

is logical equivalence / XNOR.

It is true when both booleans have the same truth value.

```text
false false → true
false true  → false
true  false → false
true  true  → true
```

This differs from the reusable:

```ts
Boolean.Equivalence
```

mainly in role:

```text
eqv
  = boolean combinator

Equivalence
  = instance accepted by APIs expecting Equivalence<boolean>
```

## Implication

```ts
Boolean.implies(
  premise,
  consequence
)
```

implements:

```ts
!premise || consequence
```

Truth table:

```text
false false → true
false true  → true
true  false → false
true  true  → true
```

The only false case is:

```text
premise true
consequence false
```

# 4. Lazy `match`

Choose between two lazy branches:

```ts
Boolean.match(
  enabled,
  {
    onFalse:
      () => "disabled",

    onTrue:
      () => "enabled"
  }
)
```

The options are lazy thunks.

Only the selected branch is evaluated.

It is also dual:

```ts
const label =
  Boolean.match({
    onFalse:
      () => "off",

    onTrue:
      () => "on"
  })

label(true)
// "on"
```

# 5. `Order`

Effect provides:

```ts
Boolean.Order
```

with:

```text
false < true
```

Examples:

```ts
Boolean.Order(
  false,
  true
)
// -1

Boolean.Order(
  true,
  false
)
// 1

Boolean.Order(
  true,
  true
)
// 0
```

This is useful when an Effect API wants an:

```ts
Order<boolean>
```

rather than an ad-hoc comparator.

# 6. `Equivalence`

```ts
Boolean.Equivalence
```

uses strict boolean equality:

```ts
Boolean.Equivalence(
  true,
  true
)
// true

Boolean.Equivalence(
  true,
  false
)
// false
```

Again, this exists as a reusable algebra instance for APIs accepting:

```ts
Equivalence<boolean>
```

# 7. `every`

```ts
Boolean.every(
  iterable
)
```

checks that every boolean is true.

```ts
Boolean.every([
  true,
  true,
  true
])
// true

Boolean.every([
  true,
  false,
  true
])
// false
```

It short-circuits at the first false value.

For an empty iterable:

```ts
Boolean.every([])
// true
```

which is the normal identity for conjunction.

# 8. `some`

```ts
Boolean.some(
  iterable
)
```

checks whether at least one value is true.

```ts
Boolean.some([
  false,
  false,
  true
])
// true
```

It short-circuits at the first true value.

For an empty iterable:

```ts
Boolean.some([])
// false
```

which is the normal identity for disjunction.

# 9. `ReducerAnd`

Effect 4 exposes:

```ts
Boolean.ReducerAnd
```

for APIs that consume a:

```ts
Reducer<boolean>
```

It combines with AND and starts from:

```ts
true
```

Example:

```ts
Boolean.ReducerAnd.combineAll([
  true,
  true,
  false
])
// false
```

For empty input:

```ts
Boolean.ReducerAnd.combineAll([])
// true
```

## Important difference from `every`

`Boolean.every` can stop reading the iterable as soon as it sees `false`.

`ReducerAnd.combineAll` uses the normal Reducer fold and does **not**
short-circuit.

So:

```text
need a direct boolean check?
  → every

need a reusable Reducer instance?
  → ReducerAnd
```

The demo counts how many iterable values each form visits.

# 10. `ReducerOr`

```ts
Boolean.ReducerOr
```

combines with OR and starts from:

```ts
false
```

Example:

```ts
Boolean.ReducerOr.combineAll([
  false,
  false,
  true
])
// true
```

For empty input:

```ts
Boolean.ReducerOr.combineAll([])
// false
```

## Difference from `some`

`some` short-circuits on true.

`ReducerOr.combineAll` visits the full iterable.

Again:

```text
direct predicate
  → some

Reducer algebra
  → ReducerOr
```

# When is the module useful?

For raw `if` statements:

```ts
if (enabled) {
  ...
}
```

plain JavaScript remains simpler.

The module becomes useful when boolean behavior needs to participate in the
same functional vocabulary as the rest of Effect:

- pipeable combinators
- generic `Order`
- generic `Equivalence`
- generic `Reducer`
- lazy functional matching
- iterable aggregation

# Real Effect 4 APIs used

The source includes:

- `Boolean.Boolean`
- `Boolean.isBoolean`
- `Boolean.match`
- `Boolean.Order`
- `Boolean.Equivalence`
- `Boolean.not`
- `Boolean.and`
- `Boolean.nand`
- `Boolean.or`
- `Boolean.nor`
- `Boolean.xor`
- `Boolean.eqv`
- `Boolean.implies`
- `Boolean.every`
- `Boolean.some`
- `Boolean.ReducerAnd`
- `Boolean.ReducerOr`

## Suggested placement

```text
packages/features/src/labs/foldkit/
├── examples/
│   └── boolean.ts
└── boolean.view.ts
```
