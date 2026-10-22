# Effect 4 pipe / Pipeable — Foldkit visual demo

## The four sections

### 1. Value

Shows the standalone `pipe` function:

```ts
pipe(
  1,
  (n) => n + 1,
  (n) => n * 2,
  (n) => `result: ${n}`
)
```

`pipe` immediately feeds a value through unary functions from left to right.
The output type of every step becomes the input type of the next step.

### 2. Effect

Shows that Effect values implement the `Pipeable` interface, so the same
composition can be written either way:

```ts
pipe(
  Effect.succeed(1),
  Effect.map((n) => n + 1),
  Effect.flatMap((n) => Effect.succeed(n * 2))
)
```

or:

```ts
Effect.succeed(1).pipe(
  Effect.map((n) => n + 1),
  Effect.flatMap((n) => Effect.succeed(n * 2))
)
```

The standalone `pipe` function works with any value. `.pipe(...)` exists only
on values implementing `Pipeable`.

### 3. Custom Pipeable

The source includes all three current Effect 4 ways worth knowing:

- `Pipeable.Class`
- `Pipeable.Mixin`
- manual `pipe` using `Pipeable.pipeArguments`

Example:

```ts
class NumberBox extends Pipeable.Class {
  constructor(readonly value: number) {
    super()
  }
}

new NumberBox(5).pipe(
  (box) => box.value,
  (n) => n + 2,
  (n) => n * 3
)
// 21
```

### 4. flow

`flow` uses the same left-to-right composition idea but returns a reusable
function instead of immediately applying a value.

```ts
const slugify = flow(
  (value: string) => value.trim(),
  (value) => value.toLowerCase(),
  (value) => value.replace(/\s+/g, "-")
)
```

A useful shorthand is:

- `pipe(value, ...)` — transform this value now
- `flow(...)` — build a transformation function for later
- `value.pipe(...)` — same piping style when `value` implements `Pipeable`

## Effect 4 APIs used

The real example source uses:

- `pipe`
- `flow`
- `Pipeable.Pipeable`
- `Pipeable.Class`
- `Pipeable.Mixin`
- `Pipeable.pipeArguments`
- `Effect.map`
- `Effect.flatMap`
