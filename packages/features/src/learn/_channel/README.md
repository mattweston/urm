# Effect 4 Channel — Foldkit visual demo

Based on:

- <https://effect.website/docs/v4/api/effect/Channel>

## Mental model

`Channel` is Effect's low-level typed streaming / pipeline primitive.

Its full type is:

```ts
Channel<
  OutElem,
  OutErr = never,
  OutDone = void,
  InElem = unknown,
  InErr = unknown,
  InDone = unknown,
  Env = never
>
```

That means a Channel describes **both sides** of a streaming protocol.

Output side:

```text
OutElem
  emitted values

OutErr
  typed failure

OutDone
  terminal completion value
```

Input side:

```text
InElem
InErr
InDone
```

Environment:

```text
Env
```

This richer shape is why Channel can model:

- sources
- transforms
- sinks
- protocol adapters
- resource-backed streams
- text codecs
- queues / PubSub
- readable / writable streams
- the low-level engine under higher streaming abstractions

For many application tasks, `Stream` is the friendlier API.

Use Channel when you need direct control over the input/output protocol or
low-level streaming composition.

# 1. Sources

## fromArray

```ts
const numbers =
  Channel.fromArray([
    1,
    2,
    3
  ])
```

Type conceptually:

```ts
Channel<
  number,
  never,
  void
>
```

It emits the array elements and then completes.

## fromIterable

```ts
Channel.fromIterable(
  new Set([
    1,
    2,
    3
  ])
)
```

The iterator's return value can become the Channel's `OutDone`.

## succeed

```ts
Channel.succeed(42)
```

emits:

```text
42
```

then ends with `void`.

## `end` is not `succeed`

```ts
Channel.end(
  "finished"
)
```

emits **no elements**.

Instead its terminal completion value is:

```text
OutDone = "finished"
```

This distinction is central to Channel.

```text
succeed(value)
  → one OutElem

end(value)
  → no OutElem
  → OutDone value
```

## sync

Lazy one-element source:

```ts
Channel.sync(
  () => value
)
```

## empty

```ts
Channel.empty
```

emits nothing and completes normally.

## never

```ts
Channel.never
```

never emits and never completes.

## fail

```ts
Channel.fail(
  "network"
)
```

fails through the typed:

```text
OutErr
```

channel.

There are also:

```ts
failSync
failCause
failCauseSync
die
```

for lazy errors, full Causes, and defects.

# 2. Source integrations

The current v4 API includes constructors for:

```text
Effect
Queue
PubSub / Subscription
Schedule
ReadableStream
WritableStream
TransformStream
AsyncIterable
Iterator
Chunk
Array
```

Examples:

```ts
Channel.fromEffect(effect)
Channel.fromQueue(queue)
Channel.fromPubSub(pubsub)
Channel.fromSchedule(schedule)
Channel.fromReadableStream(...)
Channel.fromAsyncIterable(...)
```

Many have array/batched variants:

```ts
fromQueueArray
fromPubSubArray
fromSubscriptionArray
fromIterableArray
```

Use these when batching reduces pull / queue overhead.

# 3. Transform emitted elements

## map

```ts
Channel.map(
  channel,
  (value, index) =>
    transform(value)
)
```

changes only `OutElem`.

It preserves:

```text
OutErr
OutDone
InElem
InErr
InDone
Env
```

## filter

```ts
Channel.filter(
  channel,
  value =>
    predicate(value)
)
```

TypeScript refinements can narrow the output element type.

## filterMap

The v4 filtering family includes:

```ts
filterMap
filterMapEffect
filter
filterEffect
```

plus array-oriented variants.

# 4. Effectful transformation

```ts
Channel.mapEffect(
  channel,
  value =>
    Effect.succeed(
      transform(value)
    )
)
```

The mapping Effect can:

- fail
- require services

and those types are added to the resulting Channel.

### Sequential default

Without a concurrency option, element Effects run sequentially.

### Concurrent

```ts
Channel.mapEffect(
  channel,
  f,
  {
    concurrency:
      "unbounded"
  }
)
```

or a finite concurrency number.

### Unordered output

```ts
{
  concurrency:
    "unbounded",

  unordered:
    true
}
```

allows each result to emit as soon as its mapping Effect finishes.

Without `unordered`, concurrent processing preserves logical output order.

# 5. flatMap

```ts
Channel.flatMap(
  source,
  value =>
    anotherChannel(value)
)
```

Each output element becomes another Channel.

The nested Channels are flattened into one output Channel.

Example:

```text
1
→ ["1:0"]

2
→ ["2:0", "2:1"]

3
→ ["3:0", "3:1", "3:2"]
```

`flatMap` also supports concurrency / buffer options.

# 6. concat

```ts
Channel.concat(
  first,
  second
)
```

runs:

```text
first completely
then
second
```

The resulting element/error types include both sides.

Its `OutDone` becomes the second Channel's done type.

For control over the first done value when selecting the second Channel, use:

```ts
Channel.concatWith
```

# 7. `pipeTo`

This is the most Channel-specific composition operator.

Create a transform that accepts upstream input:

```ts
const timesTen =
  Channel.map(
    Channel.identity<
      number,
      never,
      void
    >(),
    n =>
      n * 10
  )
```

`identity` has matching input/output protocols:

```text
InElem number
→
OutElem number
```

Now connect a source:

```ts
const source =
  Channel.fromArray([
    1,
    2,
    3
  ])

const pipeline =
  Channel.pipeTo(
    source,
    timesTen
  )
```

Conceptually:

```text
source OutElem
      ↓
transform InElem

source OutErr
      ↓
transform InErr

source OutDone
      ↓
transform InDone
```

and the resulting Channel exposes the transform's output side.

This is different from ordinary function composition: the streaming protocol
itself is wired together.

There is also:

```ts
Channel.pipeToOrFail
```

for a different upstream error-handling relationship.

# 8. Done values

Map emitted values:

```ts
Channel.map
```

Map the terminal value:

```ts
Channel.mapDone(
  channel,
  done =>
    transform(done)
)
```

Effectfully:

```ts
Channel.mapDoneEffect
```

The done value is useful for protocols where a stream finishes with meaningful
terminal information.

`fromIterator` can preserve the iterator return value as `OutDone`.

# 9. Running Channel

Channel is a description.

Runners convert it back into an Effect.

## collect

```ts
Channel.runCollect(
  channel
)
```

returns an Effect containing the emitted elements as an array.

## drain

```ts
Channel.runDrain(
  channel
)
```

runs for effects / completion and discards emitted elements.

## count

```ts
Channel.runCount(
  channel
)
```

counts emitted elements.

## head

```ts
Channel.runHead(
  channel
)
```

returns:

```ts
Effect<
  Option<OutElem>,
  OutErr,
  Env
>
```

It can stop after the first element.

## last

```ts
Channel.runLast(
  channel
)
```

runs to completion and returns the final emitted element in `Option`.

## fold

```ts
Channel.runFold(
  channel,
  () => initial,
  (state, value) =>
    nextState
)
```

folds outputs incrementally.

Effectful fold:

```ts
Channel.runFoldEffect
```

# 10. Low-level pulls

For lower-level consumers:

```ts
Channel.toPull
Channel.toPullScoped
```

expose a pull Effect.

These are useful for libraries / adapters that need explicit pull control.

Most application code should prefer the normal runners.

# 11. Error handling

Channel has a broad typed error-handling API:

```ts
catchCause
catchDefect
catchCauseIf
catchCauseFilter

catchIf
catchFilter
catchTag

catchReason
catchReasons

mapError
tapError
tapCause

orDie
ignore
ignoreCause
```

Because `catchCause` receives the complete `Cause<OutErr>`, it can distinguish:

- typed Fail
- defects
- interruption
- combined failure structure

Tagged-error handling parallels Effect:

```ts
Channel.catchTag(
  channel,
  "NotFound",
  error =>
    recovery(error)
)
```

# 12. Retry

```ts
Channel.retry(
  channel,
  schedule
)
```

re-runs a failing Channel using an Effect `Schedule`.

This is useful for source/protocol retry where the whole Channel should be
re-established after failure.

# 13. Resource scope

Channel can own resources.

```ts
Channel.acquireUseRelease(
  acquireEffect,

  resource =>
    Channel.succeed(
      use(resource)
    ),

  (resource, exit) =>
    releaseEffect(resource)
)
```

Release runs when the Channel scope closes and receives the Channel exit.

There is also:

```ts
Channel.acquireRelease
```

which emits the acquired value and registers release in the Channel scope.

This is the streaming equivalent of scoped resource safety.

# 14. Queue / PubSub sinks

Channels can also be run into infrastructure:

```ts
runIntoQueue
runIntoQueueArray

runIntoPubSub
runIntoPubSubArray

toQueue
toQueueArray

toPubSub
toPubSubArray
```

These APIs make Channel useful as a low-level bridge between pull-based
processing and queue/pubsub boundaries.

# 15. Text pipelines

Effect 4 Channel includes text transformation Channels.

## decodeText

Input:

```text
NonEmptyReadonlyArray<Uint8Array>
```

Output:

```text
NonEmptyReadonlyArray<string>
```

Streaming `TextDecoder` mode allows multi-byte characters to span byte chunk
boundaries.

## encodeText

Input strings become `Uint8Array` values via `TextEncoder`.

## splitLines

Takes arrays of string chunks and emits complete logical lines.

It correctly handles:

```text
\n
\r
\r\n
line terminators split across input chunks
final partial line
```

A final line terminator does not add a trailing empty line.

Typical byte/text idea:

```text
byte arrays
  ↓ decodeText
string arrays
  ↓ splitLines
line arrays
```

# 16. Browser stream adapters

Channel also integrates directly with:

```text
ReadableStream
WritableStream
TransformStream
AsyncIterable
```

including:

```ts
Channel.fromReadableStream
Channel.fromWritableStream
Channel.fromTransformStream
Channel.fromAsyncIterable
Channel.pullIntoWritableStream
```

This makes it a useful low-level interop layer for browser/server streaming
APIs.

# 17. Composition / coordination

The API also includes advanced operators such as:

```text
combine
merge
mergeAll
mergeEffect
switchMap

buffer
bufferArray

interruptWhen
haltWhen

repeat
forever
schedule

onStart
onFirst
onEnd
onError
onExit
ensuring
```

These are useful when building streaming libraries / protocols.

For normal data-stream application logic, `Stream` may be easier.

# Channel vs Stream

A useful simplification:

```text
Stream<A, E, R>
  mostly describes an output stream of A

Channel
  explicitly models:
    output elements/errors/done
    input elements/errors/done
    environment
```

Reach for Channel when you need:

- an input/output transform
- low-level pull behavior
- meaningful done values
- queue/pubsub/browser stream adapters
- protocol-level composition
- custom resource/error semantics

Use Stream when you mainly need:

```text
produce values over time
→ transform them
→ consume them
```

# Real Effect 4 APIs used in the demo

- `Channel.fromArray`
- `Channel.fromIterator`
- `Channel.succeed`
- `Channel.fail`
- `Channel.identity`
- `Channel.map`
- `Channel.filter`
- `Channel.mapEffect`
- `Channel.flatMap`
- `Channel.concat`
- `Channel.pipeTo`
- `Channel.mapDone`
- `Channel.catchCause`
- `Channel.acquireUseRelease`
- `Channel.runCollect`
- `Channel.runFold`
- `Channel.runHead`
- `Channel.runLast`
- `Effect`

The README also covers:

- source integrations
- filter/effect variants
- low-level pulls
- retry
- queue/pubsub output
- text codecs
- browser stream adapters
- buffering/merging/interruption/lifecycle operators

## Suggested placement

```text
packages/features/src/learn/foldkit/
├── examples/
│   └── channel.ts
└── channel.view.ts
```
