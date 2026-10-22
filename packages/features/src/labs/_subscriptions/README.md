# Subscriptions

## Mental model

A Subscription describes **ongoing work whose lifetime is derived from the
Model**.

A Subscription entry has two conceptual functions:

```ts
Model
  ↓ modelToDependencies
Dependencies
  ↓ dependenciesToStream
Stream<Message>
```

After every Model update, Foldkit recomputes the dependency record.

Then:

```text
dependencies equivalent
  → keep current Stream + Scope alive

dependencies changed
  → close old Scope
  → run acquireRelease finalizers
  → open a fresh Stream Scope
```

Events emitted by the Stream become ordinary Messages and go back through
`update`.

This is the key difference from Commands:

```text
Command
  = one-shot work
  = one result Message

Subscription
  = ongoing Stream
  = lifetime follows Model dependencies
```

## 1. Model-driven lifetime

The real subscription in the demo:

```ts
export const subscriptions =
  Subscription.make<
    Model,
    Message
  >()(entry => ({
    tick: entry(
      {
        isAutoCounting:
          Schema.Boolean
      },
      {
        modelToDependencies:
          model => ({
            isAutoCounting:
              model.isAutoCounting
          }),

        dependenciesToStream:
          ({
            isAutoCounting
          }) =>
            Stream.when(
              Stream.tick(
                Duration.seconds(1)
              ).pipe(
                Stream.map(
                  Message.Ticked
                )
              ),
              Effect.sync(
                () =>
                  isAutoCounting
              )
            )
      }
    )
  }))
```

Only:

```ts
isAutoCounting
```

is in the dependency record.

If some unrelated field changes:

```ts
count
route
selectedTab
```

the dependency record remains:

```ts
{
  isAutoCounting: true
}
```

so Foldkit leaves the current Stream alive.

When it changes:

```text
false → true
```

Foldkit closes the old scope and opens the new active timer Stream.

When it changes:

```text
true → false
```

the active scope closes and the timer stops.

### Cleanup

A Subscription Stream can use:

```ts
Effect.acquireRelease
```

inside its scope.

When dependencies change or the Subscription record is shut down, Foldkit
closes the scope, so registered finalizers run.

This is why Subscriptions are a good fit for:

- global DOM listeners
- timer streams
- observers
- animation loops
- scoped DOM state
- external event streams without a handle consumed elsewhere

## Register the record with the Runtime

Defining:

```ts
export const subscriptions = ...
```

does not start it by itself.

The application must pass it to:

```ts
Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  subscriptions,
  container
})
```

The `subscriptions` field is optional; omitting it means the application has no
Subscription behavior.

## 2. DOM events

For DOM events not owned by one rendered element, use:

```ts
Subscription.fromEvent(...)
```

Example:

```ts
Subscription.fromEvent({
  target:
    () => window,

  type:
    "keydown",

  toMessage:
    event =>
      Message.PressedKey({
        key: event.key
      })
})
```

The listener is registered when the Stream scope opens and removed when that
scope closes.

Pass `target` as a thunk when it may not exist until the scope opens.

Always-present browser globals can also be passed directly.

### Typed event mapping

The target and event name determine the mapper event type.

For example:

```text
window
+
"keydown"
→ KeyboardEvent
```

so no manual event generic is needed.

For a custom target, Foldkit exposes:

```ts
Subscription.TypedEventTarget<...>
```

which can declare custom event names and their exact `CustomEvent` detail
types.

## Conditional event mapping

Use:

```ts
Subscription.fromEventFilterMap
```

when only some native events should become Messages.

The mapper returns:

```ts
Option.some(message)
```

to emit, or:

```ts
Option.none()
```

to ignore.

## Synchronous preventDefault

When handled events must cancel their browser default, use:

```ts
Subscription.fromEventFilterMapPreventDefault
```

The demo defines:

```ts
Subscription.fromEventFilterMapPreventDefault({
  target:
    () => window,

  type:
    "keydown",

  toMessage:
    event =>
      event.key === "Escape"
        ? Option.some(
            Message.PressedEscape()
          )
        : Option.none()
})
```

For:

```text
Some(message)
```

the helper:

1. calls `preventDefault()` synchronously
2. queues the Message
3. returns from the native listener

For:

```text
None
```

the event is left alone.

This matters because routing the event through update first would be too late:
the browser would already have performed its default action.

The helper registers non-passive by default and rejects `passive: true`,
because passive listeners cannot cancel default behavior.

### One element vs global source

If a listener belongs to one rendered element, use **Mount** rather than a
Subscription.

Subscription lifetime is driven by a Model dependency record.

Mount lifetime is driven by one concrete DOM element.

## 3. `keepAliveEquivalence`

By default Foldkit compares the entire dependency record structurally.

That is normally correct.

Sometimes:

- one field controls whether the Stream should exist
- another field changes frequently
- the long-running callback needs the latest value
- restarting for every small change would be wasteful

The canonical example is drag auto-scroll:

```text
isDragging
  → controls the animation-loop lifetime

clientY
  → changes every pointer movement
  → callback needs latest value
  → should NOT restart loop every pixel
```

The demo uses:

```ts
entry(
  {
    isDragging:
      Schema.Boolean,

    clientY:
      Schema.Number
  },
  {
    modelToDependencies:
      model => ({
        isDragging:
          model.isDragging,

        clientY:
          model.clientY
      }),

    keepAliveEquivalence:
      Equivalence.Struct({
        isDragging:
          Equivalence.Boolean
      }),

    dependenciesToStream:
      (
        { isDragging },
        readDependencies
      ) =>
        ...
  }
)
```

Now Foldkit decides whether to restart the Stream using only:

```ts
isDragging
```

Changing:

```ts
clientY
```

does not reopen the scope.

The running callback can still call:

```ts
readDependencies()
```

and synchronously receive the newest complete dependency record:

```ts
const {
  clientY
} = readDependencies()
```

### Use this sparingly

Most entries should use the normal one-argument:

```ts
dependenciesToStream:
  dependencies => ...
```

Use `readDependencies` only when a long-lived callback needs current values
that should not control its lifetime.

## `animationFrame`

Foldkit provides a ready-made requestAnimationFrame Subscription entry:

```ts
Subscription.animationFrame({
  isActive:
    model =>
      model.isPlaying,

  toMessage:
    deltaTime =>
      Message.TickedFrame({
        deltaTime
      })
})
```

Put it directly inside the record passed to `Subscription.make`:

```ts
Subscription.make<Model, Message>()(
  _entry => ({
    frame:
      Subscription.animationFrame({
        ...
      })
  })
)
```

`deltaTime` is milliseconds between frames.

Use it for frame-rate-independent movement.

The browser can pause requestAnimationFrame in background tabs, so the first
delta after returning may be large. Cap it before feeding physics / movement if
needed.

Use:

```ts
Stream.tick
```

for discrete wall-clock cadence.

Use:

```ts
Subscription.animationFrame
```

for display-frame cadence.

## Persistent Subscriptions

If a Stream does not depend on Model state at all:

```ts
Subscription.persistent(stream)
```

wraps it as an entry that lives for the entire lifetime of the Subscriptions
record.

The downloadable example includes:

```ts
heartbeat:
  Subscription.persistent(
    Stream.tick(
      Duration.seconds(10)
    ).pipe(
      Stream.map(
        Message.Heartbeat
      )
    )
  )
```

Good uses:

- system theme observer
- viewport observer
- route-independent timer
- stable global event stream

## 4. Lifting child Subscriptions

A child Submodel can own its own Subscription record:

```ts
const childSubscriptions =
  Subscription.make<
    ChildModel,
    ChildMessage
  >()(entry => ({
    childPulse: entry(
      {
        isOnline:
          Schema.Boolean
      },
      {
        modelToDependencies:
          model => ({
            isOnline:
              model.isOnline
          }),

        dependenciesToStream:
          ({ isOnline }) =>
            ...
      }
    )
  }))
```

The parent lifts the whole record:

```ts
const lifted =
  Subscription.lift(
    childSubscriptions
  )<Model, Message>({
    toChildModel:
      model =>
        model.child,

    toParentMessage:
      message =>
        Message.GotChildMessage({
          message
        })
  })
```

Each child-emitted Message is lifted into the parent Message universe.

### Parent-owned gate

The parent can add a condition the child cannot see:

```ts
const lifted =
  Subscription.lift(
    childSubscriptions
  )<Model, Message>({
    toChildModel:
      model =>
        model.child,

    toParentMessage:
      message =>
        Message.GotChildMessage({
          message
        }),

    when:
      model =>
        model.routeActive
  })
```

This is useful for page/route lifetime.

A closed gate is a **real teardown**, not a paused Stream.

While closed:

- the child's Stream scope is closed
- child `modelToDependencies` is not evaluated
- child Model changes do not cause restarts

When reopened, a fresh scope starts from the child's latest state.

### Per-entry gates

Instead of gating the whole child record:

```ts
when: {
  roomKeyboard:
    model =>
      model.route._tag === "Room"
}
```

can gate selected entries while leaving others ungated.

## Aggregate records

Use:

```ts
Subscription.aggregate(
  appSubscriptions,
  liftedChildSubscriptions,
  persistentSubscriptions
)
```

to combine records.

Duplicate keys throw rather than silently overriding one another.

Message and Effect service requirements widen across the combined records.

## Keyboard shortcuts

The deployed Foldkit guide includes a high-level shortcut helper for global
keyboard bindings, including:

- one-key shortcuts
- modifiers such as `Mod+K`
- ordered sequences
- typing suppression / opt-in
- repeat handling
- sequence timeout
- preventDefault policy

If the meaning of a shortcut depends on application state, the shortcut should
still emit a factual Message such as:

```ts
PressedEscape
```

and update should decide what it means.

Do not read the application Model from `toMessage`.

## Lifecycle choice

Choose the primitive based on who owns the lifetime.

### Command

```text
one-shot work
→ one result
```

Examples:

- fetch once
- write clipboard
- delay once
- persist once

### Subscription

```text
Model-derived dependency record
→ ongoing Stream
```

Examples:

- global keyboard events while a mode is active
- timer while auto-counting
- window resize while a feature is enabled
- animation loop while playing

### Mount

```text
one rendered DOM element
→ element-scoped lifetime
```

Examples:

- ResizeObserver on one element
- element-specific imperative listener
- third-party DOM instance attached to one node

### ManagedResource

```text
Model condition
→ scoped lifetime
→ typed handle consumed by Commands
```

Examples:

- WebSocket handle
- camera stream
- third-party editor instance
- connection object other parts of the app need to use

A plain Subscription is best when the scoped work does not need to expose a
handle to other parts of the program.

## Real Foldkit APIs used

The source includes:

- `Subscription.make`
- `entry(fields, callbacks)`
- `modelToDependencies`
- `dependenciesToStream`
- `keepAliveEquivalence`
- `readDependencies`
- `Subscription.fromEventFilterMapPreventDefault`
- `Subscription.persistent`
- `Subscription.lift`
- `Subscription.aggregate`
- `Stream.tick`
- `Stream.when`
- `Effect.acquireRelease` lifecycle semantics
- `Equivalence.Struct`
- `Option`
- `Match`
- `defineMessageUnion`
- `Message.match`
- `evo`

The README also covers:

- `Subscription.animationFrame`
- `fromEvent`
- `fromEventFilterMap`
- typed event targets
- per-entry lift gates
- runtime registration
- lifecycle choice versus Commands, Mounts, and ManagedResources

## Core sequence

You now have:

```text
Model
→ Messages
→ Update
→ View
→ Commands
→ Subscriptions
```

The next Foldkit core page is:

```text
Init & Flags
```

which defines where the first Model and startup Commands come from.
