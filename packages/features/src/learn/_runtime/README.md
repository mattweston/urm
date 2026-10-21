# Runtime

## Mental model

Runtime is the boundary that turns your pure Foldkit program description into
a running browser program.

A typical project keeps that boundary in two files:

```text
src/main.ts
  pure application definitions

src/entry.ts
  Runtime.make...
  Runtime.run / embed / hydrate
```

Keeping startup side effects in `entry.ts` means `main.ts` remains directly
importable from tests.

The Runtime API makes **two independent choices**:

```text
WHAT DOES THE PROGRAM OWN?
  makeApplication
  makeElement

WHO OWNS THE RUNTIME LIFETIME?
  run
  embed
```

Those axes are the center of this demo.

# 1. `makeApplication` vs `makeElement`

## `Runtime.makeApplication`

Use when the Foldkit program owns the page.

```ts
const application =
  Runtime.makeApplication({
    Model,
    init,
    update,
    view,
    subscriptions,
    container
  })
```

Its view returns:

```ts
Document
```

so Runtime may synchronize page-level state from the Model:

```text
document.title
<html lang>
<html dir>
<link rel="canonical">
<meta property="og:url">
```

An Application may also opt into Foldkit URL routing.

One page should normally have one page-owning application.

## `Runtime.makeElement`

Use when Foldkit owns only one container inside a page controlled by something
else.

```ts
const element =
  Runtime.makeElement({
    Model,
    init,
    update,
    view,
    subscriptions,
    container
  })
```

Its view returns:

```ts
Html
```

rather than `Document`.

The element runtime never manages:

```text
document <head>
<html> attributes
URL routing
```

That prevents a Foldkit widget from overwriting the host page's metadata.

The rest of the architecture is still available:

- Model
- Messages
- init
- update
- Commands
- Subscriptions
- Resources
- ManagedResources
- crash handling
- DevTools

## Flags difference

A page-owning Application receives its client Flags Effect when it starts:

```ts
Runtime.run(
  application,
  { flags }
)
```

For a self-contained `makeElement` program with Flags, the Flags Effect belongs
in the element config itself.

That keeps startup input aligned with the ownership boundary.

# 2. `Runtime.run` vs `Runtime.embed`

This is separate from Application vs Element.

Both runtime starters can work with programs created by either constructor.

## `Runtime.run`

```ts
Runtime.run(program)
```

means:

```text
runtime lifetime = page lifetime
```

It returns:

```ts
void
```

The program starts in the container and continues for the page lifetime.

On a fresh client boot, Runtime builds the DOM from the initial view.

For server-rendered markup, use `Runtime.hydrate` instead.

## `Runtime.embed`

```ts
const handle =
  Runtime.embed(program)
```

means:

```text
runtime lifetime = host-controlled
```

This is for embedding Foldkit inside:

- React
- another framework
- a larger host shell
- anything that mounts/unmounts the widget

It returns an:

```ts
EmbedHandle
```

The host tears the runtime down with:

```ts
handle.dispose()
```

Disposal:

- stops the runtime scope
- interrupts its lifecycle work
- removes the rendered Foldkit DOM
- restores the empty container so a runtime can be embedded there again

A given program can be embedded only once at a time because it owns one
container.

After dispose, the same container can host a new program again.

## Ports are the embed boundary

When using embedding, the host does not:

```text
read Foldkit Model
dispatch Foldkit Messages directly
```

It communicates through Schema-typed Ports.

Conceptually:

```text
HOST
  ↓ inbound Port
FOLDKIT RUNTIME
  ↓ outbound Port
HOST
```

The returned EmbedHandle exposes those Port handles plus `dispose`.

The separate Embedding guide goes deeper on Ports.

# 3. Routing

Routing belongs only to:

```ts
makeApplication
```

because `makeElement` does not own the page URL.

## Without routing

Most applications can simply omit the config:

```ts
const application =
  Runtime.makeApplication({
    Model,
    init,
    update,
    view,
    container
  })

Runtime.run(application)
```

The program does not manage the URL bar.

Its init shape is:

```ts
init()
```

or, when Flags exist:

```ts
init(flags)
```

## With routing

Add:

```ts
routing: {
  onUrlRequest:
    request =>
      Message.ClickedLink({
        request
      }),

  onUrlChange:
    url =>
      Message.ChangedUrl({
        url
      })
}
```

Now routed init receives the current URL:

```ts
const init:
  Runtime.RoutingApplicationInit<
    Model,
    Message
  > =
  url => ({
    model:
      ...
  })
```

With both Flags and routing:

```ts
init(flags, url)
```

## `onUrlRequest`

A clicked link becomes:

```text
UrlRequest
→ Message
→ update
```

so update can decide whether the request should be:

- internal Foldkit navigation
- external browser navigation
- ignored / transformed

The Runtime doesn't hardcode your domain navigation policy.

## `onUrlChange`

When the browser URL changes, Runtime maps it through:

```ts
onUrlChange
```

to another Message.

Update can then store the corresponding route in Model.

The routing loop therefore remains:

```text
browser URL event
→ Message
→ update
→ Model
```

rather than a separate mutable router store.

# 4. What Runtime actually orchestrates

The demo's loop panel summarizes the runtime's job:

## 1. Boot

Resolve startup input:

```text
Resources
Flags if present
init
```

to obtain the first Model and any startup Commands.

## 2. Render

Call:

```text
view(Model)
```

and build/patch the DOM.

For an Application this also includes the returned `Document` metadata.

## 3. Browser event

Typed view attributes turn browser data into Messages.

## 4. Update

Call:

```ts
update(
  currentModel,
  message
)
```

to obtain:

```text
next Model
optional Commands
```

## 5. Commit / lifecycle reconciliation

Runtime makes the new application description real:

- patch DOM
- update Document metadata where applicable
- reconcile Subscriptions
- reconcile ManagedResources
- execute returned Commands
- keep shared Resources available
- manage Mount lifetimes
- run configured runtime tooling / warnings / crash handling

## 6. Async results re-enter the same loop

Command and Subscription outputs are Messages.

They are dispatched through:

```text
Message
→ update
→ Model
```

again.

Runtime is therefore the executor around the pure core loop, not another place
for application business logic.

# Why `entry.ts` is useful

Recommended shape:

```ts
// main.ts

export {
  Model,
  Message,
  init,
  update,
  view,
  subscriptions
}
```

Then:

```ts
// entry.ts

import {
  Runtime
} from "foldkit"

import {
  Model,
  init,
  update,
  view,
  subscriptions
} from "./main"

const application =
  Runtime.makeApplication({
    Model,
    init,
    update,
    view,
    subscriptions,
    container:
      document.getElementById(
        "root"
      )
  })

Runtime.run(application)
```

Tests import:

```ts
main.ts
```

without starting browser runtime side effects.

# Server-rendered startup

A client-only page uses:

```ts
Runtime.run(application)
```

A server-rendered page uses:

```ts
Runtime.hydrate(
  application,
  {
    buildId:
      import.meta.env
        .FOLDKIT_BUILD_ID
  }
)
```

Hydration adopts the server-rendered DOM rather than rebuilding it fresh.

It reconstructs startup state from the server Flags handoff rather than running
a fresh client Flags Effect.

The Server Rendering guide covers the full handoff and deployment/build-id
rules.

# Runtime program options

The current runtime program types also allow the application boundary to wire
in capabilities such as:

```text
subscriptions
ports
resources
managedResources
crash
slow
viewTransition
freezeModel
preserveScroll
devTools
```

Not every application needs all of these.

The important architectural pattern is that they are declared at the Runtime
boundary instead of imported as hidden global state inside update/view.

# Container identity

Current Runtime construction expects a real container.

For normal client startup:

```ts
container:
  document.getElementById(
    "root"
  )
```

The runtime also uses container/runtime identity for state-preserving
development reload behavior.

A missing container is a startup error rather than a silent no-op.

For server-rendered markup, Foldkit finds the stamped server root during
hydration.

# Real Foldkit APIs used in this demo

The source includes real, non-starting factory functions using:

- `Runtime.makeApplication`
- `Runtime.makeElement`
- `Runtime.ApplicationInit`
- `Runtime.RoutingApplicationInit`
- routing `onUrlRequest`
- routing `onUrlChange`
- `Command.define`
- `Subscription.make`
- `Subscription.persistent`
- `Document`
- `Html`
- `HtmlBuilder`
- `UrlRequest`
- `Url`
- `defineMessageUnion`
- `Message.match`
- `Update.Return`
- `evo`

The source deliberately **does not call**:

```ts
Runtime.run
Runtime.embed
```

at module import time.

Instead it exports the startup sketches as strings so copying the lesson into a
running learn application cannot accidentally create a second page runtime.

# Core sequence

At this point the main core architecture is connected:

```text
Flags
  ↓
init
  ↓
Model
  ↓
View
  ↓
Message
  ↓
Update
  ↓
Model + Commands
  ↓
Runtime
  ↙       ↘
Commands  Subscriptions
  ↘       ↙
   Messages
```

and Submodels let that architecture be recursively decomposed behind explicit
boundaries.

The next docs after Runtime move into deployment/browser integration topics,
starting with:

```text
Server Rendering
Embedding
Routing & Navigation
```
