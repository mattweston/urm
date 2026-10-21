# Newtype

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/Newtype

The current Effect source package is `4.0.0-rc.116`.

The current `packages/effect/src/Newtype.ts` public teaching surface contains
**10 entries**:

- `Newtype`
- `Newtype.Any`
- `Newtype.Key`
- `Newtype.Carrier`
- `value`
- `makeIso`
- `makeEquivalence`
- `makeOrder`
- `makeCombiner`
- `makeReducer`

When imported through the top-level `effect` package as:

```ts
import {
    Newtype
} from "effect"
```

the namespace helpers are referenced as:

```text
Newtype.Newtype.Any
Newtype.Newtype.Key<N>
Newtype.Newtype.Carrier<N>
```

The current Effect typetests use this exact form.

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `newtype.ts` — distinct number / string newtypes, `makeIso`, direct unwrap,
  lifted equivalence / ordering, and lifted combining / reducing instances.
- `newtype.view.ts` — interactive visual demo.
- `newtype-preview.png` — static preview of the default Define stage.

## Intended location

```text
packages/features/src/learn/newtype/
├── newtype.ts
└── newtype.view.ts
```

No parent router/model/message/update files are modified.

## Core idea

A Newtype gives TypeScript a distinct type identity without changing the runtime
representation.

For example:

```ts
interface UserId
    extends Newtype.Newtype<
        "UserId",
        number
    >
{}

interface OrderId
    extends Newtype.Newtype<
        "OrderId",
        number
    >
{}
```

Both use:

```text
number
```

as their carrier.

But TypeScript treats them as different types.

Conceptually:

```text
runtime:
    UserId  = number
    OrderId = number

type system:
    UserId !== OrderId
```

This is useful when several domain concepts share the same primitive carrier but
should never be mixed accidentally.

Examples include:

```text
UserId vs OrderId
Meters vs Seconds
Email vs Username
Credits vs Cents
TenantId vs ProjectId
```

## 1. Define

### `Newtype`

The base shape is:

```ts
Newtype.Newtype<
    Key,
    Carrier
>
```

where:

```text
Key
    unique string literal identifying the newtype

Carrier
    underlying runtime type
```

A domain type is normally declared as an interface:

```ts
interface UserId
    extends Newtype.Newtype<
        "UserId",
        number
    >
{}
```

This keeps the newtype open to normal interface naming while preserving the
tagged carrier relationship.

## Different tags, same carrier

These two types:

```ts
interface UserId
    extends Newtype.Newtype<
        "UserId",
        number
    >
{}

interface OrderId
    extends Newtype.Newtype<
        "OrderId",
        number
    >
{}
```

both carry numbers.

A `UserId` is nevertheless not assignable to `OrderId`.

The current Effect typetest suite explicitly verifies this separation.

That is the main value proposition:

```text
same runtime representation
different compile-time identities
```

## Compile-time-only tag

The internal Newtype marker exists only in the type system.

No object such as:

```text
{
    _tag: "UserId",
    value: 42
}
```

is allocated.

At runtime a wrapped `UserId` is still the underlying number.

The implementation uses identity casts for:

```text
value
makeIso
makeEquivalence
makeOrder
makeCombiner
makeReducer
```

where appropriate.

## `Newtype.Any`

The merged `Newtype` namespace exposes:

```ts
Newtype.Newtype.Any
```

as the generic "some Newtype" constraint.

It is intended for utilities such as:

```text
N extends Newtype.Newtype.Any
```

when the concrete key / carrier are not known yet.

## `Newtype.Key`

```ts
type Key =
    Newtype.Newtype.Key<
        UserId
    >
```

evaluates to:

```text
"UserId"
```

This is purely type-level.

## `Newtype.Carrier`

```ts
type Carrier =
    Newtype.Newtype.Carrier<
        UserId
    >
```

evaluates to:

```text
number
```

This is useful in generic helpers that need the underlying type of an arbitrary
newtype.

## 2. Iso

### `makeIso`

The primary constructor / deconstructor API is:

```ts
const UserIdIso =
    Newtype.makeIso<
        UserId
    >()
```

It returns:

```text
Optic.Iso<
    UserId,
    number
>
```

for this example.

The current Effect typetest verifies that exact relationship.

### Wrapping with `set`

The Iso's `set` direction wraps the carrier:

```ts
const userId:
    UserId =
    UserIdIso.set(
        42
    )
```

Conceptually:

```text
number → UserId
```

No runtime object is created.

### Unwrapping with `get`

The Iso's `get` direction unwraps:

```ts
const raw:
    number =
    UserIdIso.get(
        userId
    )
```

Conceptually:

```text
UserId → number
```

## `value`

When only unwrapping is needed:

```ts
const raw =
    Newtype.value(
        userId
    )
```

returns the carrier directly.

For `UserId`, the inferred result is:

```text
number
```

The current Effect typetest explicitly checks that result type.

## Runtime identity

Because wrapping is implemented as an identity cast:

```text
UserIdIso.set(42)
```

is still the number `42` at runtime.

The demo exposes:

```ts
Object.is(
    UserIdIso.set(
        42
    ),
    42
)
```

as `true`.

This is what "zero runtime wrapper" means here.

It does not mean there is zero TypeScript work; it means the generated runtime
value is still the carrier.

## Newtype versus runtime validation

Newtype is a compile-time distinction.

It does **not** validate the carrier value.

For example, if:

```text
UserId
```

must be a positive integer, Newtype by itself does not enforce that invariant.

Use a validation layer such as Schema when the carrier must satisfy runtime
constraints.

A useful split is:

```text
Newtype
    distinguish meanings at compile time

Schema
    validate / transform runtime inputs
```

They can be used together when both needs exist.

## 3. Instances

A newtype should often behave like its carrier for equality or ordering.

Instead of repeatedly unwrapping values by hand, the module lifts existing
instances.

## `makeEquivalence`

Suppose:

```ts
interface Label
    extends Newtype.Newtype<
        "Label",
        string
    >
{}
```

Then:

```ts
const eq =
    Newtype.makeEquivalence<
        Label
    >(
        Equivalence.String
    )
```

has the newtype-level shape:

```text
Equivalence<Label>
```

but delegates at runtime to string equality.

Example:

```text
Label("a") == Label("a")
    → true

Label("a") == Label("b")
    → false
```

The current Effect typetest verifies the lifted result type.

## `makeOrder`

For a number-backed newtype:

```ts
const order =
    Newtype.makeOrder<
        UserId
    >(
        Order.Number
    )
```

produces:

```text
Order<UserId>
```

while retaining numeric ordering behavior.

Example:

```text
UserId(1) vs UserId(2)
    → -1
```

## Why lift instead of unwrap manually?

Without lifting, every comparison might look like:

```text
unwrap left
unwrap right
call carrier comparator
```

With the lifted instance:

```text
compare newtype values directly
```

and TypeScript ensures that the comparator belongs to the intended newtype.

That means an:

```text
Order<UserId>
```

does not silently become an:

```text
Order<OrderId>
```

just because both carriers are numbers.

## Runtime behavior

`makeEquivalence` and `makeOrder` do not allocate adapter functions that unwrap
each input.

The implementation casts the carrier instance to the newtype instance.

That is safe because the runtime representation is identical.

## 4. Algebra

The same lifting pattern extends to combining / reducing behavior.

## `makeCombiner`

The demo defines:

```ts
interface Credits
    extends Newtype.Newtype<
        "Credits",
        number
    >
{}
```

and reuses Effect's numeric sum reducer as a carrier Combiner:

```ts
const CreditsCombiner =
    Newtype.makeCombiner<
        Credits
    >(
        EffectNumber
            .ReducerSum
    )
```

Then:

```ts
const total =
    CreditsCombiner.combine(
        CreditsIso.set(
            10
        ),
        CreditsIso.set(
            20
        )
    )
```

returns:

```text
Credits
```

whose carrier value is:

```text
30
```

The current Effect typetest verifies that the result stays inside the newtype.

## `makeReducer`

The reducer lift also preserves:

```text
initialValue
combine
combineAll
```

at the newtype level.

```ts
const CreditsReducer =
    Newtype.makeReducer<
        Credits
    >(
        EffectNumber
            .ReducerSum
    )
```

Then:

```ts
const total =
    CreditsReducer.combineAll([
        CreditsIso.set(
            1
        ),
        CreditsIso.set(
            2
        ),
        CreditsIso.set(
            3
        )
    ])
```

has type:

```text
Credits
```

and unwraps to:

```text
6
```

## Reducer initial value

Because the carrier reducer's initial value is lifted too:

```ts
CreditsReducer.initialValue
```

is typed as:

```text
Credits
```

while its runtime number value remains the carrier's initial value.

For numeric sum that is:

```text
0
```

## `Combiner` versus `Reducer`

The lift preserves the distinction in Effect's algebra APIs.

### Combiner

Provides:

```text
combine(a, b)
```

### Reducer

Provides:

```text
initialValue
combine(a, b)
combineAll(iterable)
```

A Reducer can therefore reduce an empty collection, while a plain Combiner has
no neutral seed value of its own.

## Zero-cost lifting

All Newtype lift helpers are built around the fact that:

```text
Newtype runtime representation
=
Carrier runtime representation
```

So lifting:

```text
Equivalence
Order
Combiner
Reducer
```

does not require wrapping or unwrapping each value at runtime.

The implementation reuses the carrier behavior while changing the TypeScript
surface.

## Public surface

### Model

- `Newtype`

### Type utilities

- `Newtype.Any`
- `Newtype.Key`
- `Newtype.Carrier`

### Unwrap / optics

- `value`
- `makeIso`

### Carrier-instance lifts

- `makeEquivalence`
- `makeOrder`
- `makeCombiner`
- `makeReducer`

That accounts for the 10 current public entries represented by the module.

## Newtype in a Foldkit feature

Newtypes are particularly useful for model fields where several IDs share a
primitive representation.

Instead of:

```ts
type Model =
    Readonly<{
        selectedUserId:
            number
        selectedOrderId:
            number
    }>
```

a feature can use:

```text
UserId
OrderId
```

as distinct types.

That improves Message and Update correctness without adding runtime wrappers to
the model.

For example, the type system can prevent accidentally feeding an OrderId into a
message that expects UserId even though both values are numbers at runtime.

Newtype still does not replace Schema validation at the boundary.

If route params or decoded JSON must be validated before becoming a UserId,
perform that runtime validation first and then construct the newtype.

## Type discipline

The generated demo has no explicit `any` annotations.

Every Foldkit Message payload and UI callback that could lose contextual typing
has an explicit type.

Button attributes are derived from `HtmlBuilder`.

The upstream Effect source uses broad generic machinery internally for its
`Newtype.Any` definition; that is separate from the generated artifact
constraint.

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
resolved, so this check catches local syntax and implicit-any issues rather than
replacing a full typecheck inside the target monorepo.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `NewtypeDemo.Message` to the parent Message union,
3. initialize `NewtypeDemo.init`,
4. delegate child messages to `NewtypeDemo.update`,
5. render `NewtypeDemo.view(...)` from the Newtype route.

This artifact intentionally performs none of those edits.
