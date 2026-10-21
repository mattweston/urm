# Clock

Based on:

- <https://effect.website/docs/v4/api/effect/Clock>

## Current v4 Clock surface

The public `effect/Clock` module is intentionally small:

```ts
Clock.Clock
Clock.clockWith
Clock.currentTimeMillis
Clock.currentTimeNanos
Clock.monotonicTimeNanos
```

The `Clock.Clock` service also contains:

```ts
currentTimeMillisUnsafe()
currentTimeNanosUnsafe()
monotonicTimeNanosUnsafe()

currentTimeMillis
currentTimeNanos
monotonicTimeNanos

sleep(duration)
```

`monotonicTimeNanos` is part of the v4 Clock contract and is the important
addition for elapsed-time measurement.

## Mental model

Clock separates two very different concepts:

```text
wall clock
  Unix timestamp
  suitable for timestamps / persistence
  may jump because the system clock can be corrected

monotonic clock
  arbitrary origin
  suitable for elapsed durations
  never meaningful as a persisted timestamp
```

Then:

```text
Effect.sleep
```

uses the active Clock service for scheduling.

Because Clock is a service, tests can replace real time with controlled time.

# 1. Wall time

Milliseconds:

```ts
const millis =
  yield* Clock.currentTimeMillis
```

Type:

```ts
number
```

This is Unix time in milliseconds.

Nanoseconds:

```ts
const nanos =
  yield* Clock.currentTimeNanos
```

Type:

```ts
bigint
```

This is Unix wall-clock time in nanoseconds.

Use wall time for:

- created-at timestamps
- request timestamps
- expiration timestamps stored externally
- logging time
- serialization / protocol timestamps

## Do not measure elapsed duration with wall time

The system's wall clock may move because of:

- NTP correction
- user clock changes
- VM / host clock adjustments

So this is conceptually unsafe:

```ts
const start =
  yield* Clock.currentTimeMillis

yield* work

const elapsed =
  (yield* Clock.currentTimeMillis) -
  start
```

because the wall clock can jump.

# 2. Monotonic time

Use:

```ts
Clock.monotonicTimeNanos
```

to measure duration:

```ts
const start =
  yield* Clock.monotonicTimeNanos

yield* work

const end =
  yield* Clock.monotonicTimeNanos

const elapsed =
  end - start
```

The origin is arbitrary.

That means a reading such as:

```text
932845902345n
```

does not mean a date/time.

Only subtraction of readings from the **same Clock** is meaningful.

Do not:

- serialize a monotonic reading
- store it as a created-at timestamp
- compare readings produced by unrelated clock implementations

Whether monotonic time advances while the host machine is suspended depends on
the runtime/platform.

# 3. `Effect.sleep`

Application code normally writes:

```ts
yield* Effect.sleep(
  "750 millis"
)
```

rather than looking up the Clock service just to call `sleep`.

Internally that operation delegates to the active:

```ts
Clock.Clock
```

service.

So replacing Clock affects:

```text
current time
monotonic time
sleep scheduling
```

as one coherent time service.

That is why deterministic TestClock can advance sleepers without waiting in
real time.

# 4. Full service access

When several operations need one Clock object, use:

```ts
Clock.clockWith(
  clock =>
    ...
)
```

Example:

```ts
const snapshot =
  Clock.clockWith(
    clock =>
      Effect.sync(
        () => ({
          millis:
            clock
              .currentTimeMillisUnsafe(),

          wallNanos:
            clock
              .currentTimeNanosUnsafe(),

          monotonicNanos:
            clock
              .monotonicTimeNanosUnsafe()
        })
      )
  )
```

This can be useful in low-level infrastructure where the full service interface
is needed.

Most application code should prefer the individual safe Effect accessors.

# 5. Unsafe accessors

The service exposes synchronous methods:

```ts
clock.currentTimeMillisUnsafe()
clock.currentTimeNanosUnsafe()
clock.monotonicTimeNanosUnsafe()
```

They are not global Clock module functions.

First acquire the service:

```ts
const clock =
  yield* Clock.Clock
```

or use:

```ts
Clock.clockWith(...)
```

Use unsafe reads when:

- you already own the Clock service
- synchronous access is required
- you deliberately do not need Effect composition around that read

The normal Effect values remain the default.

# 6. Replace Clock as a service

A custom Clock implements:

```ts
Clock.Clock
```

Example from the demo:

```ts
const fixedClock:
  Clock.Clock = {
    currentTimeMillisUnsafe:
      () => 1000,

    currentTimeMillis:
      Effect.succeed(1000),

    currentTimeNanosUnsafe:
      () => 1_000_000_000n,

    currentTimeNanos:
      Effect.succeed(
        1_000_000_000n
      ),

    monotonicTimeNanosUnsafe:
      () => 500_000_000n,

    monotonicTimeNanos:
      Effect.succeed(
        500_000_000n
      ),

    sleep:
      () => Effect.void
  }
```

Provide it:

```ts
Effect.provideService(
  program,
  Clock.Clock,
  fixedClock
)
```

Now the program sees deterministic time.

The custom service controls sleep semantics as well.

# 7. `Clock.Clock` is a Context.Reference

In v4:

```ts
Clock.Clock
```

is the Context reference for the active Clock service.

Services are Effects in v4, so this works:

```ts
const program =
  Effect.gen(function* () {
    const clock =
      yield* Clock.Clock

    return clock
      .currentTimeMillisUnsafe()
  })
```

The old public Clock type-id is not the service-access mechanism in v4.

# 8. Testing with `TestClock`

The controlled testing implementation lives under:

```ts
import {
  TestClock
} from "effect/testing"
```

Install:

```ts
Effect.provide(
  program,
  TestClock.layer()
)
```

The default test clock begins at the Unix epoch.

## Adjust

```ts
yield* TestClock.adjust(
  "5 seconds"
)
```

moves controlled time forward and executes sleepers scheduled on or before the
new time.

Example:

```ts
const sleeper =
  yield* Effect.sleep(
    "5 seconds"
  ).pipe(
    Effect.as("done"),
    Effect.forkChild
  )

yield* TestClock.adjust(
  "5 seconds"
)

const result =
  yield* Fiber.join(
    sleeper
  )
```

No real five-second delay is required.

This is the core benefit: tests depending on time remain fast and
deterministic.

## Set absolute test wall time

```ts
yield* TestClock.setTime(
  timestampMillis
)
```

This sets the test clock to a specific timestamp and runs scheduled operations
that are now due.

## Temporarily use live time

v4 also exposes:

```ts
TestClock.withLive(
  effect
)
```

which runs that effect using the live Clock even while the surrounding test
uses TestClock.

That is useful when test infrastructure itself needs a real delay / time read.

# 9. Test runner integration

`@effect/vitest`'s:

```text
it.effect
```

runs tests with Effect testing services such as TestClock automatically
available.

`it.live` runs with the live Effect environment instead.

You can also explicitly provide:

```ts
TestClock.layer()
```

when constructing tests yourself.

# 10. Wall nanos implementation note

The current live Clock's:

```ts
currentTimeNanos
```

tracks Unix wall time at nanosecond precision using a high-resolution clock
anchored to `Date.now()`.

The implementation permits up to roughly one second of drift from `Date.now()`
before re-anchoring.

That is another reason not to treat wall nanos as the monotonic elapsed-time
source.

Use:

```ts
monotonicTimeNanos
```

for durations.

# Clock vs DateTime

Use Clock when you need:

```text
what time is it?
how much time elapsed?
sleep / scheduling
controlled test time
```

Use Effect `DateTime` when you need richer calendar/time-zone operations such
as:

```text
dates
calendar fields
zones
formatting
date arithmetic
```

Clock is the time source.

DateTime is the date/time value toolkit.

# Clock and Foldkit

Inside Foldkit, reading time or sleeping is Effect work.

That means the normal boundary is typically a Command:

```text
Message
  ↓
update
  ↓
Command
  ↓
Clock / Effect.sleep
  ↓
result Message
```

The downloadable demo uses real Commands for:

- reading wall time
- measuring elapsed monotonic time
- sleeping
- reading a provided fixed Clock

This keeps Foldkit `update` pure.

# Real Effect 4 APIs used

The bundle uses:

- `Clock.Clock`
- `Clock.clockWith`
- `Clock.currentTimeMillis`
- `Clock.currentTimeNanos`
- `Clock.monotonicTimeNanos`
- Clock service unsafe accessors
- Clock service `sleep`
- `Effect.sleep`
- `Effect.provideService`
- `TestClock.layer`
- `TestClock.adjust`

The README also covers:

- `TestClock.setTime`
- `TestClock.withLive`
- `@effect/vitest` integration
- wall time vs monotonic time
- custom Clock implementations
