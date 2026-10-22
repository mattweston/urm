# Sink

Standalone Foldkit teaching demo for `effect/Sink`.

- Intended repository location: `packages/features/src/learn/_sink/`
- Repository scaffold remains untouched (`README.md`, `x.ts`, `x.view.ts` remain empty in git).
- Generated artifacts live only in `/mnt/data/sink/`.
- Workspace Effect version: `4.0.0-rc.112`.
- Live Effect API page checked during generation: `4.0.0-rc.117`.
- Live API page count: **80 exports / entries**.
- The rc.112 and rc.117 sources expose the same top-level public names; rc.117 includes behavior fixes around count normalization and leftover preservation.

## Teaching shape

The lesson uses four stages:

1. **Construct** — choose a sink by consumption shape (`collect`, `sum`, `head`, effects, channels).
2. **Reduce** — distinguish full-consumption reducers from early-stopping folds/searches.
3. **Leftovers** — understand `End`, `take`, `takeWhile`, `flatMap`, and deliberate leftover discarding.
4. **Compose** — map results, recover errors, attach finalizers, and provide services without confusing result transformation with input sequencing.

The Foldkit `Model` stores only stage/case selections. Live `Sink`, `Stream`, `Effect`, `Channel`, queue, and service values stay at the runtime boundary.

## Public API families

The live docs surface 80 API entries. The source groups the public surface into these families.

### Models

- `Sink`
- `End`
- `SinkUnify`
- `SinkUnifyIgnore`
- `Sink.Variance`
- `Sink.VarianceStruct`
- `make.Constructor`

### Guards

- `isSink`

### Constructors / ready-made consumers

- `fromChannel`
- `fromWritableStream`
- `fromTransform`
- `toChannel`
- `make`
- `fromEffectEnd`
- `fromEffect`
- `fromQueue`
- `fromPubSub`
- `succeed`
- `sync`
- `suspend`
- `fail`
- `failSync`
- `failCause`
- `failCauseSync`
- `die`
- `never`
- `drain`
- `every`
- `some`
- `take`
- `head`
- `last`
- `find`
- `findEffect`
- `sum`
- `count`
- `collect`
- `takeWhile`
- `takeWhileFilter`
- `takeWhileEffect`
- `takeWhileFilterEffect`
- `takeUntil`
- `takeUntilEffect`
- `forEach`
- `forEachArray`
- `forEachWhile`
- `forEachWhileArray`
- `unwrap`
- `timed`

### Folding

- `fold`
- `foldArray`
- `foldUntil`
- `reduceWhile`
- `reduceWhileEffect`
- `reduceWhileArray`
- `reduceWhileArrayEffect`
- `reduce`
- `reduceArray`
- `reduceEffect`

### Mapping / input adaptation

- `map`
- `as`
- `mapInput`
- `mapInputEffect`
- `mapInputArray`
- `mapInputArrayEffect`
- `mapEnd`
- `mapEffectEnd`
- `mapEffect`
- `mapError`
- `mapLeftover`
- `summarized`
- `withDuration`

### Sequencing / filtering

- `flatMap`
- `ignoreLeftover`

### Error handling

- `orElse`
- `catch`
- `catchCause`

### Service provisioning

- `provideContext`
- `provideService`

### Resource management

- `onExit`
- `ensuring`

## Core type model

A sink has five important type parameters:

```ts
Sink<A, In, L, E, R>
```

Read them as:

```text
A  = final result
In = input element type consumed from Stream
L  = leftover element type returned after early completion
E  = typed failure
R  = required services
```

The runtime completion shape is:

```ts
End<A, L> = readonly [
  value: A,
  leftover?: NonEmptyReadonlyArray<L>
]
```

This is the part that makes Sink more than “a reducer”. A sink can finish after pulling more input than it ultimately consumes and hand the remainder to the next consumer.

## Full-consumption vs early-completion sinks

Some sinks need upstream termination to produce a result:

- `collect`
- `sum`
- `count`
- `last`
- `reduce`
- `reduceArray`
- `drain`

These do not finish on an infinite stream unless upstream is otherwise cut off.

Other sinks can finish early:

- `head`
- `find`
- `take`
- `takeWhile`
- `takeUntil`
- `fold`
- `foldUntil`
- `reduceWhile`
- `every`
- `some`

When an early sink stops in the middle of a pulled array, it may return the unconsumed tail as leftovers.

## `take` and leftovers

For an input pull conceptually containing:

```text
[1, 2, 3, 4]
```

`Sink.take(2)` completes with:

```text
result   = [1, 2]
leftover = [3, 4]
```

The leftover is not part of the normal `Stream.run` result; it matters when sinks are composed internally, especially through `flatMap`.

### rc.117 count normalization

The live rc.117 implementation normalizes count arguments for `take` and `foldUntil`:

```text
NaN / non-positive -> 0
positive fraction  -> floor(value)
Infinity           -> Infinity
```

The rc.112 source used the raw number directly. The lesson code remains rc.112-compatible; this note explains current live behavior.

## `takeWhile` consumes the failing element

This is the most important boundary gotcha in the module.

For:

```text
input:     [1, 2, 3, 4]
predicate: n < 3
```

`takeWhile` produces conceptually:

```text
result:          [1, 2]
consumed failure: 3
leftover:        [4]
```

The first failing value is **consumed and excluded**. Only later values from the same pulled array are returned as leftovers.

The same consuming-boundary rule applies to the effectful/filter variants described by the live API docs.

Do not use `takeWhile` when the boundary element itself must be replayed by the next stage.

## `flatMap` and leftover handoff

`flatMap` runs the first sink, creates the second sink from its result, and feeds first-sink leftovers to the second sink **before pulling more upstream input**.

Conceptually:

```ts
const sink = Sink.flatMap(
    Sink.take(2),
    () => Sink.take(1)
)
```

with `[1, 2, 3, 4]` means the second sink sees `3` from the first sink's leftovers before requesting additional stream input.

### rc.117 leftover preservation fix

The rc.117 implementation also preserves any portion of the first leftover that remains after the second sink finishes. The rc.112 implementation fed the first leftover into the second sink but did not merge an unconsumed remainder back into the final `End`.

This matters for multi-stage sink protocols that stop repeatedly inside a single upstream chunk.

## `head`, `find`, and `last`

`head()` returns `Option.some(first)` as soon as the first element is available. Later values from the same pull are leftovers.

`find(predicate)` consumes through the matching element, returns it, and leaves later values from that pulled array.

`last()` is different: it must consume the whole upstream before it knows the answer, so it cannot finish on a non-ending stream.

## Folding choices

Use `reduce` when every input must be consumed:

```ts
const product = Sink.reduce(
    () => 1,
    (state: number, input: number) => state * input
)
```

Use `fold` when the updated state can stop consumption:

```ts
const bounded = Sink.fold(
    () => 0,
    (state: number) => state < 10,
    (state: number, input: number) =>
        Effect.succeed(state + input)
)
```

Element-level `fold` can return leftovers when it stops mid-pull. `foldArray` works one pulled non-empty array at a time, so it does not expose the same element-level leftover boundary.

## Mapping vs sequencing

`map` changes only the final result:

```ts
const labelled = Sink.map(
    Sink.sum,
    (total: number) => `sum=${total}`
)
```

It preserves input consumption, leftovers, errors, and service requirements.

`flatMap` is different: it runs another sink, so it changes the consumption protocol and must coordinate leftovers.

Use `mapEffect` when only result transformation is effectful. Use `flatMap` only when another consumer must run.

## Recovery and lifecycle

- `orElse` switches to another sink after a typed failure and can continue on the same upstream when the upstream has not already ended.
- `catch` recovers a typed error into an effectful replacement result.
- `catchCause` receives the full `Cause`.
- `onExit` runs after success, failure, or interruption and receives the sink-result `Exit`.
- `ensuring` runs a finalizer on every exit.
- `withDuration` preserves the sink result and pairs it with elapsed duration.
- `timed` drains input and returns only elapsed duration.

## Services

`provideContext` and `provideService` satisfy service requirements of the sink transform effect without changing the input/leftover protocol.

Keep those services outside the Foldkit model. The model in this lesson contains only:

```text
stage
constructCase
reduceCase
leftoversCase
composeCase
```

## Lower-level construction

Most application code should use the ready-made sinks and combinators.

Use these only when needed:

- `fromTransform` — directly implement the upstream pull / scope transform.
- `fromChannel` / `toChannel` — bridge to lower-level Channel composition.
- `make` — build a sink via a Stream pipeline ending in an Effect.
- `fromWritableStream` — bridge to Web `WritableStream`.

These expose more of the pull/leftover protocol and therefore carry more correctness responsibility.

## Real programs included in `sink.ts`

### `collect_program`

Runs `collect`, `sum`, `count`, and `head` against finite streams.

### `reduce_program`

Shows pure reduction, bounded `foldUntil`, and `find`.

### `leftover_program`

Sequences `take` and `takeWhile` through `flatMap` so the examples show how leftovers feed the next sink.

### `compose_program`

Shows result mapping, typed recovery, and timing.

## Workspace vs live source

Workspace pin: `4.0.0-rc.112`.

Live page during generation: `4.0.0-rc.117`.

The public top-level names are stable between those source snapshots. Notable implementation changes in rc.117:

- count normalization was introduced for `take` and `foldUntil` through internal count helpers;
- `flatMap` now preserves first-sink leftover that remains after the second sink finishes.

The generated TypeScript intentionally uses APIs available in rc.112.

## Validation

Generated files were checked with:

```sh
tsc --noEmit \
  --noResolve \
  --allowImportingTsExtensions \
  --target ES2022 \
  --module ESNext \
  --moduleResolution bundler \
  --skipLibCheck \
  --noImplicitAny \
  sink.ts sink.view.ts
```

The only diagnostics are the expected unresolved workspace imports (`effect`, `foldkit`, `foldkit/message`, `foldkit/struct`, `@foldkit/ui`, `foldkit/html`) caused by validating these standalone files outside the repository dependency graph.

No explicit TypeScript `any` annotations are present in the generated lesson files.

## References used

- Live Effect v4 `Sink` API page.
- Workspace vendored `.context/effect/packages/effect/src/Sink.ts`.
- Upstream `effect@4.0.0-rc.112` and `effect@4.0.0-rc.117` source comparison.
- Upstream rc.117 internal count normalization helper.
- `.context/foldkit` conventions plus the neighboring generated Foldkit lesson artifacts.
