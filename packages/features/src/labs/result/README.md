# Effect 4 Result — Foldkit visual demo

## What Result represents

`Result<A, E>` is an eager, synchronous value representing one of two states:

```ts
Success<A>
Failure<E>
```

It is useful when a computation has already happened (or can happen
synchronously) and you want typed failure as data.

That is different from `Effect<A, E, R>`:

- `Result` is already a value.
- `Effect` is a lazy description of work.
- `Result` has no service requirements or Fiber runtime.
- `Effect` can model async work, concurrency, resource lifetimes, services, etc.

## The four sections

### 1. Construct

Direct constructors:

```ts
Result.succeed(42)
Result.fail("not found")
```

Convert Option:

```ts
Result.fromOption(
  Option.some("Ada"),
  () => "missing user"
)
```

Capture synchronous exceptions:

```ts
Result.try({
  try: () => JSON.parse(input),
  catch: () => "invalid json"
})
```

### 2. Transform

Transform the success channel:

```ts
Result.map(result, (n) => n * 2)
```

Transform the failure channel:

```ts
Result.mapError(
  result,
  (error) => `Validation: ${error}`
)
```

Sequence another Result-producing computation:

```ts
Result.flatMap(
  result,
  (n) =>
    n > 0
      ? Result.succeed(n)
      : Result.fail("not positive")
)
```

Once a Failure exists, success-side `map` operations are skipped.

### 3. Recover

Collapse both branches:

```ts
Result.match(result, {
  onSuccess: (value) => `value: ${value}`,
  onFailure: (error) => `error: ${error}`
})
```

Unwrap with fallback:

```ts
Result.getOrElse(
  result,
  () => 0
)
```

Or keep the Result shape while changing the error:

```ts
Result.mapError(result, ...)
```

### 4. Combine

Combine independent Results:

```ts
Result.all({
  user: Result.succeed("Ada"),
  age: Result.succeed(36)
})
```

Sequential generator syntax:

```ts
Result.gen(function* () {
  const user = yield* Result.succeed("Ada")
  const age = yield* Result.succeed(36)
  return `${user} is ${age}`
})
```

Unlike `Effect.gen`, `Result.gen` is eager and synchronous.

## Effect 4 APIs used

The source includes:

- `Result.succeed`
- `Result.fail`
- `Result.fromOption`
- `Result.try`
- `Result.isSuccess`
- `Result.isFailure`
- `Result.map`
- `Result.mapError`
- `Result.flatMap`
- `Result.match`
- `Result.getOrElse`
- `Result.all`
- `Result.gen`
- `Option`
- `pipe`
