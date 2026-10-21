# Init & Flags

## Mental model

Foldkit startup has two distinct responsibilities:

```text
Flags Effect
  = obtain startup data from outside the application

init(flags)
  = pure conversion of startup data into the first Model
    + optional startup Commands
```

The full fresh-client path is:

```text
external startup source
        ↓
Effect<Flags>
        ↓
Flags Schema boundary
        ↓
init(flags)
        ↓
Update.Return<Model, Message>
        ↓
first Model committed
        ↓
startup Commands run
```

For SSR/hydration the source of the Flags value changes, but `Flags` and `init`
stay the same.

## 1. The First Model

Without Flags:

```ts
const init:
  Runtime.ApplicationInit<
    Model,
    Message
  > =
  () => ({
    model: {
      count: 0
    }
  })
```

A non-routing application / element calls this with no arguments.

A routing application passes the current URL.

When the application declares Flags, they become the first argument.

The downloadable example uses:

```ts
export const init:
  Runtime.ApplicationInit<
    Model,
    Message,
    Flags
  > =
  flags => {
    ...
  }
```

## Init returns `Update.Return`

This is important:

```ts
init
```

does not return a special startup-only shape.

It returns:

```ts
Update.Return<
  Model,
  Message
>
```

the same return shape as update.

So startup can produce:

```ts
{
  model
}
```

or:

```ts
{
  model,
  commands: [...]
}
```

The demo includes:

```ts
commands: [
  WarmStartup({
    count
  })
]
```

to make this visible.

The Command is not executed inside init.

The Runtime starts it after the first Model has been produced.

## 2. Flags

Flags carry data from outside the Foldkit state machine into startup.

Typical inputs:

- persisted state
- runtime configuration
- request-specific server data
- values supplied by an embedding host

Define the boundary with an Effect Schema:

```ts
export const Flags =
  Schema.Struct({
    savedCount:
      Schema.Option(
        Schema.Number
      ),

    savedTheme:
      Schema.Option(Theme),

    requestLabel:
      Schema.Option(
        Schema.String
      )
  })

export type Flags =
  typeof Flags.Type
```

Then `init` folds that value into Model:

```ts
const count =
  Option.getOrElse(
    flags.savedCount,
    () => 0
  )

const theme =
  Option.getOrElse(
    flags.savedTheme,
    () => "System"
  )
```

Model can preserve a startup fact when the application cares about it:

```ts
startingCount:
  flags.savedCount
```

or only store its derived/current value:

```ts
count
```

depending on the application.

## Fresh-client Flags Effect

For a browser boot, define:

```ts
Effect.Effect<Flags>
```

that obtains the startup value.

The demo keeps this dependency-light by reading localStorage inside
`Effect.sync`.

The official Foldkit guide demonstrates a more structured persistence setup
using:

```ts
KeyValueStore
BrowserKeyValueStore
Schema decoding
```

with failure recovery to empty/default Flags.

The architectural point is the same:

```text
effectful startup acquisition
happens before
pure init(flags)
```

## Startup-only services vs application Resources

If a service is used only while obtaining Flags, it can be provided inside the
Flags Effect.

Example:

```text
KeyValueStore only needed to restore startup state
```

If the same singleton is also needed later by:

- Commands
- Subscriptions

leave it in the Effect requirement and provide it through the application's
Resources Layer.

The Runtime builds that Layer once and shares it.

## 3. Fresh Client Boot

Wire the Flags Schema into the application:

```ts
const application =
  Runtime.makeApplication({
    Model,
    Flags,
    init,
    update,
    view,
    container:
      document.getElementById(
        "root"
      )
  })
```

Then supply the Effect at startup:

```ts
Runtime.run(
  application,
  {
    flags
  }
)
```

The runtime:

1. runs the Flags Effect
2. obtains the Flags value
3. crosses the declared Flags Schema boundary
4. calls `init(flags)`
5. installs the first Model
6. runs any Commands returned by init
7. enters the normal Message / update loop

The presence of:

```ts
Flags
```

in `makeApplication` is part of the static contract.

If no Flags Schema is declared:

```text
init takes no Flags argument
```

and mismatched wiring is rejected by TypeScript.

## Routing variation

The guide notes one extra dimension:

```text
non-routing
  init()
  init(flags)

routing
  init(url)
  init(flags, url)
```

The current URL is available during routing startup so the first Model can
already reflect the route.

This demo stays non-routing to keep the startup pipeline visually focused.

## 4. Server Rendering and Hydration

For server rendering, the server / build already has the startup data.

It supplies a concrete Flags value rather than running the browser's Flags
Effect:

```text
request / build input
      ↓
Flags value
      ↓
renderToString
```

Server rendering calls the same:

```ts
init(flags)
```

to produce the Model used for HTML.

It then:

1. encodes the Flags through the declared Schema
2. embeds the handoff in the HTML

In the browser:

```text
Runtime.hydrate
  ↓
decode embedded Flags
  ↓
same init(flags)
  ↓
reconstruct the Model
```

This is why one Init & Flags demo is useful: the deterministic relationship is
visible.

```text
same Flags
+
same init
=
same first Model
```

## Hydration does NOT run the fresh-client Flags Effect

A hydrating entry does not provide:

```ts
Runtime.run(
  application,
  { flags: clientFlagsEffect }
)
```

Instead it consumes the server handoff.

That prevents a situation such as:

```text
server:
  savedCount = 7

browser fresh startup effect:
  savedCount = 0
```

from silently producing a different initial Model than the one used to render
the HTML.

Missing / invalid hydration handoff data is a startup failure rather than an
automatic fallback to a different client Model.

## What belongs in Flags?

Good:

```text
persisted todos
saved user preference
runtime configuration
request-specific initial data
host-supplied embedding configuration
```

Usually not good:

```text
data that changes continuously after startup
ongoing browser events
network request lifecycle state
derived render values
```

Those belong in the normal architecture:

```text
Model
Messages
Commands
Subscriptions
Resources
```

Flags are the startup boundary, not a second state store.

## Demo source details

The bundle includes real current Foldkit patterns:

- `Runtime.ApplicationInit`
- `Command.define`
- startup Commands returned from init
- `Schema.Struct` Flags
- `Schema.Option`
- `Effect.Effect<Flags>`
- `Runtime.makeApplication` wiring sketch
- `Runtime.run(application, { flags })` wiring sketch
- `defineMessageUnion`
- `Update.Return`
- `evo`

The SSR/Hydration section is intentionally shown as a wiring sketch rather than
importing / booting a second application inside the learn demo.

## Core sequence

You now have:

```text
Model
→ Messages
→ Update
→ View
→ Commands
→ Subscriptions
→ Init & Flags
```

The next Foldkit core page is:

```text
Submodel
```

which is the natural next demo: how to decompose one growing state machine into
children that own their own Model, Messages, update, view, Commands, and
Subscriptions behind explicit parent boundaries.
