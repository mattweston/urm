# Effect 4 Match — Foldkit visual demo

## Mental model

`Match` is Effect's typed pattern matching API.

You build ordered cases:

```ts
Match.when(pattern, handler)
```

then finalize the matcher in one of several ways:

```ts
Match.exhaustive
Match.option
Match.result
Match.orElse(...)
```

The key benefit over a normal `switch` / `if` chain is that the patterns
participate in TypeScript narrowing and Effect can track which parts of the
input type are still unmatched.

## The four sections

### 1. Match.value vs Match.type

Match one concrete value immediately:

```ts
Match.value(input).pipe(
  Match.when(
    Match.string,
    (value) => value.toUpperCase()
  ),
  Match.when(
    Match.number,
    (value) => value * 2
  ),
  Match.orElse(() => "other")
)
```

Build a reusable matcher instead:

```ts
const describe =
  Match.type<string | number | boolean>().pipe(
    Match.when(
      Match.string,
      (value) => `string:${value}`
    ),
    Match.when(
      Match.number,
      (value) => `number:${value}`
    ),
    Match.when(
      Match.boolean,
      (value) => `boolean:${value}`
    ),
    Match.exhaustive
  )
```

The distinction is:

```text
Match.value(input) → match this value now
Match.type<T>()    → build a reusable (input: T) => output
```

### 2. Patterns

`Match.when` supports more than literal equality.

Object shapes:

```ts
Match.when(
  { role: "admin" },
  () => "full access"
)
```

More specific shapes:

```ts
Match.when(
  {
    role: "editor",
    active: true
  },
  () => "edit access"
)
```

Built-in refinements include:

```ts
Match.string
Match.number
Match.boolean
Match.bigint
Match.symbol
Match.date
Match.record
Match.defined
Match.nonEmptyString
Match.instanceOf(...)
Match.is(...)
```

Cases are ordered; the first matching case wins.

The module also includes `whenOr`, `whenAnd`, and `not` for composing pattern
conditions.

### 3. Tagged unions

For the conventional Effect `_tag` discriminant:

```ts
type RequestState =
  | { _tag: "Idle" }
  | { _tag: "Loading" }
  | { _tag: "Success"; data: string }
  | { _tag: "Error"; message: string }
```

you can write:

```ts
const describe =
  Match.type<RequestState>().pipe(
    Match.tagsExhaustive({
      Idle: () => "Nothing requested",
      Loading: () => "Loading…",
      Success: ({ data }) =>
        `Loaded: ${data}`,
      Error: ({ message }) =>
        `Error: ${message}`
    })
  )
```

`tagsExhaustive` requires one handler for every possible `_tag` value.

Related APIs include:

```ts
Match.tag(...)
Match.tags(...)
Match.tagStartsWith(...)
```

For a custom discriminator field rather than `_tag`, Match also provides:

```ts
Match.discriminator(...)
Match.discriminators(...)
Match.discriminatorsExhaustive(...)
```

### 4. Completion

#### exhaustive

```ts
Match.exhaustive
```

requires every input case to be covered. If a case remains, TypeScript rejects
the finalization.

#### option

```ts
Match.option
```

turns unmatched input into:

```ts
Option.none()
```

and matched output into:

```ts
Option.some(output)
```

#### result

```ts
Match.result
```

returns:

```ts
Result.success(output)
```

for a match and preserves the unmatched input itself as:

```ts
Result.failure(unmatchedInput)
```

#### orElse

```ts
Match.orElse((remaining) => ...)
```

acts like a default branch and always produces a concrete output.

There is also:

```ts
Match.orElseAbsurd
```

which throws if an unmatched input reaches runtime and is intended for cases
where that situation should be impossible.

## Real Effect 4 APIs used

The source includes:

- `Match.value`
- `Match.type`
- `Match.when`
- `Match.string`
- `Match.number`
- `Match.boolean`
- object patterns
- `Match.tagsExhaustive`
- `Match.exhaustive`
- `Match.option`
- `Match.result`
- `Match.orElse`
- `Option`
- `Result`
