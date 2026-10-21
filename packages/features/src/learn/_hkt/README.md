# HKT

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/HKT

The current API page is Effect `4.0.0-rc.115` and documents exactly four public
exports:

- `TypeLambda`
- `Kind`
- `TypeClass`
- `URI`

The implementation was also checked against the current
`packages/effect/src/HKT.ts`.

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `hkt.ts` — concrete TypeLambda examples, Kind applications, a small Functor
  type class, and runtime witnesses for the resolved types.
- `hkt.view.ts` — interactive visual demo.
- `hkt-preview.png` — static preview of the default Lambda stage.

## Intended location

```text
packages/features/src/learn/hkt/
├── hkt.ts
└── hkt.view.ts
```

No parent router/model/message/update files are modified.

## Why HKT exists

TypeScript can abstract over ordinary types:

```ts
<A>
```

but it cannot directly quantify over a generic type constructor such as:

```text
Array<_>
Option<_>
Effect<_, _, _>
```

Effect's HKT encoding gives those constructor shapes a common type-level
representation.

Conceptually:

```text
TypeLambda
    ↓ describe slots

Kind
    ↓ supply concrete slot types

concrete TypeScript type
```

The entire module is type-level machinery. It does not introduce a runtime
container or wrapper.

## 1. Lambda

A `TypeLambda` has four named channels:

```ts
interface TypeLambda {
    readonly In: unknown
    readonly Out2: unknown
    readonly Out1: unknown
    readonly Target: unknown
}
```

A custom lambda extends that interface and defines a `type` property in terms of
the channels it cares about.

### Array

```ts
interface ArrayTypeLambda
    extends HKT.TypeLambda
{
    readonly type:
        ReadonlyArray<
            this["Target"]
        >
}
```

Only `Target` participates.

### Option

```ts
interface OptionTypeLambda
    extends HKT.TypeLambda
{
    readonly type:
        Option.Option<
            this["Target"]
        >
}
```

Again, only `Target` participates.

### Effect

```ts
interface EffectTypeLambda
    extends HKT.TypeLambda
{
    readonly type:
        Effect.Effect<
            this["Target"],
            this["Out2"],
            this["Out1"]
        >
}
```

This maps:

```text
Target -> success value
Out2   -> typed error
Out1   -> requirements
```

### Function

```ts
interface FunctionTypeLambda
    extends HKT.TypeLambda
{
    readonly type: (
        input: this["In"]
    ) => this["Target"]
}
```

This demonstrates that a lambda can also consume the `In` channel.

## 2. Kind

`Kind` is the type-level application operator.

Its shape is:

```ts
HKT.Kind<
    F,
    In,
    Out2,
    Out1,
    Target
>
```

It substitutes those four arguments into the TypeLambda.

### Array example

```ts
type ArrayString =
    HKT.Kind<
        ArrayTypeLambda,
        never,
        never,
        never,
        string
    >
```

resolves to:

```ts
ReadonlyArray<string>
```

### Option example

```ts
type OptionNumber =
    HKT.Kind<
        OptionTypeLambda,
        never,
        never,
        never,
        number
    >
```

resolves to:

```ts
Option.Option<number>
```

### Effect example

```ts
type EffectValue =
    HKT.Kind<
        EffectTypeLambda,
        never,
        "ParseError",
        "Config",
        number
    >
```

resolves to:

```ts
Effect.Effect<
    number,
    "ParseError",
    "Config"
>
```

### Function example

```ts
type Renderer =
    HKT.Kind<
        FunctionTypeLambda,
        { id: number },
        never,
        never,
        string
    >
```

resolves to:

```ts
(input: { id: number }) => string
```

`Kind` itself has no runtime implementation. The demo's runtime witnesses are
ordinary Arrays, Options, Effects, and functions whose types were computed
through `Kind`.

## 3. TypeClass

A `TypeClass<F>` associates an interface of operations with a TypeLambda `F`.

The demo defines a small Functor:

```ts
interface Functor<
    F extends HKT.TypeLambda
> extends HKT.TypeClass<F> {
    readonly [HKT.URI]?: F

    readonly map: <A, B>(
        self:
            HKT.Kind<
                F,
                never,
                never,
                never,
                A
            >,
        f: (value: A) => B
    ) =>
        HKT.Kind<
            F,
            never,
            never,
            never,
            B
        >
}
```

The important idea is:

```text
same F
different Target
```

The method accepts:

```text
F<A>
```

and returns:

```text
F<B>
```

without hard-coding what `F` actually is.

The demo implements this interface for both:

```text
ReadonlyArray
Option
```

and then uses one generic `mapWith` helper with both implementations.

## URI

`HKT.URI` is declared as a `unique symbol`.

It is used in the type shape:

```ts
readonly [HKT.URI]?: F
```

to associate a TypeClass implementation with its TypeLambda.

It is intended for compile-time typing and does not add runtime behavior in this
module.

## 4. Variance

The four TypeLambda channels allow the encoding to model richer type
constructors than a unary `F<A>`.

The HKT fallback form records these roles as:

```text
In      contravariant
Out2    covariant
Out1    covariant
Target  invariant
```

using helpers from `Types`.

A custom TypeLambda is free to use the channels however its concrete type shape
requires.

### Target

Typical unary containers use:

```text
Target
```

for their element:

```text
Array<Target>
Option<Target>
```

### In

Function-like constructors can use:

```text
In
```

as an input:

```text
(In) => Target
```

### Out2 / Out1

Effect uses the auxiliary output channels:

```text
Target  success
Out2    error
Out1    requirements
```

which is why the same HKT encoding can represent multi-parameter constructors.

## Current public surface

### Models

- `TypeClass`
- `TypeLambda`

### Symbols

- `URI`

### Utility types

- `Kind`

That is the entire documented HKT module surface.

## Practical use

Most application code does not need to define its own HKT machinery.

It becomes useful when writing abstractions that must be generic over the
container constructor itself, for example:

```text
Functor
Monad
Traversable-like APIs
custom reusable type classes
library-level generic combinators
```

If code only needs to be generic over the element type inside one known
container, an ordinary generic function is simpler.

## Type discipline

The generated demo has no explicit `any` annotations.

All Functor implementations, generic mapping callbacks, runtime witness
functions, and Foldkit message payloads use explicit types where contextual
typing could disappear under the standalone `--noResolve` check.

Button attributes are derived from `HtmlBuilder`.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `HktDemo.Message` to the parent Message union,
3. initialize `HktDemo.init`,
4. delegate child messages to `HktDemo.update`,
5. render `HktDemo.view(...)` from the HKT route.

This artifact intentionally performs none of those edits.
