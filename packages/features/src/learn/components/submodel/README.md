# Submodel

## Mental model

Create a Submodel when part of the application owns a **state machine**, not
merely a section of markup.

A Submodel owns its own:

```text
Model
Message
update
view
Commands
Subscriptions
OutMessages
```

as needed.

The parent:

1. stores the child Model
2. wraps child Messages
3. delegates to the child update
4. embeds the child view
5. decides what to do with facts the child reports outward

This creates an explicit boundary.

A stateless reusable card does not need a Submodel.

A reusable Dialog, Menu, Settings feature, Login flow, list editor, etc. often
does.

## Demo child: Settings

The downloadable demo uses one child throughout:

```ts
const SettingsModel =
  Schema.Struct({
    theme: Theme,
    notificationsEnabled:
      Schema.Boolean
  })
```

with its own Message union:

```ts
const SettingsMessage =
  defineMessageUnion({
    ChangedTheme: {
      theme: Theme
    },

    ToggledNotifications: {}
  })
```

and its own update.

The child imports no root Model or root Message.

That is the boundary.

# 1. Ownership

The parent Model stores the child Model:

```ts
const ParentModel =
  Schema.Struct({
    currentUser:
      Schema.String,

    settings:
      SettingsModel,

    lastChildFact:
      Schema.String
  })
```

But storing the slice does **not** mean the parent owns its transitions.

## Never bypass child update

Avoid:

```ts
evo(parent, {
  settings:
    settings =>
      evo(settings, {
        theme:
          () => "Light"
      })
})
```

That bypasses:

- child invariants
- child Commands
- child OutMessages
- future child Model changes

Instead export a child-owned entry point:

```ts
export const setTheme = (
  model: SettingsModel,
  theme: Theme
) =>
  settingsUpdate(
    model,
    SettingsMessage.ChangedTheme({
      theme
    })
  )
```

and fold that helper from the parent.

The parent can initiate the transition without knowing how the child implements
it.

Stateful Foldkit UI Submodels use this same pattern for helpers such as close /
select-item operations.

# 2. Wrapping Messages

Every child Message eventually needs to reach root update.

The parent declares one wrapper:

```ts
const ParentMessage =
  defineMessageUnion({
    GotSettingsMessage: {
      message:
        SettingsMessage
    }
  })
```

The `Got*Message` convention matters.

Foldkit DevTools uses it to identify Submodel Message boundaries for filtering.

The wrapper is routing information.

For repeated children it may also carry a stable id:

```ts
GotApplicantMessage({
  entryId,
  message
})
```

Domain payload belongs in the child Message itself.

## `Update.foldChild`

Build the parent/child update bridge once:

```ts
const foldSettings =
  Update.foldChild({
    update:
      settingsUpdate,

    read:
      (model: ParentModel) =>
        Option.some(
          model.settings
        ),

    write:
      (
        model,
        nextSettings
      ) =>
        evo(model, {
          settings:
            () =>
              nextSettings
        }),

    toParentMessage:
      message =>
        ParentMessage.GotSettingsMessage({
          message
        }),

    foldOutMessage:
      foldSettingsOutMessage
  })
```

Then the parent update branch becomes:

```ts
GotSettingsMessage: ({
  message
}) =>
  foldSettings(
    model,
    message
  )
```

The fold:

1. reads the child
2. runs the child update
3. writes the next child back into parent
4. maps child Command result Messages through `GotSettingsMessage`
5. handles child OutMessage if one was emitted

## Why `read` returns Option

A routed or dynamic child can disappear before a queued Message arrives.

Example:

```text
row exists
  ↓
child starts Command
  ↓
row deleted
  ↓
late Command result arrives
```

The fold's `read` can now return:

```ts
Option.none()
```

and the late Message becomes a no-op.

For an always-present child:

```ts
Option.some(
  model.settings
)
```

is normal.

## Data-first and data-last

`foldChild` is dual.

Run it now:

```ts
foldSettings(
  model,
  message
)
```

or build an `Update.Step`:

```ts
foldSettings(
  message
)
```

for `Update.combine`.

## Parent context for child update

Do not duplicate shared parent state into the child Model just so child update
can read it.

If child update needs a current parent value, add a context argument:

```ts
update(
  childModel,
  childMessage,
  context
)
```

Then close over current parent state when constructing the fold:

```ts
const foldSettings =
  (currentUser: User) =>
    Update.foldChild({
      update:
        (settings, message) =>
          Settings.update(
            settings,
            message,
            {
              currentUser
            }
          ),

      ...
    })
```

The context is explicit, so update stays pure.

Changing context does not automatically notify the child. If the child needs to
react to a parent-state change, expose an `inform*` child helper and fold it
from the parent transition that observed the change.

# 3. View boundary

Define the child view with:

```ts
Submodel.defineView<
  SettingsModel,
  SettingsMessage
>(
  (model, h) => ...
)
```

That brands the child view with:

```text
child Model type
child Message type
```

and gives it:

```ts
HtmlBuilder<SettingsMessage>
```

Child handlers therefore dispatch only child Messages.

## Parent embed with `h.submodel`

The parent supplies four core values:

```ts
h.submodel({
  slotId:
    "settings",

  model:
    model.settings,

  view:
    Settings.view,

  toParentMessage:
    message =>
      ParentMessage.GotSettingsMessage({
        message
      })
})
```

Those fields mean:

### slotId

Identity of this **rendered position** under the current parent boundary.

### model

The child Model value for this instance.

### view

The branded child view.

### toParentMessage

The single wrapper from:

```text
ChildMessage
→ ParentMessage
```

The child stays decoupled from whichever parent embeds it.

## ViewInputs

Parent-owned values needed only for rendering should not be copied into the
child Model.

The demo uses:

```ts
type SettingsViewInputs =
  Readonly<{
    currentUser: string
    sectionLabel: string
  }>
```

and:

```ts
Submodel.defineView<
  SettingsModel,
  SettingsMessage,
  SettingsViewInputs
>(
  (
    model,
    viewInputs,
    h
  ) => ...
)
```

The parent supplies fresh values every render:

```ts
h.submodel({
  ...,

  viewInputs: {
    currentUser:
      model.currentUser,

    sectionLabel:
      "Preferences"
  }
})
```

Use this for parent data the child only needs to **render**.

If child update needs parent state, pass explicit update context instead.

## Top-level ViewInputs callbacks

A top-level function in `viewInputs` runs in the parent's boundary.

That lets the parent supply markup callbacks while the child supplies state.

Do not hide callbacks deeper inside nested arrays/objects in ViewInputs;
Foldkit rejects that because the dispatch boundary would be ambiguous.

## slotId and Model identity

`slotId` identifies a rendered position, not a Model value.

Two sibling embed sites need distinct slot ids even if they render the same
child Model.

For a dynamic list, use one stable Model id consistently for:

```text
h.keyed row key
slotId
GotChildMessage id
```

Example:

```ts
h.keyed("li")(
  applicant.id,
  [],
  [
    h.submodel({
      slotId:
        applicant.id,

      model:
        applicant.entry,

      view:
        Applicant.view,

      toParentMessage:
        message =>
          GotApplicantMessage({
            entryId:
              applicant.id,
            message
          })
    })
  ]
)
```

The corresponding fold closes over that same stable id to find/write the
matching child.

If profiling finds the child view expensive, Foldkit can memoize an embed site
with `createKeyedLazy`; key it with the same stable identity.

# 4. OutMessages

A wrapped child Message means:

```text
route this back into the child update
```

An OutMessage means:

```text
the child is reporting a fact
that its parent may care about
```

These are different directions.

The demo child defines:

```ts
const SettingsOutMessage =
  defineMessageUnion({
    SelectedTheme: {
      theme: Theme
    }
  })
```

A theme transition returns:

```ts
ChangedTheme: ({
  theme
}) => ({
  model:
    evo(model, {
      theme: () => theme
    }),

  outMessage:
    SettingsOutMessage.SelectedTheme({
      theme
    })
})
```

The fact is past tense / descriptive.

The child does not tell the parent what consequence to perform.

## ReturnWithOutMessage

A child with outward facts uses:

```ts
Update.ReturnWithOutMessage<
  SettingsModel,
  SettingsMessage,
  SettingsOutMessage
>
```

Most branches omit `outMessage`.

Only the transition that has a fact to surface includes one.

## Parent handling with `foldOutMessage`

Define one exhaustive OutMessage fold:

```ts
const foldSettingsOutMessage = (
  outMessage:
    SettingsOutMessage,

  _context:
    Update.FoldContext<
      SettingsMessage,
      ParentMessage
    >
) =>
  SettingsOutMessage.match<
    Update.Step<
      ParentModel,
      ParentMessage
    >
  >(
    outMessage,
    {
      SelectedTheme:
        ({ theme }) =>
        model => ({
          model:
            evo(model, {
              lastChildFact:
                () =>
                  `SelectedTheme(${theme})`
            })
        })
    }
  )
```

Pass it to `foldChild`.

Important order:

```text
child update
  ↓
next child Model written into parent
  ↓
foldOutMessage Step runs
```

So the parent OutMessage handler sees the completed parent Model.

The Step's Commands are appended after the child's lifted Commands.

## FoldContext

The OutMessage fold receives:

```ts
Update.FoldContext<
  ChildMessage,
  ParentMessage
>
```

with:

```ts
liftCommand
liftCommands
```

Use these if the parent's response to an OutMessage returns a Command whose
result belongs back inside the child's Message boundary.

That avoids duplicating the wrapper mapping.

## Do not manually unpack child results

Avoid:

```ts
const {
  model,
  commands
} =
  Child.update(...)
```

when child update may also return:

```ts
outMessage
```

That can silently leave the outward fact behind.

Use:

- `Update.foldChild`
- `Update.foldChildStep`
- `Update.foldChildInit`
- `Update.foldChildInits`

so child Model, lifted Commands, and OutMessage travel together.

## Forwarding OutMessages upward

If the parent is itself a Submodel and some child facts should continue to its
parent, the child fold can also declare:

```ts
toParentOutMessage
```

It may:

- forward one child OutMessage to parent OutMessage
- return `undefined` for variants that stop locally

`foldOutMessage` can still handle the fact locally.

A derived parent OutMessage emitted by that local Step replaces the direct
one-to-one forwarding for that dispatch.

# Parent-rendered child behavior: childAttributes

Some Submodels own behavior while the consumer chooses the DOM.

Examples include:

- Tooltip
- Dialog
- Popover
- selection controls

The child may expose attribute bundles via a top-level slot callback.

Those attributes contain child-built handlers and must still dispatch through
the child boundary even though the parent constructs the actual element.

Submodel authors use:

```ts
childAttributes([
  h.OnClick(
    ChildMessage.SelectedItem(...)
  ),
  ...
])
```

before handing those attributes to the parent callback.

The carried child dispatcher ensures those handlers route through the child,
not directly into the parent update.

Consumers simply spread the supplied bundle.

Stateless / controlled render helpers do not need `childAttributes`.

# When to create a Submodel

Use a Submodel when the piece owns a real state machine:

- internal interaction state
- child-specific Messages
- child update rules
- Commands / Subscriptions
- focus / keyboard / accessibility state
- outward domain facts
- reusable encapsulated behavior

Do not create one merely because markup is visually grouped.

A plain view helper is enough when the section:

```text
renders parent state
+
owns no Messages/update state
```

# Testing

Child update can be tested with Story just like root update.

Child view can be tested with Scene just like root view.

For OutMessages, use the OutMessage assertion helpers such as
`expectOutMessage`.

For child update with context, close over the test context:

```ts
(model, message) =>
  Settings.update(
    model,
    message,
    {
      currentUser
    }
  )
```

# Real Foldkit APIs used

The source includes:

- `Submodel.defineView`
- `h.submodel`
- `viewInputs`
- `Update.foldChild`
- `Update.ReturnWithOutMessage`
- `Update.Step`
- `Update.FoldContext`
- `foldOutMessage`
- `defineMessageUnion`
- `Message.match`
- `Option`
- `evo`

The README also covers:

- parent context for child update
- dynamic repeated children
- stable slot ids
- `foldChildStep`
- `foldChildInit`
- `foldChildInits`
- `toParentOutMessage`
- `childAttributes`
- testing Submodels

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
→ Submodel
```

The next core page is:

```text
Runtime
```

which ties the whole Foldkit application description to the browser execution
loop.
