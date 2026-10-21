# Messages

## Mental model

A Foldkit Message is a **fact about something that happened**.

It is not an instruction to mutate the Model.

Good:

```ts
ClickedIncrement
UpdatedSearch
SucceededLoadNotes
FailedLoadNotes
```

Less useful:

```text
Increment
SetSearch
ADD_COUNT
MakeLoadSuccessful
```

Why?

Because update owns the application's response.

The same fact:

```ts
ClickedIncrement
```

might mean:

```text
today:
  store count + 1 locally

later:
  return a Command asking a server
  for the canonical next count
```

The Message can remain stable because it records the cause, not the chosen
implementation.

## 1. Facts, not instructions

The demo uses:

```ts
AppEvent.ClickedIncrement()
```

with two possible policies:

```text
Local
ServerOwned
```

Under the local policy, update increments the Model.

Under the alternative policy, the visual explanation shows that update could
instead keep the current Model and return a Command.

The event name does not need to change.

This is the core rule from the Foldkit Messages guide:

> Messages describe what happened. Update defines the resulting transition.

## 2. defineMessageUnion

Declare all variants together:

```ts
const AppEvent =
  defineMessageUnion({
    ClickedIncrement: {},

    UpdatedSearch: {
      value: Schema.String
    },

    SucceededLoadNotes: {
      count: Schema.Number
    },

    FailedLoadNotes: {
      error: Schema.String
    }
  })

type AppEvent =
  typeof AppEvent.Type
```

Every key becomes a callable constructor:

```ts
AppEvent.ClickedIncrement()

AppEvent.UpdatedSearch({
  value: "effect"
})

AppEvent.SucceededLoadNotes({
  count: 3
})

AppEvent.FailedLoadNotes({
  error: "timeout"
})
```

Constructed values are tagged facts:

```ts
{
  _tag: "UpdatedSearch",
  value: "effect"
}
```

The returned union is also a Schema, so payload fields are runtime schemas as
well as TypeScript types.

## Naming convention

Foldkit recommends verb-first, past-tense names that identify the cause.

### Clicked\*

User clicks:

```ts
ClickedSave
ClickedDelete
ClickedIncrement
```

### Updated\*

Input changes:

```ts
UpdatedEmail
UpdatedSearch
UpdatedDraft
```

### Succeeded* / Failed*

Command results where success/failure is meaningful:

```ts
SucceededLoadUser
FailedLoadUser
```

### Completed\*

A result where separating success/failure is unnecessary:

```ts
CompletedAnimation
```

### Got\*

Reserved for facts lifted from a child Submodel:

```ts
GotComposerMessage
```

## 3. Exhaustive Message.match

A message union exposes exhaustive matching:

```ts
Message.match<Update.Return<Model, Message>>(
  message,
  {
    ClickedIncrement: () => ...,

    UpdatedSearch: ({ value }) => ...,

    SucceededLoadNotes: ({ count }) => ...,

    FailedLoadNotes: ({ error }) => ...
  }
)
```

Adding a new Message variant means exhaustive matches must acknowledge the new
case.

This is useful because your event vocabulary and your update coverage evolve
together.

Message unions intentionally expose:

- constructors
- exhaustive `match`

For partial matching or one handler shared across several tags, Foldkit
recommends Effect `Match`.

## The demo itself uses the current API

The teaching demo's own controls are declared with:

```ts
export const Message =
  defineMessageUnion({
    SelectedMessagesStage: {
      stage: Stage
    },

    ClickedDemoIncrement: {},

    SelectedCounterPolicy: {
      policy: CounterPolicy
    },

    ...
  })
```

and its update function is:

```ts
Message.match<UpdateReturn>(
  message,
  {
    ...
  }
)
```

So this lesson is implemented using the API it is explaining.

## 4. Parent / child boundaries

A child keeps its own Message vocabulary:

```ts
const ComposerMessage =
  defineMessageUnion({
    UpdatedDraft: {
      value: Schema.String
    },

    ClickedSubmit: {}
  })
```

The parent does not have to flatten those tags into its own union.

Instead:

```ts
const ParentMessage =
  defineMessageUnion({
    ClickedClose: {},

    GotComposerMessage: {
      message: ComposerMessage
    }
  })
```

Then:

```ts
ParentMessage.GotComposerMessage({
  message:
    ComposerMessage.UpdatedDraft({
      value: "Hello Foldkit"
    })
})
```

This gives the Submodel a boundary it can grow behind.

The parent needs to understand one event:

```text
GotComposerMessage
```

rather than every internal child Message name.

This is particularly useful for a child that is likely to grow or that also
reports `OutMessage`s.

## Keep the owning union visible

Prefer:

```ts
Message.ClickedSubmit()
```

over:

```ts
const {
  ClickedSubmit
} = Message

ClickedSubmit()
```

Likewise for child / output unions:

```ts
ComposerMessage.UpdatedDraft(...)
OutMessage.SucceededSave(...)
```

Keeping the namespace in the call makes the owning domain visible when reading
the code.

## Real Foldkit APIs used

- `defineMessageUnion`
- callable Message constructors
- `Message.match`
- `Update.Return`
- `evo`

And Effect Schema for Message payloads:

- `Schema.String`
- `Schema.Number`
- `Schema.Literals`

## Architecture sequence

This lesson sits directly after Model:

```text
Model
→ Messages
→ Update
→ View
→ Commands
→ Subscriptions
```
