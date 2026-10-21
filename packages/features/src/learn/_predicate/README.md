# Predicate

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/Predicate

The current Effect source package is `4.0.0-rc.116`.

The current `packages/effect/src/Predicate.ts` module has **50 top-level public
exports**:

- `Predicate`
- `PredicateTypeLambda`
- `Refinement`
- `mapInput`
- `isTupleOf`
- `isTupleOfAtLeast`
- `isTruthy`
- `isSet`
- `isMap`
- `isString`
- `isNumber`
- `isBoolean`
- `isBigInt`
- `isSymbol`
- `isPropertyKey`
- `isFunction`
- `isUndefined`
- `isNotUndefined`
- `isNull`
- `isNotNull`
- `isNullish`
- `isNotNullish`
- `isNever`
- `isUnknown`
- `isObjectOrArray`
- `isObject`
- `isReadonlyObject`
- `isObjectKeyword`
- `hasProperty`
- `isTagged`
- `isError`
- `isUint8Array`
- `isDate`
- `isIterable`
- `isPromise`
- `isPromiseLike`
- `isRegExp`
- `compose`
- `Tuple`
- `Struct`
- `not`
- `or`
- `and`
- `xor`
- `eqv`
- `implies`
- `nor`
- `nand`
- `every`
- `some`

The merged `Predicate` and `Refinement` namespaces also expose five useful
type-level members:

```text
Predicate.In
Predicate.Any
Refinement.In
Refinement.Out
Refinement.Any
```

So the demo documents **55 qualified teaching entries** when those nested type
utilities are counted separately.

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `predicate.ts` — primitive/runtime guards, property/tag/tuple/struct checks,
  boolean combinators, projections, and refinements.
- `predicate.view.ts` — interactive visual demo.
- `predicate-preview.png` — static preview of the default Guard stage.

## Intended location

```text
packages/features/src/learn/predicate/
├── predicate.ts
└── predicate.view.ts
```

No parent router/model/message/update files are modified.

## Core distinction: Predicate versus Refinement

The module starts with two related function models.

### `Predicate<A>`

```ts
interface Predicate<A> {
    (
        a: A
    ): boolean
}
```

A Predicate answers:

```text
does this A satisfy the rule?
```

It returns a boolean but does not necessarily narrow the TypeScript type.

Example:

```ts
const isPositive:
    Predicate.Predicate<number> =
    (
        value
    ) =>
        value > 0
```

### `Refinement<A, B>`

```ts
interface Refinement<
    A,
    B extends A
> {
    (
        a: A
    ): a is B
}
```

A Refinement is also a runtime check, but successful evaluation carries a
narrower static type.

Example:

```ts
const value:
    unknown =
    "hello"

if (
    Predicate.isString(
        value
    )
) {
    // value is string here
    value.toUpperCase()
}
```

Many built-in Predicate module guards are Refinements.

## 1. Guard

### Primitive guards

The module includes guards for the JavaScript primitive categories:

```text
isString
isNumber
isBoolean
isBigInt
isSymbol
isPropertyKey
isFunction
```

These are especially useful at `unknown` boundaries.

### `isNumber`

`isNumber` is exactly based on:

```text
typeof input === "number"
```

Therefore:

```text
42
NaN
Infinity
-Infinity
```

all satisfy the guard.

If a program needs finite-number or integer validation, a more specific check is
required.

## Undefined / null helpers

The module provides the symmetric family:

```text
isUndefined
isNotUndefined
isNull
isNotNull
isNullish
isNotNullish
```

`isNullish` accepts:

```text
null
undefined
```

while `isNotNullish` excludes both.

Current Effect documentation uses these helpers in Option / Schema workflows;
for example, `Predicate.isNotNullish` can filter nullish optional values before
further transformation.

## `isTruthy`

```ts
Predicate.isTruthy(
    value
)
```

uses JavaScript truthiness.

Falsy values include:

```text
0
""
false
null
undefined
NaN
```

It is a boolean predicate rather than a precise type refinement.

## Never / unknown

### `isNever`

This is the always-false predicate.

Conceptually:

```text
_ => false
```

### `isUnknown`

This is the always-true predicate.

Conceptually:

```text
_ => true
```

They are useful as boundary / identity-like predicates when building generic
predicate logic.

## Object family

The current v4 source distinguishes several object concepts.

### `isObjectOrArray`

Accepts every non-null value with:

```text
typeof input === "object"
```

That includes arrays.

It excludes:

```text
null
functions
```

### `isObject`

Accepts non-null objects but explicitly rejects arrays.

It still accepts object instances such as:

```text
Date
Map
class instances
Uint8Array
```

because it is not a "plain object only" check.

### `isReadonlyObject`

Delegates to `isObject`.

The readonly distinction is TypeScript-only; JavaScript runtime cannot observe
whether an object type was declared readonly.

### `isObjectKeyword`

Models JavaScript / TypeScript's broader object notion.

It accepts:

```text
objects
arrays
functions
```

and excludes:

```text
null
primitives
```

This helper is used by `hasProperty`.

## Built-in object / platform-value guards

The module also includes:

```text
isSet
isMap
isError
isUint8Array
isDate
isRegExp
```

These use native `instanceof` checks.

## Iterable and Promise checks

### `isIterable`

The current implementation returns true when:

```text
the value has Symbol.iterator
or
the value is a string
```

Strings are therefore explicitly accepted as iterable.

### `isPromise`

This is a structural check requiring callable:

```text
then
catch
```

It is not based only on `instanceof Promise`, making it useful across realms.

### `isPromiseLike`

This broader guard only requires a callable:

```text
then
```

## 2. Shape

### `hasProperty`

```ts
const hasName =
    Predicate.hasProperty(
        "name"
    )
```

takes `unknown` and checks:

```text
value is object-like
and
"name" in value
```

It does not validate the property's value type.

After a successful check, TypeScript knows the property exists with value type:

```text
unknown
```

### Inherited properties

Because the implementation uses JavaScript's:

```text
property in object
```

inherited properties also count.

This is intentionally different from an own-property-only check.

## `isTagged`

```ts
const isOk =
    Predicate.isTagged(
        "Ok"
    )
```

checks for `_tag` and strict equality with the supplied string.

It narrows to:

```ts
{
    _tag:
        "Ok"
}
```

This is convenient for Effect-style tagged unions.

## Tuple length guards

### `isTupleOf`

```ts
Predicate.isTupleOf(
    values,
    2
)
```

checks only:

```text
values.length === 2
```

and refines the array to Effect's `TupleOf<2, T>` type.

It does not inspect element types.

### `isTupleOfAtLeast`

Likewise:

```text
values.length >= n
```

and narrows to `TupleOfAtLeast<N, T>`.

## `Tuple`

`Predicate.Tuple` lifts per-position predicates:

```ts
const pair =
    Predicate.Tuple([
        Predicate.isNumber,
        Predicate.isString
    ])
```

Then:

```text
[1, "ok"]
    → true

[1, 2]
    → false
```

Evaluation stops at the first failing position.

If any element predicate is a Refinement, the resulting tuple checker preserves
the corresponding refined output type.

## Tuple exact length nuance

`Predicate.Tuple` loops over the number of supplied element predicates.

It does **not** itself perform a separate exact-length test.

Use `isTupleOf` when exact tuple length is itself part of the runtime contract.

## `Struct`

```ts
const user =
    Predicate.Struct({
        id:
            Predicate.isNumber,
        name:
            Predicate.isString,
        active:
            Predicate.isBoolean
    })
```

checks those named fields.

### Extra keys

Only the configured keys are tested.

Therefore:

```ts
{
    id: 1,
    name: "Ada",
    active: true,
    extra: "ignored"
}
```

still passes.

`Struct` is not an exact-object validator.

For schema-style exactness / decoding, use the Schema module rather than
treating Predicate.Struct as a complete validation framework.

## 3. Combine

### `mapInput`

`mapInput` adapts a predicate to a different input type by projecting first.

Example:

```ts
const isLongString =
    Predicate.mapInput(
        (
            value: string
        ) =>
            value.length
    )(
        (
            length: number
        ) =>
            length >= 5
    )
```

The runtime flow is:

```text
string
    ↓ length
number
    ↓ predicate
boolean
```

This is useful for checking:

```text
object field
array length
derived metric
normalized value
```

without rewriting the underlying predicate.

## `not`

Negates one Predicate:

```text
true  → false
false → true
```

## `and`

Returns true only when both predicates are true.

The implementation short-circuits on the first false.

For Refinement inputs, the result narrows to an intersection:

```text
B & C
```

## `or`

Returns true when either predicate succeeds.

It short-circuits on the first true.

For Refinements, the output narrows to a union:

```text
B | C
```

## `xor`

Exclusive OR.

It returns true exactly when the two predicate results differ.

## `eqv`

Predicate equivalence.

It returns true when both predicates produce the same boolean result for the
input.

This compares predicate **outcomes**, not function identity.

## `implies`

Logical implication:

```text
antecedent → consequent
```

The implementation is:

```text
antecedent(a)
    ? consequent(a)
    : true
```

So when the antecedent is false, implication succeeds automatically.

## `nor`

Negation of OR:

```text
!(A || B)
```

## `nand`

Negation of AND:

```text
!(A && B)
```

## `every`

```ts
Predicate.every([
    ruleA,
    ruleB,
    ruleC
])
```

creates one Predicate requiring all supplied rules to pass.

Evaluation stops on the first false.

The iterable of predicates is traversed each time the returned predicate is
called.

## `some`

The dynamic OR counterpart.

Evaluation stops on the first true.

## Short-circuiting

Current source behavior:

```text
and
compose
every
    stop at first false

or
some
    stop at first true
```

The boolean logic is therefore not only declarative—it also avoids evaluating
later rules when the result is already known.

## 4. Refine

### `compose`

`compose` is designed around progressive narrowing.

Example:

```ts
const isNonEmptyString =
    Predicate.compose(
        Predicate.isString,
        (
            value: string
        ) =>
            value.length > 0
    )
```

The first check takes:

```text
unknown
```

and establishes:

```text
string
```

Only then does the second predicate run.

The result remains a Refinement from:

```text
unknown
```

to:

```text
string
```

while adding the non-empty runtime condition.

## Refinement + Refinement

When both stages are refinements:

```text
A → B
B → C
```

compose yields:

```text
A → C
```

and TypeScript keeps the final narrowed type.

## Predicate + Refinement combinator types

The module overloads `and`, `or`, and `compose` so refinement information is
preserved when possible.

This matters because a generic boolean combinator could otherwise erase useful
TypeScript narrowing.

## Type utilities

### `Predicate.In`

Extracts the input type from a Predicate type.

```ts
type P =
    Predicate.Predicate<number>

type Input =
    Predicate.Predicate.In<P>
// number
```

### `Predicate.Any`

Generic constraint representing any Predicate type.

The upstream source uses a broad type internally for this utility. Generated
demo code still follows the local no-explicit-`any` rule.

### `Refinement.In`

Extracts the source/input type.

### `Refinement.Out`

Extracts the narrowed output type.

For:

```ts
typeof Predicate.isString
```

conceptually:

```text
In  = unknown
Out = string
```

### `Refinement.Any`

Generic "any refinement" constraint used by APIs such as `Tuple` and `Struct`.

## `PredicateTypeLambda`

The higher-kinded type-level representation for Predicate.

It has no runtime behavior.

Use it only when implementing generic HKT/type-class abstractions.

## Current public surface

### Models / type-level

- `Predicate`
- `PredicateTypeLambda`
- `Refinement`
- `Predicate.In`
- `Predicate.Any`
- `Refinement.In`
- `Refinement.Out`
- `Refinement.Any`

### Input transformation / composition

- `mapInput`
- `compose`

### Tuple / struct

- `isTupleOf`
- `isTupleOfAtLeast`
- `Tuple`
- `Struct`
- `hasProperty`
- `isTagged`

### Primitive / nullability

- `isTruthy`
- `isString`
- `isNumber`
- `isBoolean`
- `isBigInt`
- `isSymbol`
- `isPropertyKey`
- `isFunction`
- `isUndefined`
- `isNotUndefined`
- `isNull`
- `isNotNull`
- `isNullish`
- `isNotNullish`
- `isNever`
- `isUnknown`

### Objects / common runtime values

- `isObjectOrArray`
- `isObject`
- `isReadonlyObject`
- `isObjectKeyword`
- `isSet`
- `isMap`
- `isError`
- `isUint8Array`
- `isDate`
- `isIterable`
- `isPromise`
- `isPromiseLike`
- `isRegExp`

### Boolean algebra

- `not`
- `or`
- `and`
- `xor`
- `eqv`
- `implies`
- `nor`
- `nand`
- `every`
- `some`

## Predicate and Schema

Predicate is useful for lightweight synchronous checks and type guards.

Schema is appropriate when you need richer capabilities such as:

```text
decoding unknown input
structured validation issues
transformations
encoding
annotations
schema composition
```

Schema filters themselves also accept predicate-style validation logic, so the
two concepts work together rather than compete.

Current Effect Schema documentation describes filter predicates as synchronous
checks that report validation success/failure; effectful checks use the
effectful SchemaGetter path instead.

## Predicate in Effect APIs

Predicates and refinements appear throughout Effect APIs.

For example:

```text
Effect.filterOrFail
Option.filter
Schema filters
Array / Iterable filtering
```

A refinement can carry its narrowed type through such APIs where their
signatures support type guards.

## Foldkit integration

Predicate is a good fit for pure decision logic inside Foldkit:

```text
Message arrives
    ↓
Predicate checks domain state/input
    ↓
update chooses next Model
```

Examples:

```text
is form submittable?
is route payload tagged correctly?
does a record have required lightweight shape?
does a filter option match?
```

For untrusted external data that needs detailed errors or transformation,
decode with Schema before putting it into the pure Model.

## Type discipline

The generated demo has no explicit `any` annotations.

Every custom predicate, projection, Foldkit Message payload, and UI callback
that could lose contextual typing has an explicit type where useful.

Button attributes are derived from `HtmlBuilder`.

The upstream Predicate implementation itself currently uses broad generic
`any` types in some type-level utility and Tuple/Struct implementation casts;
that is separate from the generated artifact constraint.

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
resolved, so this check catches local syntax and implicit-any problems rather
than replacing a full typecheck inside the target monorepo.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `PredicateDemo.Message` to the parent Message union,
3. initialize `PredicateDemo.init`,
4. delegate child messages to `PredicateDemo.update`,
5. render `PredicateDemo.view(...)` from the Predicate route.

This artifact intentionally performs none of those edits.
