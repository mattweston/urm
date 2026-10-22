# Metric

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/Metric

The current Effect source package is `4.0.0-rc.116`.

The current `packages/effect/src/Metric.ts` source exposes **51 public exports**.

## Public surface

### Models / state

- `Metric`
- `Counter`
- `CounterState`
- `Frequency`
- `FrequencyState`
- `Gauge`
- `GaugeState`
- `Histogram`
- `HistogramState`
- `Summary`
- `SummaryState`
- `Type`
- `Attributes`
- `AttributeSet`
- `Input`
- `State`
- `Hooks`
- `Metadata`
- `SnapshotProto`
- `Snapshot`

### Services / registry

- `CurrentMetricAttributesKey`
- `CurrentMetricAttributes`
- `MetricRegistry`

### Guards / constructors

- `isMetric`
- `counter`
- `gauge`
- `frequency`
- `histogram`
- `summary`
- `summaryWithTimestamp`
- `timer`

### Reading / recording / transforms

- `value`
- `modify`
- `update`
- `mapInput`
- `withConstantInput`
- `withAttributes`

### Registry observation

- `snapshot`
- `dump`
- `snapshotUnsafe`

### Histogram boundaries

- `boundariesFromIterable`
- `linearBoundaries`
- `exponentialBoundaries`

### Fiber runtime metrics

- `FiberRuntimeMetricsKey`
- `FiberRuntimeMetricsService`
- `FiberRuntimeMetrics`
- `FiberRuntimeMetricsImpl`
- `enableRuntimeMetricsLayer`
- `disableRuntimeMetricsLayer`
- `enableRuntimeMetrics`
- `disableRuntimeMetrics`

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `metric.ts` — real counters, gauges, frequencies, histograms, summaries,
  timers, updates, attributes, snapshots, and runtime-metric configuration.
- `metric.view.ts` — interactive visual demo.

## Intended location

```text
packages/features/src/labs/metric/
├── metric.ts
└── metric.view.ts
```

No parent router/model/message/update files are modified.

## Core idea

A Metric has two primary type channels:

```ts
Metric.Metric<
    Input,
    State
>
```

`Input` is what callers record.

`State` is the aggregated value readers observe.

For example:

```text
Counter<number>
    number → CounterState<number>

Gauge<number>
    number → GaugeState<number>

Frequency
    string → FrequencyState

Histogram<number>
    number → HistogramState

Summary<number>
    number → SummaryState
```

This lets Effect expose one common recording / reading API while each metric
family owns different aggregation semantics.

## 1. Types

Effect documents five primitive metric types:

```text
Counter
Gauge
Frequency
Histogram
Summary
```

`timer` is a convenience constructor built on top of a Histogram.

### `counter`

```ts
Metric.counter(
    "requests"
)
```

returns a number counter by default.

Pass:

```ts
{
    bigint: true
}
```

for a `bigint` counter.

A counter state contains:

```text
count
incremental
```

By default counters can accept positive and negative deltas.

When:

```ts
{
    incremental: true
}
```

negative updates are ignored and the counter only increases.

### `gauge`

A Gauge stores an instantaneous value.

```ts
Metric.gauge(
    "queue_size"
)
```

also supports:

```ts
{
    bigint: true
}
```

for bigint input / state.

The state is:

```text
{
    value
}
```

The important mutation distinction is:

```text
update
    set absolute gauge value

modify
    add a relative delta
```

### `frequency`

```ts
Metric.frequency(
    "status_codes"
)
```

accepts string inputs.

Its state contains:

```text
ReadonlyMap<
    string,
    number
>
```

under:

```ts
state.occurrences
```

Optional:

```ts
preregisteredWords
```

create zero-count entries for known values before observations arrive.

### `histogram`

```ts
Metric.histogram(
    "latency_ms",
    {
        boundaries:
            [...]
    }
)
```

records numerical observations into buckets.

Its state also tracks:

```text
count
min
max
sum
```

along with the bucket counts.

### `summary`

```ts
Metric.summary(
    "response_time",
    {
        maxAge:
            "1 minute",
        maxSize:
            100,
        quantiles:
            [
                0.5,
                0.9,
                0.99
            ]
    }
)
```

stores a bounded sliding window of recent observations and exposes calculated
quantiles.

The window is limited by:

```text
maxAge
maxSize
```

### `summaryWithTimestamp`

The lower-level timestamped variant accepts:

```text
[value, timestamp]
```

pairs explicitly.

Normal `summary` is implemented by adapting number input into that pair using
the current Clock.

### `timer`

```ts
Metric.timer(
    "request_duration"
)
```

accepts:

```text
Duration.Duration
```

and records milliseconds into a Histogram.

It automatically adds:

```text
time_unit = milliseconds
```

to the metric attributes.

When custom boundaries are omitted, the source uses exponential boundaries
starting at `0.5`, doubling, with `35` requested buckets.

## Public helper types

### `Metric.Type`

The primitive runtime type discriminator is:

```text
Counter
Frequency
Gauge
Histogram
Summary
```

Timer is still a Histogram at this level.

### `Metric.Input<M>`

Extracts the input type from a Metric.

### `Metric.State<M>`

Extracts the state type from a Metric.

These can be useful when helpers are generic over a concrete Metric instance.

## 2. Record

### `update`

```ts
yield* Metric.update(
    metric,
    input
)
```

records an input using the metric's normal update semantics.

Examples:

```text
Counter
    add input to count

Gauge
    replace current value

Frequency
    increment the selected string occurrence

Histogram
    record observation

Summary
    record observation
```

`update` is dual, so pipe-friendly usage is also supported.

### `modify`

```ts
yield* Metric.modify(
    metric,
    input
)
```

uses the metric's modification hook.

The clearest distinction is Gauge:

```text
update(gauge, 20)
    value = 20

modify(gauge, 5)
    value = 25
```

For Counter, both update and modify add the supplied input.

Other metric families normally use equivalent observation semantics for both
hooks.

### `value`

```ts
const state =
    yield* Metric.value(
        metric
    )
```

reads the metric's state under the current Effect context.

Because attributes can come from the context, reading under a different
attribute context can select a different series.

## `mapInput`

```ts
const fromString =
    Metric.mapInput(
        latencyHistogram,
        (
            input: string
        ) =>
            Number(
                input
            )
    )
```

creates another Metric sharing the same underlying state semantics while
accepting a different input type.

The callback also receives the current service Context as its second argument,
which allows context-sensitive input transformation when needed.

## `withConstantInput`

```ts
const onePerEvent =
    Metric.withConstantInput(
        counter,
        1
    )
```

returns:

```text
Metric<unknown, State>
```

Every update ignores the caller's input and forwards the fixed value.

This is useful for "one event = one increment" counters.

## `isMetric`

```ts
Metric.isMetric(
    value
)
```

checks the Metric type marker.

## 3. Attributes

Metrics support dimensions / labels through string attributes.

### Attribute forms

The public `Attributes` type accepts either:

```ts
{
    service:
        "api",
    region:
        "eu-west"
}
```

or:

```ts
[
    [
        "service",
        "api"
    ],
    [
        "region",
        "eu-west"
    ]
]
```

The normalized `AttributeSet` form is the record representation.

## `withAttributes`

```ts
const production =
    Metric.withAttributes(
        requestCounter,
        {
            environment:
                "production"
        }
    )
```

returns another Metric view that automatically applies those dimensions to
every read / update / modify operation.

Different attribute values produce different metric series.

For example:

```text
requests{environment=production}
requests{environment=staging}
```

share the same logical metric definition but hold separate state in the
registry.

## `CurrentMetricAttributes`

The context reference:

```ts
Metric.CurrentMetricAttributes
```

adds attributes for an entire region of Effect code.

For example:

```ts
yield* Effect.provideService(
    Metric.update(
        requestCounter,
        1
    ),
    Metric.CurrentMetricAttributes,
    {
        environment:
            "staging",
        region:
            "eu-west"
    }
)
```

The contextual attributes are merged with the Metric's own attributes.

This is useful when many metrics should share dimensions such as:

```text
tenant
region
deployment
environment
request route
```

without wrapping every Metric individually.

### `CurrentMetricAttributesKey`

The corresponding key constant is:

```text
effect/Metric/CurrentMetricAttributes
```

## `MetricRegistry`

Metric state is stored in the registry service:

```text
Map<
    string,
    Metric.Metadata<...>
>
```

The default reference creates a fresh empty Map when first resolved.

Metric metadata / hooks are registered lazily when the Metric is read or
updated.

Series identity includes:

```text
type
id
description
attributes
```

so attribute combinations select independent registry entries.

## `Metadata` and `Hooks`

`Metadata` describes a registered metric series and its operations.

`Hooks<Input, State>` owns:

```text
get
update
modify
```

for that series.

These are lower-level model types; normal application code typically uses:

```text
Metric.update
Metric.modify
Metric.value
```

rather than calling hooks directly.

## 4. Observe

### `boundariesFromIterable`

```ts
Metric.boundariesFromIterable(
    [
        -5,
        0,
        10,
        10,
        25
    ]
)
```

produces:

```text
10
25
Infinity
```

The source:

1. removes duplicates,
2. filters non-positive boundaries,
3. appends positive Infinity.

### `linearBoundaries`

```ts
Metric.linearBoundaries({
    start:
        10,
    width:
        20,
    count:
        5
})
```

produces:

```text
10
30
50
70
Infinity
```

The implementation generates `count - 1` candidates and then uses the same
normalization path.

### `exponentialBoundaries`

```ts
Metric.exponentialBoundaries({
    start:
        1,
    factor:
        2,
    count:
        5
})
```

produces:

```text
1
2
4
8
Infinity
```

This is useful for observations spanning several orders of magnitude.

## `snapshot`

```ts
const snapshots =
    yield* Metric.snapshot
```

returns:

```text
ReadonlyArray<
    Metric.Snapshot
>
```

Each Snapshot carries metadata plus the current state.

`Snapshot` is a discriminated union keyed by the primitive metric `type`, so
consumers can narrow to the matching state shape.

## `snapshotUnsafe`

```ts
Metric.snapshotUnsafe(
    context
)
```

is the low-level synchronous variant.

Use it when an integration already owns an explicit service Context.

For normal Effect code, use `snapshot`.

## `dump`

```ts
const report =
    yield* Metric.dump
```

formats all currently registered series into a human-readable text table.

It includes information such as:

```text
name
description
type
attributes
state
```

and groups / sorts output by metric name.

This is primarily a debugging / inspection surface.

## Fiber runtime metrics

Effect also supports optional automatic metrics for child Fiber lifecycle
events.

The service is:

```ts
Metric.FiberRuntimeMetrics
```

with public implementation:

```ts
Metric.FiberRuntimeMetricsImpl
```

and key:

```ts
Metric.FiberRuntimeMetricsKey
```

The service has hooks for:

```text
recordFiberStart
recordFiberEnd
```

The default implementation updates four internal metrics:

```text
child_fibers_active
child_fibers_started
child_fiber_successes
child_fiber_failures
```

## Enabling runtime metrics

For one Effect:

```ts
Metric.enableRuntimeMetrics(
    program
)
```

For an application Layer:

```ts
Metric.enableRuntimeMetricsLayer
```

## Disabling runtime metrics

For one Effect:

```ts
Metric.disableRuntimeMetrics(
    program
)
```

For a Layer:

```ts
Metric.disableRuntimeMetricsLayer
```

Disabling runtime Fiber metrics does **not** disable manually-created application
metrics.

It only removes the optional automatic Fiber lifecycle service.

## Metric versus Effect tracking helpers

The `Metric` module owns:

```text
definitions
updates
reads
attributes
registry
runtime-metric service
```

Effect also exposes tracking combinators such as:

```text
Effect.trackSuccesses
Effect.trackDuration
```

that can feed Effect results / timing into Metrics.

The Metric demo deliberately teaches the lower-level `Metric.update` /
`Metric.value` API first because it makes each Metric's input and state channels
explicit.

## Relationship to Logger

`Logger` records event-like diagnostic messages.

`Metric` accumulates numerical / categorical state intended for observation
over time.

A typical application uses both:

```text
Logger
    what happened?
    include contextual diagnostic detail

Metric
    how often?
    how many?
    how large?
    how long?
    what distribution?
```

They share observability context but solve different questions.

## Type discipline

The generated demo has no explicit `any` annotations.

Every Metric mapping callback, boundary formatter, registry row callback,
Message payload, and UI callback that could lose contextual typing has an
explicit type.

Button attributes are derived from `HtmlBuilder`.

The upstream Effect implementation itself uses internal generic `any` types in
some signatures; that is separate from the generated artifact constraint.

## Validation note

The standalone validation command is:

```text
tsc --noEmit --noResolve --allowImportingTsExtensions
    --target ES2022
    --module ESNext
    --moduleResolution bundler
    --skipLibCheck
    --noImplicitAny
```

In this environment the actual `effect`, `foldkit`, and UI packages are not
resolved, so this check catches local syntax and implicit-any issues rather than
replacing a full typecheck inside the target monorepo.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/labs/*` demos:

1. add the child Model to the parent learn Model,
2. add `MetricDemo.Message` to the parent Message union,
3. initialize `MetricDemo.init`,
4. delegate child messages to `MetricDemo.update`,
5. render `MetricDemo.view(...)` from the Metric route.

This artifact intentionally performs none of those edits.
