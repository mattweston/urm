# Effect 4 Effect — Foldkit core visual demo

## What this lesson is for

This is the **hub** demo for the core `Effect` type.

The other lessons you've added — Fiber, Layer, Queue, Schedule, Scope,
TaggedError, yield\*, etc. — go deeper on individual capabilities.

This one keeps the core mental model visible:

```ts
Effect<A, E, R>
```

where:

- `A` = success value
- `E` = recoverable typed error
- `R` = required services

An Effect is a **lazy description of work**. Creating or composing one does not
run it. A Runtime executes it at the edge of the program.

## The four sections

### 1. Channels — `Effect<A, E, R>`

Pure success:

```ts
Effect.succeed(42)
// Effect<number, never, never>
```

Typed failure:

```ts
Effect.fail(
  new ParseError({ input: "oops" })
)
// Effect<never, ParseError, never>
```

Service requirement:

```ts
Effect.gen(function* () {
  const config = yield* Config
  return config.prefix
})
// Effect<string, never, Config>
```

Both:

```ts
Effect<string, ParseError, Config>
```

A useful reading is:

```text
This program can:
  succeed with A
  fail with E
  require R
```

`never` means that channel contains nothing.

## 2. Build — constructors are lazy descriptions

### succeed

```ts
Effect.succeed(42)
```

Represents an already available successful value.

### sync

```ts
Effect.sync(() => {
  // synchronous side effect
  return value
})
```

The thunk is not evaluated until the Effect is run.

### try

Wrap synchronous code that can throw:

```ts
Effect.try({
  try: () => JSON.parse(input),
  catch: () =>
    new ParseError({ input })
})
```

Thrown values are moved into the typed `E` channel.

### promise

```ts
Effect.promise(
  () => Promise.resolve(value)
)
```

For promise work that is expected not to reject.

### tryPromise

```ts
Effect.tryPromise({
  try: () => fetch(...),
  catch: (cause) =>
    new RequestError({ cause })
})
```

The promise thunk starts only when the Effect runs. Throws / rejections are
mapped into the Effect error channel.

The async constructors receive an `AbortSignal` so interruptible external APIs
can observe Effect cancellation.

## 3. Compose

### map

Transform the success value:

```ts
effect.pipe(
  Effect.map((value) => ...)
)
```

`map` cannot introduce a new Effect error or service requirement because its
callback returns a plain value.

### flatMap

Sequence another Effect:

```ts
effect.pipe(
  Effect.flatMap((value) =>
    nextEffect(value)
  )
)
```

If the next Effect has:

```ts
Effect<B, E2, R2>
```

the combined Effect accumulates both sides:

```text
A → B
E → E | E2
R → R | R2
```

### gen

Generator syntax for the same sequential composition:

```ts
Effect.gen(function* () {
  const age =
    yield* parseAge(input)

  const validAge =
    yield* validateAge(age)

  return `age:${validAge}`
})
```

Each `yield*` unwraps the success value while `Effect.gen` keeps accumulating
the error and service channels.

### all

Combine independent effects:

```ts
Effect.all({
  user: Effect.succeed("Ada"),
  age: parseAge("36")
})
```

The success values are rebuilt into the same tuple / struct shape and errors /
service requirements are combined.

`Effect.all` also supports concurrency options; the dedicated Fiber / Queue
lessons are better places to go deeper on concurrency.

## 4. Handle / Provide / Run

Start with:

```ts
Effect<string, ParseError, Config>
```

### Handle an error

```ts
program.pipe(
  Effect.catchTag(
    "ParseError",
    () => Effect.succeed("fallback")
  )
)
```

If that completely handles `ParseError`, the type becomes:

```ts
Effect<string, never, Config>
```

### Provide a service

```ts
program.pipe(
  Effect.provide(ConfigLive)
)
```

Supplying the `Config` Layer removes it from the requirement channel:

```ts
Effect<string, never, never>
```

At this point the program is fully provided and can cross into a Runtime.

### Run as Promise

```ts
Effect.runPromise(program)
```

returns:

```ts
Promise<A>
```

Typed Effect failure becomes Promise rejection.

### Run as Exit

```ts
Effect.runPromiseExit(program)
```

returns:

```ts
Promise<Exit<A, E>>
```

so the complete outcome remains data instead of becoming Promise rejection.

For synchronous Effects there are also:

```ts
Effect.runSync
Effect.runSyncExit
```

`runSync` throws if the Effect fails, dies, is interrupted, **or performs
asynchronous work**.

## Real examples in `examples/effect.ts`

The source includes:

- `Effect.succeed`
- `Effect.fail`
- `Effect.sync`
- `Effect.try`
- `Effect.promise`
- `Effect.tryPromise`
- `Effect.map`
- `Effect.flatMap`
- `Effect.gen`
- `Effect.all`
- `Effect.catchTag`
- `Effect.provide`
- `Effect.runPromise`
- `Effect.runPromiseExit`
- `Context.Service`
- `Layer.succeed`
- `Data.TaggedError`

## How this fits the other demos

This core lesson intentionally stops before going deep into:

- **Fiber** — execution and concurrency
- **Layer** — service construction / dependency graphs
- **Scope** — deterministic resource lifetime
- **Schedule** — retry / repeat policy
- **Queue** — asynchronous coordination / backpressure
- **TaggedError** — domain error modeling
- **yield\*** — generator mechanics
- **Cluster** — distributed entities and sharding

Those are much easier to understand after `A / E / R` is clear.
