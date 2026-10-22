# Effect 4 Function — Foldkit visual demo

## Mental model

Effect's `Function` module is a toolbox for function composition and
adaptation.

The biggest ideas are:

```text
pipe(value, ...)
```

apply a value through functions immediately,

```text
flow(...)
```

build a reusable function,

and:

```text
Function.dual(...)
```

define one implementation that supports both data-first and data-last calling
styles.

The module also contains small adapters such as `identity`, `constant`, `flip`,
`tupled`, `untupled`, `apply`, and type-level utilities such as `satisfies`
and `cast`.

## The four sections

### 1. pipe

Apply a known value immediately:

```ts
pipe(
  3,
  (n) => n + 1,
  (n) => n * 2,
  (n) => `result:${n}`
)
// "result:8"
```

Each function after the initial value is unary. The output of one step becomes
the input to the next step.

This is especially useful with Effect's data-last APIs:

```ts
pipe(
  values,
  Array.map(transform),
  Array.filter(predicate)
)
```

### 2. flow

Build the transformation first:

```ts
const makeDisplayName = flow(
  (first: string, last: string) =>
    `${first} ${last}`,
  (name) => name.trim(),
  (name) => name.toUpperCase()
)

makeDisplayName(
  "Ada",
  "Lovelace"
)
// "ADA LOVELACE"
```

A useful distinction:

```text
pipe(value, f, g)
  = I already have the value

flow(f, g)
  = I want a reusable function for later
```

The first function passed to `flow` can accept multiple arguments. Every
following function receives the single result from the previous step.

### 3. dual

Many Effect APIs support both:

```ts
add(2, 3)
```

and:

```ts
pipe(
  2,
  add(3)
)
```

`Function.dual` lets one implementation expose both call shapes:

```ts
const add = Function.dual<
  (that: number) =>
    (self: number) => number,
  (self: number, that: number) =>
    number
>(
  2,
  (self, that) =>
    self + that
)
```

The first argument can be either:

- a numeric data-first arity
- a predicate over `arguments` for more advanced overload selection

This is one of the core ergonomic patterns behind Effect's pipe-friendly API.

## 4. Small adapters

### identity

```ts
Function.identity(value)
```

returns the same value.

### constant

```ts
const ready =
  Function.constant("ready")

ready()
// "ready"
```

Creates a zero-argument thunk.

There are predefined constant thunks too:

```ts
Function.constTrue
Function.constFalse
Function.constNull
Function.constUndefined
Function.constVoid
```

### flip

For a curried function:

```ts
const f =
  (number: number) =>
  (text: string) =>
    number - text.length
```

`flip` swaps the argument groups:

```ts
Function.flip(f)(
  "hello"
)(8)
// 3
```

### tupled

Adapt a multi-argument function to one tuple argument:

```ts
Function.tupled(
  (a: number, b: number) =>
    a + b
)([2, 3])
// 5
```

### untupled

Adapt a tuple-argument function back to separate arguments:

```ts
Function.untupled(
  ([a, b]: readonly [
    number,
    number
  ]) => a * b
)(4, 5)
// 20
```

### apply

```ts
Function.apply("hello")(
  (text) => text.length
)
// 5
```

`apply(a)(f)` is simply `f(a)`, but the reversed shape can be useful while the
function itself is the value flowing through a pipeline.

## Type-only helpers

### satisfies

```ts
Function.satisfies<number>()(
  5 as const
)
```

checks that the expression is assignable to `number` while preserving the
precise inferred type `5`.

### cast

```ts
Function.cast<unknown, string>(
  value
)
```

changes only the static TypeScript type. It performs **no runtime validation or
conversion**.

## Other useful APIs

The Function module also includes:

```ts
Function.compose
Function.absurd
Function.hole
Function.SK
```

`compose` is the two-function version of reusable composition:

```ts
Function.compose(
  increment,
  square
)(2)
// square(increment(2))
```

`absurd` is for branches that TypeScript has proved to be `never`; calling it
at runtime throws because the branch should be impossible.

## Real Effect 4 APIs used

The source includes:

- `pipe`
- `flow`
- `Function.dual`
- `Function.apply`
- `Function.identity`
- `Function.constant`
- `Function.flip`
- `Function.tupled`
- `Function.untupled`
- `Function.satisfies`
- `Function.cast`
