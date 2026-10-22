# Stream

Standalone Foldkit teaching demo for `effect/Stream`.

- Intended repository location: `packages/features/src/learn/_stream/`
- Repository scaffold remains untouched (`README.md`, `x.ts`, `x.view.ts` remain empty in git).
- Generated artifacts live only in `/mnt/data/stream/`.
- Workspace Effect version: `4.0.0-rc.112`.
- Live Effect API page checked during generation: `4.0.0-rc.117`.
- Live API page count: **249 API entries**.
- Workspace rc.112 source scan: **241 unique top-level declarations**.
- Live rc.117 source scan: **246 unique top-level declarations**, adding `as`, `catchDefect`, `tapErrorTag`, `tapDefect`, and `unwrapReason` without removing rc.112 names.

## Teaching shape

The lesson uses four stages:

1. **Create** — choose a source constructor for values, Effects, iterables, async iterables, queues, pubsubs, schedules, callbacks, or lower-level pulls/channels.
2. **Transform** — distinguish one-to-one mapping from filtering and Stream-producing sequencing.
3. **Control** — bound demand and control buffering, concurrency, timing, grouping, aggregation, interruption, and multi-source behavior.
4. **Run** — choose a destructor / bridge: collect, fold, run a Sink, iterate asynchronously, or feed a queue/pubsub/web stream.

The Foldkit `Model` stores only stage/case selections. Live Stream, Effect, Sink, Queue, Scope, Schedule, Channel, Context, and platform objects stay at the runtime boundary.

## Core type model

A stream has three primary type parameters:

```ts
Stream<A, E, R>
```

Read them as:

```text
A = emitted element type
E = typed failure
R = required services
```

The source describes a program that can emit many `A` values over time. It is pull-based and uses chunks internally to amortize Effect evaluation, but most combinators operate in terms of individual elements.

## Pulling, chunking, and backpressure

A `Stream` is driven by downstream demand. Constructors such as `fromIterable`, `fromEffect`, `fromArray`, and `sync` describe sources; a destructor such as `runCollect`, `run`, or `toQueue` drives them.

Chunking is an implementation/performance boundary, not normally a semantic one. Important exceptions are APIs that explicitly expose chunks (`fromArrays`, `mapArray`, `bufferArray`, `rechunk`, `chunks`, low-level Pull/Channel interop).

For live rc.117, `fromIterable(..., { chunkSize })` documents count normalization: finite fractions floor, while `NaN` and non-positive values are treated as `1`.

## Public API families

The live page renders 249 API entries. The rc.117 source groups the public surface into these families.

### Accessors / models / utility

- `TypeId`, `Stream`, `StreamUnify`, `StreamUnifyIgnore`, `StreamTypeLambda`
- `Variance`, `VarianceStruct`, `Success`, `Error`, `Services`
- `isStream`, `DefaultChunkSize`, `HaltStrategy`
- `service`, `serviceOption`

### Constructors and source bridges

- `fromChannel`, `fromEffect`, `fromEffectDrain`, `fromEffectRepeat`, `fromEffectSchedule`
- `tick`, `fromPull`, `transformPull`, `transformPullBracket`
- `callback`, `empty`, `succeed`, `make`, `sync`, `suspend`
- `fail`, `failSync`, `failCause`, `failCauseSync`, `die`, `never`
- `fromIteratorSucceed`, `fromIterable`, `fromIterableEffect`, `fromIterableEffectRepeat`
- `fromArray`, `fromArrayEffect`, `fromArrays`
- `fromQueue`, `fromPubSub`, `fromPubSubTake`
- `fromReadableStream`, `fromAsyncIterable`, `fromSchedule`, `fromSubscription`, `fromEventListener`
- `unfold`, `paginate`, `iterate`, `range`, `unwrap`, `scoped`

### Mapping / sequencing

- `map`, `as`, `mapBoth`, `mapArray`, `mapEffect`, `mapArrayEffect`
- `mapAccum`, `mapAccumArray`, `mapAccumEffect`, `mapAccumArrayEffect`
- `flattenEffect`, `tap`, `tapBoth`, `tapSink`
- `flatMap`, `switchMap`, `flatten`, `flattenArray`, `flattenIterable`, `flattenTake`
- `drain`, `drainFork`, `concat`, `prepend`
- `pipeThroughChannel`, `pipeThroughChannelOrFail`, `pipeThrough`
- `intersperse`, `intersperseAffixes`

### Filtering / bounding

- `filter`, `filterMap`, `filterEffect`, `filterMapEffect`
- `partitionQueue`, `partitionEffect`, `partition`, `when`
- `take`, `limitBytes`, `takeRight`, `takeUntil`, `takeUntilEffect`
- `takeWhile`, `takeWhileFilter`, `takeWhileEffect`
- `drop`, `dropUntil`, `dropUntilEffect`, `dropWhile`, `dropWhileFilter`, `dropWhileEffect`, `dropRight`

### Buffering / grouping / aggregation

- `buffer`, `bufferArray`
- `chunks`, `rechunk`, `sliding`, `slidingSize`, `split`
- `grouped`, `groupedWithin`, `groupBy`, `groupByKey`, `groupAdjacentBy`
- `scan`, `scanEffect`, `collect`, `accumulate`
- `transduce`, `aggregate`, `aggregateWithin`
- `changes`, `changesWith`, `changesWithEffect`

### Repetition, timing, interruption

- `repeat`, `repeatElements`, `forever`, `schedule`
- `debounce`, `throttle`, `throttleEffect`
- `timeout`, `timeoutOrElse`
- `interruptWhen`, `haltWhen`

### Multi-stream composition

- `merge`, `mergeEffect`, `mergeResult`, `mergeLeft`, `mergeRight`, `mergeAll`
- `combine`, `combineArray`, `interleave`, `interleaveWith`
- `cross`, `crossWith`
- `zip`, `zipWith`, `zipWithArray`, `zipLeft`, `zipRight`, `zipFlatten`
- `zipWithIndex`, `zipWithNext`, `zipWithPrevious`, `zipWithPreviousAndNext`
- `zipLatest`, `zipLatestAll`, `zipLatestWith`
- `race`, `raceAll`
- `broadcast`, `broadcastN`, `share`

### Error handling

- `result`, `mapError`
- `catchCause`, `catchCauseIf`, `catchCauseFilter`
- `catchIf`, `catchFilter`, `catchTag`, `catchTags`, `catchReason`, `catchReasons`
- live rc.117 additions: `catchDefect`, `tapErrorTag`, `tapDefect`, `unwrapReason`
- `tapCause`, `tapError`
- `orElseIfEmpty`, `orElseSucceed`, `orDie`, `ignore`, `ignoreCause`
- `retry`, `withExecutionPlan`

### Text

- `decodeText`, `encodeText`, `splitLines`

### Resource / service / tracing

- `onExit`, `onError`, `onStart`, `onFirst`, `onEnd`, `ensuring`
- `provide`, `provideContext`, `provideService`, `provideServiceEffect`
- `updateContext`, `updateService`
- `withSpan`

### Do notation

- `Do`, `bind`, `bindEffect`, `bindTo`

### Destructors and output bridges

- `toChannel`, `peel`
- `run`, `runCollect`, `runCount`, `runSum`, `runFold`, `runFoldEffect`
- `runHead`, `runLast`, `runForEach`, `runForEachWhile`, `runForEachArray`, `runDrain`
- `toPull`, `mkString`, `mkArrayBuffer`, `mkUint8Array`
- `toReadableStreamWith`, `toReadableStream`, `toReadableStreamEffect`
- `toAsyncIterableWith`, `toAsyncIterableEffect`, `toAsyncIterable`
- `runIntoPubSub`, `toPubSub`, `toPubSubTake`, `toQueue`, `runIntoQueue`

## Mapping vs sequencing

Use `map` when one input becomes one output synchronously:

```ts
Stream.map((value, index) => ...)
```

The index increases across the full logical stream, not separately for every chunk.

Use `mapEffect` when one input still produces one output, but the transformation can fail or require services.

Use `flatMap` when one input expands into a whole Stream. By default it is sequential: inner streams are concatenated in input order. With `concurrency > 1` or `"unbounded"`, multiple inner streams can run simultaneously and outputs are merged as they arrive.

## Buffering and backpressure

`Stream.buffer` buffers elements between upstream and downstream:

```ts
Stream.buffer({
  capacity: 32,
  strategy: "suspend"
})
```

Strategies:

- `suspend` — preserve backpressure; producer waits when full.
- `dropping` — new elements may be discarded when full.
- `sliding` — older buffered elements may be displaced by newer ones.

`buffer` destroys upstream chunking. `bufferArray` buffers chunks instead and preserves chunk boundaries.

Treat dropping/sliding as domain semantics, not merely performance flags.

## Merging vs zipping

`merge(left, right)` combines independent sources concurrently. Cross-stream ordering is determined by availability, not by source position. `haltStrategy` controls completion semantics.

`zip`/`zipWith` combine streams point-by-point and stop when either side ends.

Use merge for independent event sources; use zip when element alignment is part of the contract.

## Running and materialization

A Stream is not executed until a destructor or bridge drives it.

`runCollect` returns:

```ts
Effect<Array<A>, E, R>
```

and waits until upstream completes. It materializes every emitted value, so it is appropriate for bounded streams only.

`run(stream, sink)` delegates the terminal consumption protocol to `Sink`, which is useful for early completion, aggregation, or richer terminal behavior.

Other focused destructors include `runHead`, `runLast`, `runCount`, `runSum`, `runFold`, and `runDrain`.

## AsyncIterable and Queue bridges

`toAsyncIterable` is the service-free JavaScript iterator bridge. The adapter owns a Scope for the iterator lifetime and closes it when iteration completes, returns early, or throws.

Use `toAsyncIterableEffect` / `toAsyncIterableWith` when the Stream needs services.

`toQueue` creates a scoped dequeue fed concurrently by the stream. Stream completion is represented by `Cause.Done`; stream failures fail the queue; the queue shuts down with the surrounding Scope.

## Workspace vs live source

Workspace pin: `4.0.0-rc.112`.

Live page during generation: `4.0.0-rc.117`.

Source-level public-name changes found in rc.117:

- added `as`
- added `catchDefect`
- added `tapErrorTag`
- added `tapDefect`
- added `unwrapReason`

No rc.112 top-level declaration names were removed.

The generated TypeScript intentionally uses APIs available in rc.112.

## Real programs included in `stream.ts`

### `create_program`

Runs `fromIterable` and `fromEffect` and collects the results.

### `transform_program`

Shows `map`, `filter`, `flatMap`, and `mapEffect`.

### `control_program`

Shows a bounded/buffered stream and a merged pair of sources.

### `run_program`

Shows `runCollect`, `run(..., Sink.sum)`, and `runHead`.

### `async_iterable_example`

Shows the service-free AsyncIterable bridge without hiding it behind Foldkit state.

## Foldkit message shape

`defineMessageUnion` receives field maps directly:

```ts
export const Message = defineMessageUnion({
  SelectedStreamStage: { stage: Stage },
  SelectedStreamCreateCase: { createCase: CreateCase },
})
```

Do not wrap each variant in `S.Struct(...)`; Foldkit constructs the tagged structs itself.

## Validation

Generated files are checked with:

```sh
tsc --noEmit \
  --noResolve \
  --allowImportingTsExtensions \
  --target ES2022 \
  --module ESNext \
  --moduleResolution bundler \
  --skipLibCheck \
  --noImplicitAny \
  stream.ts stream.view.ts
```

The expected standalone diagnostics are only unresolved workspace imports (`effect`, `foldkit`, `foldkit/message`, `foldkit/struct`, `@foldkit/ui`, `foldkit/html`).

No explicit TypeScript `any` annotations are present in the generated lesson files.

## References used

- Live Effect v4 `Stream` API page (`4.0.0-rc.117`).
- Workspace vendored `.context/effect/packages/effect/src/Stream.ts`.
- Upstream `effect@4.0.0-rc.112` and `effect@4.0.0-rc.117` source comparison.
- `.context/foldkit/packages/foldkit/src/schema/index.ts` for `defineMessageUnion` field-map semantics.
- Existing standalone Foldkit lesson artifacts for UI structure.
