# Filter

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/Filter

The current API page is Effect `4.0.0-rc.116` and reports 30 exports. The
implementation was also checked against the current
`packages/effect/src/Filter.ts`.

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `filter.ts` — real Filter / Result / Option / Effect examples and deterministic
  snapshots.
- `filter.view.ts` — interactive visual demo.

## Intended location

```text
packages/features/src/labs/filter/
├── filter.ts
└── filter.view.ts
```

No parent router/model/message/update files are modified.

## Core model

A synchronous Filter is:

```ts
Filter.Filter<Input, Pass, Fail>
```

conceptually:

```text
Input
  ↓
Result<Pass, Fail>
```

Success means the value passed the filter. Failure means it was filtered out.

Unlike a boolean predicate, both branches retain data, and a successful filter
may transform its input into a different type.

An effectful filter is:

```ts
Filter.FilterEffect<
    Input,
    Pass,
    Fail,
    E,
    R
>
```

conceptually:

```text
Input
  ↓
Effect<Result<Pass, Fail>, E, R>
```

The outer Effect describes how the filtering computation runs; the inner Result
still represents pass versus filtered-out.

## Teaching stages

### 1. Build

Covers the primary constructors.

#### `fromPredicate`

Turns a boolean predicate or refinement into a Filter.

```ts
const positive =
    Filter.fromPredicate(
        (n: number) => n > 0
    )
```

A passed input is returned unchanged in Result.Success; a rejected input is
returned in Result.Failure.

#### `make`

Allows independent Pass and Fail payloads.

```ts
Filter.make(
    (n: number) =>
        n > 0
            ? Result.succeed(n * 2)
            : Result.fail(n)
)
```

This makes Filter useful as both a gate and a transformation.

#### `mapFail`

Transforms only the failure payload.

The demo converts:

```text
-2
```

into:

```text
"not-positive:-2"
```

without changing successful values.

#### `try`

Runs a synchronous transformation and converts thrown exceptions into a
filtered-out result containing the original input.

#### `fromPredicateOption`

Uses:

```text
Some(value) -> Result.Success(value)
None        -> Result.Failure(original input)
```

The demo uppercases a non-empty string.

### 2. Narrow

Covers built-in reusable filters.

Primitive filters:

- `string`
- `number`
- `boolean`
- `bigint`
- `symbol`
- `date`

`date` checks `instanceof Date`; it does not verify that the Date timestamp is
valid.

Other narrowing helpers:

- `instanceOf`
- `has`
- `tagged`
- `reason`

`tagged` narrows `_tag`-discriminated unions.

`reason` drills into a matching tagged error and returns the nested matching
reason value.

#### `equalsStrict` versus `equals`

`equalsStrict` uses JavaScript `===`.

That means:

```text
NaN !== NaN
```

and two distinct objects with identical fields do not match.

`equals` delegates to Effect's structural equality semantics, so distinct
structurally equal values can pass.

### 3. Compose

Covers the Filter combinator algebra.

#### Parallel / same-input

- `zip`
- `zipWith`
- `andLeft`
- `andRight`

Both filters must pass.

`zip` returns both pass values as a tuple.

`zipWith` combines the two pass values with a function.

`andLeft` returns only the left pass value.

`andRight` returns only the right pass value.

#### `or`

Runs the left filter first. If it passes, that result is returned immediately.

The right filter is only evaluated when the left rejects.

#### `compose`

Runs filters sequentially:

```text
original input
    ↓ left
intermediate pass value
    ↓ right
final pass value
```

If either stage rejects, that stage's own failure payload is preserved.

#### `composePassthrough`

Runs the same sequential pipeline, but if either stage rejects, the failure
payload is the **original input**.

The demo uses:

```text
"  a "
  ↓ trim
"a"
  ↓ minimum length 3
reject
```

Normal compose returns:

```text
Failure("short:a")
```

while composePassthrough returns:

```text
Failure("  a ")
```

This is useful when a pipeline transforms values while a collection filter still
needs the original rejected element.

### 4. Adapt

Shows three conversions:

```ts
Filter.toPredicate
Filter.toOption
Filter.toResult
```

`toPredicate` discards payloads and returns only boolean pass/fail.

`toOption` keeps the successful transformed value and maps rejection to None.

`toResult` exposes a plain Result-returning function while retaining both branch
payloads.

The second half uses:

```ts
Filter.makeEffect
```

to construct a `FilterEffect`.

The demo's effect itself cannot fail and needs no services, but the generic type
supports both typed Effect errors and Context requirements.

## Current public surface

### Combinators

- `andLeft`
- `andRight`
- `compose`
- `composePassthrough`
- `or`
- `zip`
- `zipWith`

### Constructors

- `bigint`
- `boolean`
- `date`
- `equals`
- `equalsStrict`
- `fromPredicate`
- `fromPredicateOption`
- `has`
- `instanceOf`
- `make`
- `makeEffect`
- `number`
- `reason`
- `string`
- `symbol`
- `tagged`

### Converting

- `toOption`
- `toPredicate`
- `toResult`

### Mapping

- `mapFail`

### Models

- `Filter`
- `FilterEffect`

### Other

- `try`

## Filter versus Predicate

A Predicate answers only:

```text
did this value pass?
```

A Filter can answer:

```text
what did the passing value become?
```

and:

```text
what information should be retained when it was rejected?
```

The conversion to Predicate is therefore lossy by design.

## Filter versus Effect errors

A `Result.Failure` from a Filter is not an Effect error.

For a FilterEffect:

```text
Effect error E
```

means the **filtering computation itself failed**.

The inner:

```text
Result.Failure<Fail>
```

means the filtering computation ran successfully and decided to reject the
input.

Those are separate channels.

## Type discipline

The generated demo has no explicit `any` annotations.

Every `Message.match` destructured payload is explicitly typed, and Button
attributes are derived from `HtmlBuilder` so the demo remains clean under
`noImplicitAny`.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/labs/*` demos:

1. add the child Model to the parent learn Model,
2. add `FilterDemo.Message` to the parent Message union,
3. initialize `FilterDemo.init`,
4. delegate child messages to `FilterDemo.update`,
5. render `FilterDemo.view(...)` from the Filter route.

This artifact intentionally performs none of those edits.
