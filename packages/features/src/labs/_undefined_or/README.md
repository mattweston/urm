# UndefinedOr

Based on:

- <https://effect.website/docs/v4/api/effect/UndefinedOr>
- `.context/effect/packages/effect/src/UndefinedOr.ts`
- `.context/foldkit`

The source is written against the Effect version vendored by this repository.

## Mental model

`UndefinedOr` is for ordinary TypeScript values shaped like:

```ts
A | undefined
```

when `undefined` already means “no value”.

It gives you a small functional vocabulary without introducing an `Option<A>`
wrapper at runtime.

Use it when:

- an API already returns `T | undefined`
- `undefined` is the only absence marker
- you want pipe-friendly mapping or matching
- you want to adapt throwing functions to return `undefined`
- you need Reducer / Combiner behavior for optional values

Prefer `Option` when you want absence represented explicitly as `Some` / `None`.
Prefer `Result` or `Effect` when failure information matters.

## 1. `map`

`map` transforms only defined values:

```ts
UndefinedOr.map(4, (n) => n * 2)
// 8

UndefinedOr.map(undefined, (n: number) => n * 2)
// undefined
```

It is dual, so pipe style also works:

```ts
pipe(
  value,
  UndefinedOr.map((n) => n * 2)
)
```

The key rule is simple:

```text
defined   → run f
undefined → stay undefined
```

## 2. `match`

`match` handles both branches and removes the optionality from the result:

```ts
UndefinedOr.match(value, {
  onUndefined: () => "missing",
  onDefined: (n) => `value:${n}`,
})
```

Unlike `map`, the undefined branch is explicit.

Both callbacks are lazy in the sense that only the selected branch is run.

## 3. `getOrThrow` and `getOrThrowWith`

Use these only when an absent value is exceptional.

```ts
UndefinedOr.getOrThrow(value)
```

returns the value when defined, otherwise throws Effect's default `Error`.

Use the custom variant when the thrown value matters:

```ts
UndefinedOr.getOrThrowWith(
  value,
  () => new RangeError("Value was required")
)
```

If absence is expected control flow, `match` is usually clearer.

## 4. `liftThrowable`

`liftThrowable` adapts exception-throwing code into `B | undefined`:

```ts
const parseNumber = UndefinedOr.liftThrowable((text: string) => {
  const value: unknown = JSON.parse(text)
  if (typeof value !== "number") {
    throw new TypeError("Expected a JSON number")
  }
  return value
})

parseNumber("42")
// 42

parseNumber("not-json")
// undefined
```

### Important gotcha

The thrown error is discarded.

That means these two situations become indistinguishable:

```text
function threw
function successfully returned undefined
```

If the error is useful data, use `Result` or `Effect` instead.

## 5. `makeReducer`

Given a normal `Combiner<A>`, this creates a `Reducer<A | undefined>` whose
initial value is `undefined`.

```ts
const Sum = Combiner.make<number>((a, b) => a + b)
const OptionalSum = UndefinedOr.makeReducer(Sum)

OptionalSum.combineAll([
  1,
  undefined,
  2,
  undefined,
  3,
])
// 6
```

Its semantics are tolerant of missing values:

```text
undefined + undefined → undefined
defined   + undefined → defined
undefined + defined   → defined
defined   + defined   → combine both
```

So `undefined` behaves like “no contribution yet”.

## 6. `makeCombinerFailFast`

This has the opposite policy:

```ts
const OptionalSum =
  UndefinedOr.makeCombinerFailFast(Sum)
```

Any missing operand makes the result missing:

```text
1 + 2         → 3
1 + undefined → undefined
undefined + 2 → undefined
```

Use it when every participating value is required.

## 7. `makeReducerFailFast`

This lifts an existing `Reducer<A>` to `Reducer<A | undefined>` and preserves
its normal initial value while making any encountered `undefined` abort the
reduction.

```ts
const SumReducer = Reducer.make(
  (a: number, b: number) => a + b,
  0
)

const OptionalSum =
  UndefinedOr.makeReducerFailFast(SumReducer)

OptionalSum.combineAll([1, 2, 3])
// 6

OptionalSum.combineAll([1, undefined, 3])
// undefined
```

Its `combineAll` implementation short-circuits as soon as the accumulator
becomes `undefined`.

## UndefinedOr vs Option

Use `UndefinedOr` when the native union is already the desired representation:

```ts
User | undefined
```

Use `Option` when you want absence to be an explicit data constructor:

```ts
Option.Option<User>
```

`UndefinedOr` is deliberately smaller. It does not provide the large combinator
surface that `Option` does.

## Real Effect 4 APIs used

The lesson source includes every export in the module:

- `UndefinedOr.map`
- `UndefinedOr.match`
- `UndefinedOr.getOrThrowWith`
- `UndefinedOr.getOrThrow`
- `UndefinedOr.liftThrowable`
- `UndefinedOr.makeReducer`
- `UndefinedOr.makeCombinerFailFast`
- `UndefinedOr.makeReducerFailFast`

## Suggested placement

```text
packages/features/src/labs/_undefined-or/
├── README.md
├── undefined-or.ts
└── undefined-or.view.ts
```

No Git operations are required; these files are intended to be copied locally.
