# Effect 4 Schedule — Foldkit visual demo

## Mental model

A `Schedule` is a reusable policy that decides:

- whether another recurrence should happen
- how long to wait before it happens
- what output the policy emits
- what input is used to make the next decision

The Effect 4 type is:

```ts
Schedule<Output, Input, Error, Env>
```

A Schedule does not run your Effect by itself. APIs such as `Effect.retry` and
`Effect.repeat` use the policy to control repeated execution.

## The four sections

### 1. Recurs

The most important counting detail:

```ts
Schedule.recurs(3)
```

allows **three recurrences after the initial execution**.

So with `Effect.retry` or `Effect.repeat`:

```text
initial execution + 3 recurrences = 4 maximum executions
```

The demo lets you switch between `recurs(1)`, `recurs(2)`, `recurs(3)`, and
`recurs(5)` and step through the resulting execution count.

### 2. Backoff

The demo compares three delay policies starting at 100 ms.

Fixed spacing:

```ts
Schedule.spaced("100 millis")
```

```text
100, 100, 100, 100, ...
```

Exponential:

```ts
Schedule.exponential("100 millis")
```

```text
100, 200, 400, 800, 1600, ...
```

Fibonacci:

```ts
Schedule.fibonacci("100 millis")
```

```text
100, 100, 200, 300, 500, ...
```

The source also includes:

```ts
schedule.pipe(Schedule.jittered)
```

which adds random variation to delays. This is especially useful for
distributed retries where many clients might otherwise retry at the same
instant.

### 3. Compose

Limit an existing policy:

```ts
Schedule.forever.pipe(
  Schedule.upTo({ times: 3 })
)
```

`upTo` can bound by recurrence count, elapsed duration, or both.

Sequence two policies:

```ts
Schedule.concat(
  Schedule.recurs(1),
  Schedule.spaced("1 second").pipe(
    Schedule.upTo({ times: 2 })
  )
)
```

This is useful for patterns such as:

```text
quick retry → slower retries
```

### 4. Retry / Repeat

Failure-driven execution:

```ts
Effect.retry(
  request,
  Schedule.recurs(3)
)
```

`Effect.retry` steps the Schedule after failures, so the Schedule `Input` is
the Effect's error value.

Success-driven execution:

```ts
Effect.repeat(
  task,
  Schedule.recurs(2)
)
```

`Effect.repeat` steps the Schedule after successful executions, so the
Schedule `Input` is the Effect's success value.

This distinction makes the full type easier to understand:

```ts
Schedule<Output, Input, Error, Env>
```

## Real Effect 4 APIs used

The source includes:

- `Schedule.recurs`
- `Schedule.spaced`
- `Schedule.exponential`
- `Schedule.fibonacci`
- `Schedule.jittered`
- `Schedule.forever`
- `Schedule.upTo`
- `Schedule.concat`
- `Schedule.map`
- `Effect.retry`
- `Effect.repeat`
- `Duration`
