# Commands

## Mental model

A Command is a **named one-shot Effect that produces a Message**.

Update does not execute the work.

Instead:

```text
Message
  ↓
update
  ↓
{ model, commands: [Command] }
  ↓
Runtime
  ↓
execute Command Effect
  ↓
result Message
  ↓
update
```

That keeps update pure.

Examples of Command-shaped work:

- one HTTP request
- one delay
- one file read
- one upload
- one DOM focus action
- one clipboard write
- one persistence call

If the Model owns the lifetime of ongoing work, use a Subscription or
ManagedResource instead.

Work tied to one DOM element's lifetime belongs in Mount.

## 1. One-shot Effects as data

The demo defines:

```ts
export const DelayReset =
  Command.define(
    "DelayReset",
    {
      messages: [
        Message.CompletedDelayReset
      ],

      execute:
        Effect.sleep("900 millis").pipe(
          Effect.as(
            Message.CompletedDelayReset()
          )
        )
    }
  )
```

Update responds to the click by returning the Command:

```ts
ClickedResetAfterDelay: () => ({
  model: evo(model, {
    resetPending: () => true
  }),

  commands: [
    DelayReset()
  ]
})
```

No timer starts while update runs.

The Runtime executes `DelayReset` afterward.

When the Effect completes:

```ts
Message.CompletedDelayReset()
```

is dispatched back through update:

```ts
CompletedDelayReset: () => ({
  model: evo(model, {
    count: () => 0,
    resetPending: () => false
  })
})
```

### Anatomy of `Command.define`

A definition has:

```text
name
messages
execute
```

The name identifies the work in:

- DevTools
- traces
- Story / Scene tests

The `messages` collection lists every result Message the Command may produce.

`execute` is the Effect that produces one of those Messages.

Command names are verb-first work names:

```text
FetchWeather
FocusItems
LockScroll
PersistCount
```

Result Messages are facts:

```text
SucceededFetchWeather
FailedFetchWeather
CompletedLockScroll
```

## 2. Args

Values that change per dispatch belong in `args`.

The demo defines:

```ts
export const LookupWeather =
  Command.define(
    "LookupWeather",
    {
      args: {
        zipCode: Schema.String
      },

      messages: [
        Message.SucceededLookupWeather,
        Message.FailedLookupWeather
      ],

      execute: ({ zipCode }) =>
        ...
    }
  )
```

Then update constructs:

```ts
LookupWeather({
  zipCode: model.zipCode
})
```

The constructed Command carries:

```ts
{
  name: "LookupWeather",
  args: {
    zipCode: "90210"
  },
  effect: ...
}
```

Args are visible in DevTools and tests.

### What belongs in args?

Per-dispatch input:

```text
zipCode
uploadId
documentId
elementId
duration
```

Do not dump every dependency into args.

Other dependencies belong elsewhere:

- module constants stay in lexical scope
- app-wide services use Resources / Effect context
- Model-gated handles use ManagedResources
- ordinary Effect services can be `yield*`ed by the Command Effect

## HTTP Commands

The Foldkit guide shows network work with Effect's:

```ts
HttpClient
HttpClientRequest
```

and Foldkit's:

```ts
Http.layer
```

The shape remains the same:

```ts
const FetchCount =
  Command.define(
    "FetchCount",
    {
      messages: [
        Message.SucceededFetchCount,
        Message.FailedFetchCount
      ],

      execute:
        Effect.gen(function* () {
          const client =
            yield* HttpClient.HttpClient

          ...
        }).pipe(
          Effect.catch(error =>
            Effect.succeed(
              Message.FailedFetchCount({
                error: String(error)
              })
            )
          ),
          Effect.provide(Http.layer)
        )
    }
  )
```

A useful property of the type is that after every expected failure has been
converted to a Message, the Effect error channel is empty.

Update handles network failure the same way it handles every other fact:
through a Message.

The downloadable demo uses a deterministic fake weather Effect so it does not
depend on an external server.

## 3. Testable by design

Commands are ordinary values returned by update.

A test can therefore inspect them before any Effect runs.

Foldkit Story tests support this loop:

```ts
story(
  update,

  given({
    ...
  }),

  message(
    Message.ClickedLookupWeather()
  ),

  Command.expectExact(
    LookupWeather({
      zipCode: "90210"
    })
  ),

  Command.resolve(
    LookupWeather,
    Message.SucceededLookupWeather({
      zipCode: "90210",
      temperatureF: 78
    })
  ),

  model(model => {
    ...
  })
)
```

The key point:

```text
test does not need to run HTTP / timer / filesystem work
```

It can:

1. dispatch the initiating Message
2. inspect the exact returned Command and args
3. inject one of the Command's declared result Messages
4. assert on the resulting Model

This makes every transition visible.

## 4. Interruptible Commands

Commands normally run to completion.

Use interruption when one-shot work occasionally needs to stop:

- request superseded by newer input
- user cancels an upload
- user stops a file operation

### Name-keyed interruption

If at most one invocation is meaningfully in flight:

```ts
const SaveDraft =
  Command.define(
    "SaveDraft",
    {
      args: {
        body: Schema.String
      },

      messages: [
        Message.SucceededSaveDraft
      ],

      interrupt: true,

      execute: ...
    }
  )
```

The Command name is the key.

Its interrupt constructor needs only the result mapper:

```ts
SaveDraft.Interrupt(
  outcome =>
    Message.CompletedCancelSaveDraft({
      outcome
    })
)
```

### Args-derived interruption

If several invocations can run independently, key by the Model identity that
the user can cancel.

The demo uses:

```ts
const LongTask =
  Command.define(
    "LongTask",
    {
      args: {
        jobId: Schema.Number
      },

      messages: [
        Message.CompletedLongTask
      ],

      interrupt: {
        keyFields: [
          "jobId"
        ],

        toKey:
          ({ jobId }) =>
            String(jobId)
      },

      execute: ...
    }
  )
```

Then:

```ts
LongTask.Interrupt(
  { jobId },

  outcome =>
    Message.CompletedCancelLongTask({
      jobId,
      outcome
    })
)
```

Foldkit prefixes the derived key with the Command name:

```text
LongTask:7
```

so unrelated Command definitions occupy distinct key namespaces.

### Choose a stable Model identity

Good:

```text
uploadId
documentId
rowId
```

Poor:

```text
fileName
random number
timestamp
```

The key should identify the Model-owned work the user can target.

`keyFields` also determines the exact args required by `.Interrupt`, so if the
original Command takes:

```ts
{
  uploadId,
  file
}
```

but only:

```ts
keyFields: ["uploadId"]
```

the Interrupt call requires only:

```ts
{
  uploadId
}
```

not the original `file`.

## Interrupt outcome

The result is:

```ts
Command.Interruptible.Outcome
```

with variants:

```text
Interrupted
NotFound
```

### Interrupted

At least one in-flight invocation holding the key was stopped.

Its normal result Message will **not** arrive.

Therefore the cancellation-result handler owns the next Model state.

### NotFound

Nothing currently held the key.

The work:

- already completed
- or never started

Its own result Message either already handled the Model or there was nothing to
cancel.

Several invocations may hold one key. A key is an address, not a mutex.
Dispatching an Interrupt stops every current holder of that address.

## Replacement work must wait

Do not return:

```ts
commands: [
  FetchSuggestions.Interrupt(...),
  FetchSuggestions(newArgs)
]
```

and assume the old request stops before the new one starts.

Commands returned from the same update are forked independently.

That code races interruption against the replacement.

Instead:

```text
Running
  ↓ new input
Cancelling
  ↓ return only Interrupt
CompletedCancel...
  ↓ key is free
return replacement Command
```

This also gives the Model an explicit `Cancelling` state.

For stale result protection, the Foldkit guide demonstrates carrying a
generation in each request and ignoring results from older generations.

## Record why cancellation happened

Cancellation itself is work.

The result Message should still record the cause.

If these mean different things:

```text
user clicked Cancel
user selected replacement file
```

use different result Messages:

```text
CompletedCancelUploadFileDueToClickedCancel
CompletedCancelUploadFileDueToSelectedNewFile
```

Do not add a second behavior tag to one cancellation result Message.

The Message records what happened; update decides the follow-up.

If the desired follow-up can change while cancellation is running, store that
intent in Model and let the cancellation-result branch inspect current Model.

## Command mapping

When a child/Submodel produces Commands whose result Messages must be lifted
into the parent Message universe, use:

```ts
Command.mapMessages(
  childCommands,
  message =>
    Message.GotChildMessage({
      message
    })
)
```

It accepts optional Commands directly:

```ts
ReadonlyArray<Command<ChildMessage>>
| undefined
```

and always returns a concrete array of parent Commands.

The mapping is fused into the Effect and also recorded so Story / Scene
`Command.resolve` can recover the same wrapping automatically.

Use `mapMessages` when changing the result Message.

Use `Command.mapEffect` when you actually need to transform the Effect itself.

## When not to use a Command

A Command is structurally:

```text
one-shot work
→ one declared result Message
```

If you need continuously active work owned by Model:

```text
Subscription
ManagedResource
```

If the work belongs specifically to a DOM element lifetime:

```text
Mount
```

This boundary matters more than whether the underlying Effect happens to be
asynchronous.

## Real Foldkit APIs used

The source includes:

- `Command.define`
- Command args
- declared result Messages
- `Command.Interruptible.Outcome`
- derived interrupt keys
- `Definition.Interrupt`
- `Update.Return`
- `defineMessageUnion`
- `defineTaggedUnion`
- `Message.match`
- `evo`
- Effect `sleep`
- Effect `as`
- Effect `gen`

The README also covers:

- Story `Command.expectExact`
- Story `Command.resolve`
- `Command.mapMessages`
- HTTP Commands with `Http.layer`
- safe replacement sequencing

## Core sequence

You now have:

```text
Model
→ Messages
→ Update
→ View
→ Commands
```

The next Foldkit core page is:

```text
Subscriptions
```

Commands are one-shot work.

Subscriptions are the next piece because they represent ongoing work whose
lifetime follows Model state.
