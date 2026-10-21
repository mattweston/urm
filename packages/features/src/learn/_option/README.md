# Effect 4 Option — Foldkit visual demo

## Mental model

Use `Option` when a value may or may not exist and absence is expected.

- `Option.some(value)` means the value is present
- `Option.none()` means the value is absent

That makes `Option` ideal for:

- nullable / undefined inputs at boundaries
- lookups that may not find anything
- small validation or refinement pipelines
- combining many optional values and requiring all of them
- explicit unwrapping with a fallback

If you need failure details, prefer `Result` or `Effect` instead.

## The four sections

### 1. Construct

Bring JavaScript boundary values into the model:

```ts
Option.fromNullishOr(undefined) // => Option.none()
Option.fromNullishOr(null) // => Option.none()
Option.fromNullishOr("Ada") // => Option.some("Ada")
```

Also lift throwing code:

```ts
const parse = Option.liftThrowable(JSON.parse)

parse('{"name":"Ada"}')
// Option.some({ name: "Ada" })

parse("{ bad json }")
// Option.none()
```

### 2. Transform

Compose optional work without nested `if` statements:

```ts
pipe(
  Option.some(4),
  Option.map((n) => n * 2),
  Option.filter((n) => n >= 8),
  Option.flatMap((n) =>
    n % 2 === 0
      ? Option.some(`even:${n}`)
      : Option.none()
  )
)
```

### 3. Combine

Require several independent optional values at once:

```ts
Option.all([maybeName, maybeAge])
Option.all({ name: maybeName, age: maybeAge, city: maybeCity })
```

Or combine two optional values with a function:

```ts
Option.zipWith(
  Option.some("Ada"),
  Option.some("Lovelace"),
  (first, last) => `${first} ${last}`
)
```

### 4. Unwrap

Eventually you convert `Option<A>` into a concrete value:

```ts
Option.match(option, {
  onNone: () => "Missing user",
  onSome: (value) => `Hello, ${value}!`,
})

pipe(
  option,
  Option.getOrElse(() => "Anonymous")
)
```

The demo also shows generator style:

```ts
Option.gen(function* () {
  const first = yield* maybeFirst
  const last = yield* maybeLast
  return `${first} ${last}`
})
```

If any yielded `Option` is `None`, the whole generator short-circuits to
`Option.none()`.

## Real Effect 4 APIs used

The source includes:

- `Option.some`
- `Option.none`
- `Option.fromNullishOr`
- `Option.liftThrowable`
- `Option.map`
- `Option.filter`
- `Option.flatMap`
- `Option.all`
- `Option.zipWith`
- `Option.match`
- `Option.getOrElse`
- `Option.gen`
- `Option.isSome`
- `Option.isNone`
- `pipe`
