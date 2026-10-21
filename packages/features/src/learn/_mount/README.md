# Mount

## Mental model

Most Foldkit code is declarative:

```text
Model
→ View
→ Html
```

The view does not:

- hold DOM references
- measure elements
- attach imperative observers
- instantiate DOM-owning libraries
- perform lifecycle side effects

Mount is the escape hatch when the **cause of the work is a particular DOM
element existing**.

```text
element inserted
  ↓
h.OnMount(MountAction)
  ↓
Mount execute receives live Element
  ↓
setup / observer / library instance
  ↓
Message(s)
  ↓
element removed
  ↓
Mount scope closes
  ↓
cleanup finalizers run
```

There are two constructors:

```ts
Mount.define
```

for one Message at acquisition, and:

```ts
Mount.defineStream
```

for a continuing Stream of Messages.

# 1. Choose by cause, not timing

A side effect happening _after_ something rendered does not automatically make
it Mount work.

Ask what **causes** the work.

## Command

Use when:

```text
a Message caused one-shot work
```

Examples:

- navigation
- network request
- persistence
- analytics
- focus after `OpenedDialog`
- clipboard write

Even if an input becomes visible because a Message opened a dialog, focusing
that input is still caused by the Message.

Return a Command from update.

## Mount

Use when:

```text
this specific live DOM element exists
+
the work requires that live Element
```

Examples:

- read `getBoundingClientRect`
- attach ResizeObserver / IntersectionObserver
- attach an imperative listener to one rendered node
- portal a rendered node
- instantiate a chart/editor/map inside this element
- pair setup with cleanup for this element's lifetime

## Subscription

Use when:

```text
Model-derived dependencies
own an external Stream lifetime
```

Examples:

- timer while a mode is active
- window/document keyboard events
- system theme
- WebSocket messages

The source may be DOM-related, but if the lifetime is controlled by Model
dependencies rather than one element existing, it is a Subscription.

## ManagedResource

Use when:

```text
Model condition
owns a stateful handle
and Commands need to consume that handle
```

Examples:

- camera handle
- WebSocket connection object
- editor instance exposed to Commands

## CustomElement

Use when the foreign component already presents:

```text
properties
attributes
CustomEvents
```

as a declarative web-component API.

Use `CustomElement.define` instead of rebuilding that integration through
Mount.

# 2. `Mount.define`

A one-shot Mount executes once when the DOM node is inserted.

The demo uses:

```ts
export const MeasurePanel =
  Mount.define(
    "MeasurePanel",
    {
      args: {
        instanceId:
          Schema.String
      },

      messages: [
        Message.MeasuredPanel
      ],

      execute: ({
        element,
        instanceId
      }) =>
        Effect.gen(function* () {
          yield* Effect.acquireRelease(
            Effect.sync(() => {
              element.setAttribute(
                "data-foldkit-mounted",
                instanceId
              )

              return element
            }),

            mounted =>
              Effect.sync(() => {
                mounted.removeAttribute(
                  "data-foldkit-mounted"
                )
              })
          )

          return Message.MeasuredPanel({
            instanceId,

            width:
              element
                .getBoundingClientRect()
                .width
          })
        })
    }
  )
```

The view constructs a MountAction:

```ts
h.div(
  [
    h.OnMount(
      MeasurePanel({
        instanceId
      })
    )
  ],
  [...]
)
```

Calling:

```ts
MeasurePanel({
  instanceId
})
```

does **not** execute the Effect.

It only constructs the action.

The Runtime calls `execute` when the real DOM element enters the document.

## Result Message is required

A Mount declares at least one result Message:

```ts
messages: [
  Message.MeasuredPanel
]
```

Even when setup has no meaningful Model consequence, declare a descriptive
acknowledgment:

```text
CompletedPortalToBody
CompletedMountEditor
```

and let update return `{ model }`.

That keeps Mount work visible to:

- DevTools
- Scene tests
- replay / history tooling

# Setup and cleanup

Pair element-owned setup and teardown with:

```ts
Effect.acquireRelease
```

inside the Mount Effect.

Example:

```ts
yield* Effect.acquireRelease(
  Effect.sync(() => {
    const observer =
      new ResizeObserver(...)

    observer.observe(element)

    return observer
  }),

  observer =>
    Effect.sync(
      () => observer.disconnect()
    )
)
```

The Mount's scope remains open for the **full DOM-node lifetime**, even after
the one-shot Effect has produced its Message.

When the element is removed, Foldkit interrupts the Mount fiber and closes the
scope.

Registered finalizers then run.

Messages produced after interruption are discarded, so update does not receive
a result from an element that no longer exists.

# DOM node identity, not VNode identity

Foldkit reconstructs VNodes on each render.

That does not mean Mount reacquires every render.

When the differ reuses the same DOM node:

```text
same tag
+
same identity
```

the Mount remains alive.

When the node is replaced:

```text
old Mount scope closes
cleanup runs
new node inserted
new Mount starts
```

This is why stable keys matter.

For mapped items, key by a stable Model id so:

```text
data item
DOM node
Mount lifecycle
```

move together when a list is reordered.

The demo lets you change the element key to make this replacement lifecycle
visible.

# One Mount per element

This does **not** compose:

```ts
h.div([
  h.OnMount(A()),
  h.OnMount(B())
])
```

A VNode has one insert/destroy Mount hook.

The second `OnMount` replaces the first.

Combine both behaviors into one Mount and register all their resources /
finalizers inside that Mount's scope.

# Mount work must use `element`

A Mount's `execute` must genuinely need:

```ts
element
```

If it never reads or writes the supplied element, the cause is probably
something else.

Foldkit includes lint guidance around this distinction.

External side effects such as:

- network
- analytics
- storage writes

do not belong in Mount simply because the current screen has an element.

Use Commands.

# 3. Per-instance args

A Mount often has per-element acquisition input:

- stable host id
- initial scroll position
- chart data
- editor seed
- initial geometry config

Declare it as:

```ts
args: {
  instanceId:
    Schema.String
}
```

The runtime fields:

```text
element
viewStateChanges
```

are reserved names and cannot be declared in `args`.

The `execute` input combines:

```text
live Element
viewStateChanges Stream
declared args
```

## Args are captured at mount

This is crucial.

A MountAction can be reconstructed every render:

```ts
MountChart({
  data: latestData
})
```

but if the existing DOM node is reused, Foldkit does **not** rerun Mount
`execute`.

The Mount keeps the args from its acquisition render.

Therefore name Mount args as initial/lifecycle values:

```text
initialScroll
hostId
seedValue
```

not as if they were reactive properties.

When later Model changes should cause new one-shot work:

```text
Message
→ update
→ Command
```

When changing Model values should control an ongoing Stream lifetime:

```text
Subscription
```

Mount args are neither.

# 4. `Mount.defineStream`

Use the Stream form when one element continuously produces Messages.

The downloadable demo attaches a scroll listener:

```ts
export const ObservePanelScroll =
  Mount.defineStream(
    "ObservePanelScroll",
    {
      args: {
        instanceId:
          Schema.String
      },

      messages: [
        Message.ObservedPanelScroll
      ],

      execute: ({
        element,
        instanceId
      }) =>
        Stream.callback(queue =>
          Effect.gen(function* () {
            const scrollElement =
              element as HTMLElement

            yield* Effect.acquireRelease(
              Effect.sync(() => {
                const handler = () =>
                  Queue.offerUnsafe(
                    queue,
                    Message.ObservedPanelScroll({
                      instanceId,
                      scrollTop:
                        scrollElement.scrollTop
                    })
                  )

                element.addEventListener(
                  "scroll",
                  handler,
                  { passive: true }
                )

                return handler
              }),

              handler =>
                Effect.sync(() =>
                  element.removeEventListener(
                    "scroll",
                    handler
                  )
                )
            )

            return yield* Effect.never
          })
        )
    }
  )
```

The listener exists exactly as long as the element exists.

The same shape works for:

- IntersectionObserver
- MutationObserver
- ResizeObserver
- element-specific DOM events

When a stream's lifetime is instead driven by Model state, use Subscription.

# Third-party libraries

Mount is an especially natural boundary when a library takes a DOM element as
its host.

Examples:

- chart
- code editor
- map
- force graph
- canvas renderer

Construct the handle **inside the acquire Effect**:

```ts
const editor =
  yield* Effect.acquireRelease(
    Effect.sync(
      () =>
        new Editor({
          element
        })
    ),

    editor =>
      Effect.sync(
        () => editor.destroy()
      )
  )
```

Do not construct the handle first and then pass an already-created value to
`acquireRelease`.

`acquireRelease` only guarantees:

```text
acquire succeeds
→ release is registered
```

Creating the resource before the acquire body can leak it if interruption lands
between construction and release registration.

Whatever cleanup needs should be the success value of the acquire Effect.

# 5. Historical views and `viewStateChanges`

DevTools time travel can install historical DOM while the **live application
continues** behind it.

These continue normally:

- live Model
- history
- Commands
- Subscriptions
- ManagedResources
- live-acquired Mount async work

A Mount's execute input therefore includes:

```ts
viewStateChanges:
  Stream.Stream<
    "Live" | "Paused"
  >
```

The Stream starts with the current rendered-view state at acquisition.

This matters even when asynchronous setup happens first: a Mount acquired from
a historical render still receives `Paused` first when it eventually consumes
the stream.

## Make imperative UI read-only while Paused

The downloadable example uses:

```ts
yield* viewStateChanges.pipe(
  Stream.runForEach(
    state =>
      Effect.sync(() => {
        editor.setEditable(
          state === "Live"
        )
      })
  ),
  Effect.forkScoped
)
```

During:

```text
Paused
```

the imperative integration should stop DOM-derived interaction that could emit
live Messages.

During:

```text
Live
```

it restores normal interaction.

Do **not** turn this into:

```ts
Message.ViewPaused()
```

`Paused` describes which Model the **DOM currently represents**, not a change
to the application's actual Model.

## Live Mounts are not restarted by time travel

A Mount acquired by the live view remains acquired across pause/resume.

Its `viewStateChanges` stream changes state.

A Mount acquired specifically by a historical render is different: Messages
from that acquisition cannot reach the live update/history.

If resume reuses that DOM element, Foldkit releases the replay acquisition
before starting the live Mount action.

Cleanup completes before replacement setup starts.

# Replay safety

DevTools can re-render historical Models.

That means Mounts may execute again as historical elements enter the DOM.

Keep Mount work:

- local to the element
- idempotent
- safe to repeat

Good:

- DOM measurement
- paired DOM manipulation
- observers
- element-owned library instance

Bad:

- network POST
- analytics event
- storage write
- external irreversible mutation

Those belong in Commands.

# Scene testing

Rendered `OnMount` actions are visible to Foldkit Scene tests.

A Scene must acknowledge or resolve each pending Mount using one of the
Mount's declared result Messages.

Per-instance args allow a Scene to target the exact Mount instance:

```text
Mount.expectHas(...)
Mount.resolve(...)
```

The same named definition / args that make Mount observable in DevTools also
make it testable without running the real imperative integration.

# Lifecycle choice summary

Use:

## Command

```text
Message caused one-time effect
```

## Mount

```text
this DOM element exists
+
work needs the live Element
```

## Subscription

```text
Model dependencies own an ongoing Stream
```

## ManagedResource

```text
Model condition owns a handle
+
Commands use that handle
```

## CustomElement

```text
foreign element already exposes
declarative JS properties + CustomEvents
```

The timing may look similar across these APIs.

The **cause / lifetime owner** is the deciding factor.

# Real Foldkit APIs used

The bundle uses:

- `Mount.define`
- `Mount.defineStream`
- `Mount.ViewState`
- `Mount.mapMessage`
- `h.OnMount`
- `h.Key`
- Mount `args`
- declared Mount result Messages
- `viewStateChanges`
- `Effect.acquireRelease`
- `Effect.forkScoped`
- `Stream.callback`
- `Stream.runForEach`
- `Queue.offerUnsafe`
- `defineMessageUnion`
- `Message.match`
- `Update.Return`
- `evo`

# Documentation sequence

Mount sits after View Transitions in the current core docs and before:

```text
CustomElement
Dom
Render
Canvas
File
Http
...
```

Those next modules are more specific browser/integration tools.

Mount is the general imperative DOM lifecycle boundary underneath many of those
integrations.
