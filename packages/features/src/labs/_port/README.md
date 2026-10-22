# Port

Based on:

- <https://foldkit.dev/api-reference/port>
- <https://foldkit.dev/core/embedding>

## Mental model

Ports are Foldkit's **Schema-typed host boundary**.

They are especially useful with:

```ts
Runtime.embed(program)
```

where another application / host owns the Foldkit program's lifecycle.

The host does **not**:

- read Foldkit Model directly
- dispatch Foldkit Messages directly
- reach into update

Instead it communicates through Ports.

There are two directions:

```text
HOST → FOLDKIT
  inbound Port

FOLDKIT → HOST
  outbound Port
```

The architecture reuses existing Foldkit primitives for each direction.

```text
inbound
  behaves like an external Subscription source

outbound
  is emitted as Effect work inside Commands
```

Initial host data belongs in Flags.

So embedding communication is:

```text
Flags
  = initial data in

Inbound Port
  = runtime data in

Outbound Port
  = runtime facts out
```

# 1. Declaring Ports

Current API:

```ts
Port.inbound(schema)
Port.outbound(schema)
```

The demo declares:

```ts
export const ports = {
  inbound: {
    stepChanged:
      Port.inbound(
        HostConfig
      )
  },

  outbound: {
    countChanged:
      Port.outbound(
        CountEvent
      )
  }
}
```

The record keys become the names on the host's `EmbedHandle`.

Therefore the host gets:

```ts
handle.ports.stepChanged
handle.ports.countChanged
```

Port names share one namespace on the handle.

You cannot register the same name once inbound and once outbound.

Every entry must also have its own distinct `Port.inbound(...)` /
`Port.outbound(...)` value; one Port object cannot be registered under several
names.

Pass the record into the Runtime program:

```ts
Runtime.makeElement({
  ...,
  ports
})
```

or:

```ts
Runtime.makeApplication({
  ...,
  ports
})
```

# 2. Inbound Ports

An inbound Port represents:

```text
host pushes Encoded value
        ↓
Port Schema decodes it
        ↓
decoded Value enters app
```

The atomic app-side API is:

```ts
Port.stream(
  ports.inbound.stepChanged
)
```

which produces:

```ts
Stream.Stream<HostConfig>
```

The common always-on form is:

```ts
Port.subscription(
  ports.inbound.stepChanged,

  ({ step }) =>
    Message.ChangedStepFromHost({
      step
    })
)
```

Place that inside `Subscription.make`:

```ts
const subscriptions =
  Subscription.make<
    Model,
    Message
  >()(_entry => ({
    hostStep:
      Port.subscription(
        ports.inbound.stepChanged,

        ({ step }) =>
          Message.ChangedStepFromHost({
            step
          })
      )
  }))
```

Now host input follows the ordinary Foldkit loop:

```text
host value
→ Port
→ Subscription Message
→ update
→ Model
```

The host does not get a secret backdoor into the Model.

## Host send

For an embedded runtime:

```ts
const handle =
  Runtime.embed(program)
```

the host sends:

```ts
const result =
  handle.ports.stepChanged.send({
    step: 5
  })
```

`send` returns an:

```ts
Exit<void, SchemaError>
```

because the input is validated against the Port Schema.

# First-attach buffering

Inbound Ports have an intentional startup rule.

If the host calls:

```ts
handle.ports.stepChanged.send(...)
```

immediately after `Runtime.embed` returns, before the app's first
`Port.stream` has attached, Foldkit **buffers those values in order**.

When the first Stream attaches, that startup backlog is delivered.

This avoids losing host configuration sent during the embed/startup race.

After the first Stream has attached once, the behavior changes:

```text
Stream attached
  → values delivered

Stream detached / gated off
  → new values dropped
```

That matches normal gated Subscription semantics.

The one special backlog exists only before the first attachment.

## Gated inbound Port

`Port.subscription` is persistent.

When Model state should control whether host input is currently accepted, build
a normal Subscription entry from:

```ts
Port.stream(port)
```

and apply your ordinary dependency / `Stream.when` logic.

Values sent while that gated Stream is not running are dropped after the
initial-attachment phase.

# 3. Outbound Ports

An outbound Port represents:

```text
app Value
  ↓
Port Schema encodes it
  ↓
every host listener receives Encoded value
```

The app emits with:

```ts
Port.emit(
  ports.outbound.countChanged,
  value
)
```

`Port.emit` is an Effect.

Therefore it belongs naturally inside a Command.

The demo defines:

```ts
const ReportCount =
  Command.define(
    "ReportCount",
    {
      args: {
        count:
          Schema.Number,

        source:
          CountEvent.fields.source
      },

      messages: [
        Message.CompletedReportCount
      ],

      execute:
        ({
          count,
          source
        }) =>
          Port.emit(
            ports.outbound.countChanged,
            CountEvent.make({
              count,
              source
            })
          ).pipe(
            Effect.as(
              Message.CompletedReportCount()
            )
          )
    }
  )
```

Update returns:

```ts
commands: [
  ReportCount({
    count,
    source: "Click"
  })
]
```

This means host notification remains outside pure update.

## Host subscribe

The embed handle exposes:

```ts
const unsubscribe =
  handle.ports.countChanged.subscribe(
    event => {
      console.log(event)
    }
  )
```

Multiple listeners may subscribe.

Every emitted value is delivered to each current listener in registration
order.

The returned function removes that listener:

```ts
unsubscribe()
```

## Delivery is deferred out of the Command fiber

Current Foldkit host delivery is queued to a microtask.

That means a host listener does not run **inside** the app's Command fiber.

This is important because a host listener might synchronously:

- call an inbound `send`
- call `dispose`

without re-entering the Runtime's Command execution stack.

It also means a host that subscribes synchronously immediately after
`Runtime.embed(...)` can still receive emissions produced by init Commands.

## Standalone app behavior

If a program with configured outbound Ports is started using:

```ts
Runtime.run(program)
```

rather than `Runtime.embed`, there is no host connector.

`Port.emit` becomes a no-op.

This lets one Foldkit program support:

```text
embedded mode
+
standalone mode
```

without branching all of its application logic.

# 4. Schema boundary

Every Port carries:

```ts
schema:
  Schema.Codec<Value, Encoded>
```

That means host and app deliberately see opposite sides of the codec.

## Inbound

```text
Host
  Encoded
    ↓ decode
App
  Value
```

`send(encoded)` validates by decoding.

If decoding fails:

```text
nothing reaches Port.stream
```

and:

```ts
send(...)
```

returns an `Exit` carrying the `SchemaError`.

Foldkit also logs a clear rejection message naming the inbound Port.

Therefore:

```text
typed host
  → compile-time guidance

untyped / JS host
  → runtime Schema protection

app
  → sees only decoded valid Values
```

## Outbound

```text
App
  Value
    ↓ encode
Host
  Encoded
```

`Port.emit` encodes using the Port Schema before delivery.

Encoding failure is treated as an internal programming defect because app code
is already expected to provide the Schema's Value type.

## Keep Port payloads boundary-friendly

Treat a Port payload like a network API payload.

Good:

```text
numbers
strings
booleans
plain structured domain values
ids
tagged serializable data
```

Do not cross:

```text
functions
DOM elements
browser handles
class instances without an explicit codec
hidden Model references
```

The app Model itself should not cross the boundary.

An outbound Port should announce a fact the host cares about:

```ts
{
  count: 12,
  source: "Click"
}
```

rather than coupling the host to an internal snapshot of the entire Model.

# 5. The EmbedHandle

Start:

```ts
const handle =
  Runtime.embed(program)
```

The returned handle is conceptually:

```ts
{
  ports: {
    stepChanged: {
      send(...)
    },

    countChanged: {
      subscribe(...)
    }
  },

  dispose()
}
```

The exact entries are inferred from the program's `ports` record.

## Inbound handle

```ts
handle.ports.stepChanged.send(
  encodedValue
)
```

Returns:

```ts
Exit<void, SchemaError>
```

## Outbound handle

```ts
handle.ports.countChanged.subscribe(
  listener
)
```

Returns:

```ts
() => void
```

for unsubscribe.

## Dispose

```ts
handle.dispose()
```

is idempotent.

It shuts down the whole embedded runtime boundary:

- Subscription scopes close
- ManagedResources release
- Mounts release
- host listeners are cleared
- pending inbound sends are cleared
- in-flight Commands are interrupted
- rendered DOM is removed
- container is restored empty

The container can then be used for a fresh `embed`.

After disposal:

```text
inbound send
  → no-op

outbound subscribe
  → inert / no delivery
```

This makes host unmount/remount races much easier to manage.

# 6. Ports are registered runtime capabilities

App-side Port operations require the exact Port value to appear in the
program's `ports` config.

If the app calls:

```ts
Port.stream(port)
```

or:

```ts
Port.emit(port, value)
```

but the program:

- has no `ports` config
- or registered a different Port object

Foldkit treats that as a programming error and dies with a descriptive message.

This prevents invisible global Port channels.

A Port is part of a particular Runtime program's declared boundary.

# 7. Flags vs inbound Ports

Use Flags for:

```text
host data needed once
before the first Model exists
```

Example:

```ts
{
  initialCount: 10
}
```

Use inbound Ports for:

```text
host data pushed while the app is running
```

Example:

```ts
{
  step: 5
}
```

In the embedding example:

```text
Flags.initialCount
  → init

ports.inbound.stepChanged
  → Subscription Message
```

They are complementary, not competing mechanisms.

# 8. Inbound Port vs Command

The direction matters.

```text
HOST → APP
```

is not a Command.

It is an external event source, so Foldkit models it as a Subscription.

```text
APP → HOST
```

is a side effect requested by an app transition, so Foldkit models it as an
Effect inside a Command.

This preserves the same architecture even at the host boundary:

```text
external input
→ Message
→ update

outbound effect
← Command
← update
```

# 9. Port API used in this demo

The source uses the current public API:

```ts
Port.inbound
Port.outbound
Port.subscription
Port.emit
```

The README also explains `Port.stream`, which is the lower-level primitive
under `Port.subscription`.

plus:

```ts
Runtime.makeElement
Runtime.embed // shown in host wiring, not called at module import
Command.define
Subscription.make
defineMessageUnion
Message.match
Update.Return
Schema
Exit
evo
```

The bundle defines a real embeddable program factory:

```ts
makeElement(
  container,
  flags
)
```

but deliberately does **not** call:

```ts
Runtime.embed
```

at module import time.

That keeps the learn example safe to copy into an already running Foldkit
application.

# 10. Relationship to the other demos

This completes a useful chain from the Runtime lesson:

```text
Runtime.embed
   ↓
EmbedHandle
   ↓
Ports
```

and lines up with the architecture you already have:

```text
HOST
  │
  ├── Flags ──────────────→ init
  │
  ├── inbound Port ───────→ Subscription → Message → update
  │
  └── outbound Port ←────── Command ← update
```

So Port is less an independent state-management primitive and more the typed,
explicit interop boundary around an embedded Foldkit runtime.
