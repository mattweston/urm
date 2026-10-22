# Duration

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/Duration

The checked API reference currently lists 57 exports. The implementation was
also checked against `packages/effect/src/Duration.ts` on Effect's current main
branch.

## Files

- `duration.ts` — real Duration snapshots plus Foldkit Model / Message / update.
- `duration.view.ts` — interactive Foldkit teaching UI.
- `duration-preview.png` — static preview of the default Build stage.

## Intended location

```text
packages/features/src/labs/duration/
├── duration.ts
└── duration.view.ts
```

No parent router/model/message/update files are modified by this package.

## Teaching stages

### 1. Build

Switch between several real `Duration.Input` shapes:

- `"90 seconds"`
- `{ minutes: 1, seconds: 30, milliseconds: 250 }`
- `1_500_000_001n`
- `"Infinity"`
- invalid input

The safe constructor is used:

```ts
Duration.fromInput(input)
```

so invalid external data becomes `Option.none()`.

The panel also exposes the public `DurationValue` representation:

```text
Millis
Nanos
Infinity
NegativeInfinity
```

APIs covered include the ordinary unit constructors, `fromInput`,
`fromInputUnsafe`, `zero`, `infinity`, and `negativeInfinity`.

### 2. Convert

Shows four values:

- a complex multi-unit duration
- a sub-millisecond nanosecond duration
- positive infinity
- a negative duration

For each one the UI compares:

- `format`
- `parts`
- `toHrTime`
- `toMillis`
- `toSeconds`
- `toMinutes`
- `toHours`
- `toDays`
- `toWeeks`
- `toNanos`

The important safe boundary is visible:

```text
toNanos(finite)   -> Some(bigint)
toNanos(Infinity) -> None
```

`toNanosUnsafe` is therefore only appropriate when the caller already knows the
duration is finite.

### 3. Math

Interactive arithmetic cases:

- sum
- subtract into a negative result
- multiply
- safe divide
- signed infinity

This stage covers:

- `sum`
- `subtract`
- `times`
- `divide`
- `divideUnsafe`
- `abs`
- `negate`
- sign / zero / finiteness predicates

Effect v4 Duration values are not restricted to non-negative spans. Subtraction
can produce negative durations and the module contains both positive and
negative infinity.

`divide` is intentionally safer than `divideUnsafe`: invalid divisors can be
represented as `Option.none()`.

For nanosecond-backed values, bigint arithmetic means fractional multipliers or
divisors are not always valid.

### 4. Compare

A value moves below, inside, or above the inclusive window:

```text
1 second <= value <= 5 seconds
```

The UI shows:

- `Order`
- `Equivalence`
- `equals`
- `between`
- `clamp`
- `min`
- `max`
- comparison predicates

It also uses the v4 reusable strategies directly:

```ts
Duration.ReducerSum.combineAll([
    Duration.millis(250),
    Duration.seconds(1),
    Duration.millis(2500)
])

Duration.CombinerMin.combine(a, b)
Duration.CombinerMax.combine(a, b)
```

`Equivalence(Duration.seconds(5), Duration.millis(5000))` is true because
Duration equality is about the represented span, not the constructor used.

## Current API notes

`Duration.Input` includes:

- existing `Duration`
- `number` milliseconds
- `bigint` nanoseconds
- `[seconds, nanos]` hrtime tuples
- unit strings such as `"5 seconds"`
- `"Infinity"` / `"-Infinity"`
- additive `DurationObject` values

A `Duration` internally exposes one of:

```ts
type DurationValue =
    | { _tag: "Millis"; millis: number }
    | { _tag: "Nanos"; nanos: bigint }
    | { _tag: "Infinity" }
    | { _tag: "NegativeInfinity" }
```

Finite fractional millisecond input is normalized to nanosecond precision.

Signed-infinity arithmetic is explicitly defined by the module. For example:

```text
Infinity + -Infinity = 0
negate(Infinity) = -Infinity
```

## Integration expectation

Follow the same child-feature integration pattern as the neighboring
`features/labs/*` demos:

1. add the child Model to the parent learn Model,
2. add `DurationDemo.Message` to the parent Message union,
3. initialize `DurationDemo.init`,
4. delegate child messages to `DurationDemo.update`,
5. render `DurationDemo.view(...)` from the Duration route.

This artifact intentionally performs none of those edits.
