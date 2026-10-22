# Effect v4 Pipeable visual demo

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/Pipeable

The current Effect source package is `4.0.0-rc.116`.

The current `packages/effect/src/Pipeable.ts` source exposes **6 public
exports**:

- `Pipeable`
- `pipeArguments`
- `Prototype`
- `Class`
- `PipeableConstructor`
- `Mixin`

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `pipeable.ts` — the Pipeable contract, direct `pipeArguments` usage,
  `Prototype`, `Class`, and `Mixin` examples.
- `pipeable.view.ts` — interactive visual demo.
- `pipeable-preview.png` — static preview of the default Contract stage.

## Intended location

```text
packages/features/src/labs/pipeable/
├── pipeable.ts
└── pipeable.view.ts
```

No parent router/model/message/update files are modified.

## Core idea

`Pipeable` is the shared interface behind Effect-style method chaining:

```ts
value.pipe(
    f,
    g,
    h
)
```

The runtime meaning is simply:

```text
value
  ↓ f
result 1
  ↓ g
result 2
  ↓ h
final result
```

The output of each function becomes the input of the next function.

The method form is conceptually equivalent to the standalone Effect `pipe`
utility:

```ts
value.pipe(
    f,
    g,
    h
)
```

versus:

```ts
pipe(
    value,
    f,
    g,
    h
)
```

The difference is syntax and where the initial value appears.

## What Pipeable does not mean

Implementing `Pipeable` does **not** imply that the value is:

```text
an Effect
lazy
asynchronous
immutable
pure
```

`Pipeable` only supplies the composition surface.

The individual functions decide what the pipeline does.

This is why many very different Effect data types can share the same `.pipe`
method.

## 1. Contract

### `Pipeable`

The interface defines a family of overloads for:

```ts
pipe(...)
```

The zero-function case is:

```text
pipe()
    → self
```

A one-step pipeline has the conceptual type:

```text
A
→ B
```

A longer pipeline tracks every intermediate value:

```text
A
→ B
→ C
→ D
→ ...
```

That is important because pipe functions do not need to preserve one type.

## Type-changing pipelines

The demo defines:

```ts
class NumberBox
    extends Pipeable.Class
{
    constructor(
        readonly value: number
    ) {
        super()
    }
}
```

Then:

```ts
const result =
    new NumberBox(
        5
    )
        .pipe(
            (
                box: NumberBox
            ) =>
                box.value,
            (
                value: number
            ) =>
                value + 2,
            (
                value: number
            ) =>
                value * 3,
            (
                value: number
            ) =>
                `value=${value}`
        )
```

The type flow is:

```text
NumberBox
→ number
→ number
→ number
→ string
```

and the value is:

```text
"value=21"
```

The Pipeable overloads preserve this changing type through the chain.

## Zero functions

```ts
const box =
    new NumberBox(
        5
    )

box.pipe() === box
// true
```

This is part of both the type-level interface and the runtime implementation.

## Method pipe versus standalone pipe

Effect's general pipeline documentation describes:

```ts
pipe(
    initial,
    f,
    g
)
```

as left-to-right function composition.

The method form:

```ts
initial.pipe(
    f,
    g
)
```

uses the same conceptual data flow.

Many Effect data types expose the method so the standalone helper does not need
to be imported at every use site.

## Why the `this` type matters

The interface overloads use:

```ts
this: A
```

rather than fixing one specific implementing type in the interface declaration.

That lets an inherited / mixed-in pipe method infer the actual receiver as the
initial pipeline type.

For a `NumberBox` instance:

```text
A = NumberBox
```

For another class:

```text
A = that class
```

The same pipe implementation can therefore be shared broadly.

## 2. Arguments

### `pipeArguments`

The low-level implementation helper is:

```ts
Pipeable.pipeArguments(
    self,
    args
)
```

where:

```text
self
    initial value

args
    JavaScript IArguments containing
    the pipeline functions
```

It returns:

```text
unknown
```

because an arbitrary runtime `IArguments` value does not carry the rich
overload relationship between every pipeline stage.

The strongly typed public surface comes from `Pipeable.pipe`.

## Why use `arguments`?

A normal custom pipe method can forward the actual arguments object:

```ts
pipe(
    first:
        (
            value: number
        ) => number,
    second:
        (
            value: number
        ) => number
): number {
    return Pipeable.pipeArguments(
        this.value,
        arguments
    ) as number
}
```

The demo uses exactly this form.

## Runtime strategy

The current implementation specializes short pipelines.

### Zero functions

```text
return self
```

### One through nine functions

The implementation uses direct nested calls.

Conceptually, two functions become:

```text
f2(
    f1(
        self
    )
)
```

and so on.

### Longer pipelines

The default branch uses a loop:

```text
ret = self

for each function:
    ret = function(ret)

return ret
```

This avoids needing an unbounded switch while retaining direct fast paths for
common short pipelines.

## Compile-time versus runtime responsibility

A useful split is:

```text
Pipeable interface
    compile-time overload chain

pipeArguments
    runtime execution mechanics
```

This explains why `pipeArguments` itself returns `unknown` while `.pipe(...)`
can still infer a precise final type.

## 3. Prototype and Class

The module provides two reuse strategies before reaching `Mixin`.

## `Prototype`

```ts
Pipeable.Prototype
```

is a reusable object implementing:

```ts
pipe() {
    return pipeArguments(
        this,
        arguments
    )
}
```

A prototype-based object can therefore inherit the standard implementation.

The demo creates a small object with:

```text
value = 7
```

whose prototype is `Pipeable.Prototype`.

Its pipeline can read that receiver and transform it normally.

## `Class`

```ts
Pipeable.Class
```

is a base constructor whose prototype is:

```text
Pipeable.Prototype
```

That makes inheritance ergonomic:

```ts
class NumberBox
    extends Pipeable.Class
{
    constructor(
        readonly value: number
    ) {
        super()
    }

    increment(): NumberBox {
        return new NumberBox(
            this.value + 1
        )
    }
}
```

Instances get:

```text
domain fields
domain methods
.pipe(...)
```

without reimplementing the pipe runtime.

## Domain behavior stays separate

`Pipeable.Class` does not prescribe:

```text
state shape
immutability
equality
effects
domain operations
```

The subclass defines those concerns.

The base class contributes only the standard Pipeable behavior.

## `PipeableConstructor`

The constructor-side public type is:

```ts
Pipeable.PipeableConstructor
```

It represents a class constructor whose instances support `Pipeable`.

It is mainly useful in APIs that work with constructors rather than already
created instances.

## Prototype versus Class

Choose:

```text
Prototype
```

when working directly with object/prototype construction.

Choose:

```text
Class
```

when ordinary class inheritance is the natural model.

Both eventually delegate to the same `pipeArguments` helper.

## 4. Mixin

### `Mixin`

`Pipeable.Mixin` adds pipe support to an existing class constructor.

The demo starts with:

```ts
class Counter {
    constructor(
        readonly value: number
    ) {}

    add(
        amount: number
    ): Counter {
        return new Counter(
            this.value + amount
        )
    }
}
```

Then:

```ts
const PipeableCounter =
    Pipeable.Mixin(
        Counter
    )
```

creates a derived constructor.

## Preserved constructor

The mixed class retains the original constructor arguments:

```ts
new PipeableCounter(
    5
)
```

rather than requiring a separate wrapper object or manual setup.

## Preserved members

Existing methods remain available:

```ts
const counter =
    new PipeableCounter(
        5
    )

counter.add(
    4
)
// Counter(9)
```

The returned derived object also exposes:

```text
.pipe(...)
```

## Pipeline example

```ts
const result =
    new PipeableCounter(
        5
    )
        .pipe(
            (
                counter: Counter
            ) =>
                counter.add(
                    4
                ),
            (
                counter: Counter
            ) =>
                counter.value,
            (
                value: number
            ) =>
                value * 10
        )
```

returns:

```text
90
```

The type flow is:

```text
Counter
→ Counter
→ number
→ number
```

## The original class is not patched

The implementation is:

```text
class extends klass {
    pipe() {
        ...
    }
}
```

so `Mixin` returns a subclass.

It does not mutate the supplied class's original prototype.

That distinction matters when a library should add capabilities without
globally modifying an existing constructor.

## Mixin versus Class

Use `Pipeable.Class` when designing the inheritance hierarchy yourself:

```ts
class MyType
    extends Pipeable.Class
```

Use `Pipeable.Mixin` when the class already exists:

```ts
const PipeableExisting =
    Pipeable.Mixin(
        Existing
    )
```

Both approaches share the standard method semantics.

## Relationship to Function.pipe

The standalone pipeline helper belongs to Effect's Function utilities and is
re-exported from the root package.

`Pipeable` is the protocol that lets a value expose that style as an instance
method.

Conceptually:

```text
Function.pipe
    caller owns the pipeline syntax

Pipeable
    receiver exposes the pipeline syntax
```

Both remain ordinary left-to-right composition.

## Relationship to Effect

Effect values implement pipe-style method chaining, which is why code such as:

```ts
Effect.succeed(
    1
)
    .pipe(
        Effect.map(
            (
                value
            ) =>
                value + 1
        )
    )
```

is idiomatic.

The Pipeable module itself is more general than Effect.

It can be used for your own:

```text
domain data structures
builder values
immutable classes
wrapper objects
DSL nodes
```

when the same chaining style is useful.

## Foldkit relationship

Foldkit features already use a functional / compositional style around Model
and update helpers.

`Pipeable` can be useful for custom domain objects that benefit from an
instance-level transformation pipeline, but it is not required for normal
Foldkit feature composition.

In particular:

```text
Foldkit Model
Message
update
view
```

remain the application architecture.

Pipeable is simply a reusable TypeScript protocol / runtime helper for values
that should expose `.pipe(...)`.

## Current public surface

### Model

- `Pipeable`

### Runtime helper

- `pipeArguments`

### Reusable implementation

- `Prototype`

### Base constructor

- `Class`

### Constructor model

- `PipeableConstructor`

### Existing-class adapter

- `Mixin`

That accounts for all 6 current public exports.

## Current implementation notes

The current source:

- returns the receiver unchanged for a zero-stage pipeline,
- directly nests calls for one through nine stages,
- falls back to a loop for longer runtime argument lists,
- implements `Prototype.pipe` through `pipeArguments`,
- installs `Prototype` as the prototype of `Class`,
- implements `Mixin` by returning a subclass of the supplied constructor.

These are implementation details rather than requirements for code that merely
implements the `Pipeable` interface itself.

## Type discipline

The generated demo has no explicit `any` annotations.

Every pipeline callback, Foldkit Message payload, and UI callback that could
lose contextual typing has an explicit type where useful.

Button attributes are derived from `HtmlBuilder`.

The upstream Effect implementation currently uses broad generic `any` types in
the constructor / Mixin signatures and one internal Class cast. That is separate
from the generated artifact constraint.

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
`features/labs/*` demos:

1. add the child Model to the parent learn Model,
2. add `PipeableDemo.Message` to the parent Message union,
3. initialize `PipeableDemo.init`,
4. delegate child messages to `PipeableDemo.update`,
5. render `PipeableDemo.view(...)` from the Pipeable route.

This artifact intentionally performs none of those edits.
