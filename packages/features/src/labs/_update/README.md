# Update

## Mental model

Foldkit has one function that defines application transitions:

```ts
update(
  model: Model,
  message: Message
)
```

It returns:

```ts
{
  model: nextModel,
  commands?: [...]
}
```

The central rule is:

```text
update is pure
Runtime performs Commands
```

Given the same Model and Message, update should return the same result.

Do **not**:

- mutate Model
- call browser APIs
- make HTTP requests
- start timers
- execute arbitrary side effects

inside update.

Describe those effects with Commands and return them alongside the next Model.

## 1. Pure transition

Canonical shape:

```ts
const update = (
  model: Model,
  message: Message
) =>
  Message.match<
    Update.Return<Model, Message>
  >(message, {
    ClickedIncrement: () => ({
      model: evo(model, {
        count:
          count => count + 1
      })
    }),

    ClickedReset: () => ({
      model: evo(model, {
        count: () => 0
      })
    })
  })
```

`Message.match` keeps the Message handling exhaustive.

`evo` updates named fields with functions:

```ts
evo(model, {
  count:
    count => count + 1
})
```

Omitted fields retain their current values / references.

As the Model grows, the branch still describes only the state that actually
changes.

## `Update.Return`

For an update that cannot emit an OutMessage:

```ts
Update.Return<
  Model,
  Message
>
```

is conceptually:

```ts
{
  readonly model: Model
  readonly commands?:
    ReadonlyArray<Command<Message>>
  readonly outMessage?: never
}
```

The `outMessage?: never` part is deliberate. It prevents a result that might
emit an OutMessage from being silently passed into code that only keeps Model
and Commands.

## 2. Returning Commands

An update can change state and request work in one pure return value:

```ts
ClickedIncrement: () => {
  const nextCount =
    model.count + 1

  return {
    model: evo(model, {
      count: () => nextCount,
      isPersisting: () => true
    }),

    commands: [
      PersistCount({
        count: nextCount
      })
    ]
  }
}
```

The Runtime executes that Command **after update returns**.

When it finishes, its result is another Message:

```ts
CompletedPersistCount: ({
  count
}) => ({
  model: evo(model, {
    persistedCount: () => count,
    isPersisting: () => false
  })
})
```

This preserves the loop:

```text
Message
  ↓
update
  ↓
{ Model, Commands }
  ↓
Runtime executes Commands
  ↓
new Message
```

## Omit `commands` when there are none

Good:

```ts
{
  model
}
```

Good when a variable collection was actually computed:

```ts
{
  model,
  commands
}
```

Avoid a literal:

```ts
{
  model,
  commands: []
}
```

Foldkit's `no-empty-commands-array` lint rule rejects that literal shape.

Every Foldkit template also enables:

```text
exactOptionalPropertyTypes
```

so this is also a mistake:

```ts
{
  model,
  commands:
    anotherResult.commands
}
```

when `anotherResult.commands` can be `undefined`.

That error is often a clue that results are being composed manually instead of
with the Update helpers.

## Keep update-like results together

Prefer:

```ts
const formSubmit =
  update(
    model,
    Message.SubmittedForm()
  )

formSubmit.model
formSubmit.commands
```

over destructuring:

```ts
const {
  model: nextModel,
  commands
} = update(...)
```

Keeping dot access makes it clear which operation produced the Model,
Commands, and possible OutMessage.

Only normalize optional Commands to an array when the next operation actually
requires an array:

```ts
result.commands ?? []
```

for:

- spreading
- concatenation
- execution
- assertions

APIs such as `Command.mapMessages` accept optional Commands directly.

## 3. Composing Update Steps

A reusable Step is:

```ts
Update.Step<Model, Message>
```

conceptually:

```ts
(
  model: Model
) =>
  Update.Return<Model, Message>
```

Example:

```ts
const openDialog:
  Update.Step<Model, Message> =
  model => ({
    model: evo(model, {
      dialogOpen: () => true
    })
  })
```

Compose several Steps:

```ts
return Update.combine(
  model,
  [
    openDialog,
    clearStatus,
    queueAudit
  ]
)
```

Every Step receives the Model produced by the previous Step.

Commands are accumulated in Step order into the returned batch.

### Important Command-order rule

`Update.combine` preserves the order of Commands in the returned collection,
but the Runtime forks Commands independently.

Your application must **not** depend on:

```text
Command 1 completes
before
Command 2 completes
```

If work has an execution dependency, express that dependency inside one
Command / Effect rather than relying on the returned array order.

### Data-last form

`combine` is dual.

You can also create another Step:

```ts
const step =
  Update.combine([
    openDialog,
    clearStatus
  ])
```

and use it inside a larger composition.

Do not wrap one Step in `Update.combine`; just call that Step.

## 4. Folding a child update

A Submodel owns its:

- Model
- Message
- update

The parent should not manually unpack and reassemble every child result.

Create a fold:

```ts
const foldChildCounter =
  Update.foldChild({
    update: childUpdate,

    read:
      (model: Model) =>
        Option.some(model.child),

    write:
      (model, nextChild) =>
        evo(model, {
          child: () => nextChild
        }),

    toParentMessage:
      message =>
        Message.GotChildMessage({
          message
        })
  })
```

Then the parent branch is small:

```ts
GotChildMessage: ({
  message
}) =>
  foldChildCounter(
    model,
    message
  )
```

`foldChild`:

1. reads the child Model
2. runs child update
3. writes the next child Model
4. lifts child Commands into parent Messages

If the child is absent, `read` can return `Option.none()` and the fold leaves
the parent unchanged.

## Child initialization

For a child `init` / `boot` result use:

```ts
Update.foldChildInit(...)
```

rather than manually extracting:

```text
child.model
child.commands
child.outMessage
```

For several children use:

```ts
Update.foldChildInits(...)
```

It constructs the parent Model once and folds child OutMessages against that
complete parent state.

The order of the `folds` record controls the order of the **Model changes**.

Again, Commands themselves run independently.

## OutMessages

A Submodel that can report facts to its parent uses:

```ts
Update.ReturnWithOutMessage<
  Model,
  Message,
  OutMessage
>
```

which can contain:

```ts
{
  model,
  commands?,
  outMessage?
}
```

If the OutMessage is already known while constructing the result:

```ts
return {
  model,
  outMessage:
    OutMessage.Closed()
}
```

If you are attaching a known or optional OutMessage to an existing plain
result, use:

```ts
Update.withOutMessage(
  existingResult,
  outMessage
)
```

or pipe it:

```ts
pipe(
  existingResult,
  Update.withOutMessage(
    outMessage
  )
)
```

When `outMessage` is `undefined`, the helper omits the property.

This is safer than:

```ts
{
  ...existingResult,
  outMessage
}
```

because spreading can:

- write `outMessage: undefined`
- accidentally overwrite an OutMessage already produced elsewhere

`withOutMessage` only accepts a plain `Update.Return`, so it cannot replace an
existing OutMessage.

## Preventing lost OutMessages

This is intentionally a type error:

```ts
const childUpdate:
  Update.ReturnWithOutMessage<
    Child.Model,
    Child.Message,
    Child.OutMessage
  > =
  Child.update(...)

const plain:
  Update.Return<
    Child.Model,
    Child.Message
  > =
  childUpdate
```

Otherwise the caller could silently keep only:

```text
model
commands
```

and discard a child event that should have reached the parent.

The reverse is safe:

```ts
const plain:
  Update.Return<Model, Message> =
  { model }

const outward:
  Update.ReturnWithOutMessage<
    Model,
    Message,
    OutMessage
  > =
  plain
```

No `outMessage` property simply means that transition reported nothing outward.

## More advanced child OutMessage handling

`foldChild`, `foldChildStep`, `foldChildInit`, and entries in
`foldChildInits` support:

```ts
foldOutMessage
```

for handling a child's OutMessage locally.

They can also use:

```ts
toParentOutMessage
```

to translate / forward it to the parent's OutMessage type.

A local fold can derive a more complete OutMessage and replace the simple
forwarded value.

For multiple child initializations, `resolveOutMessage` can combine several
translated child OutMessages into one parent OutMessage after all local folds
have updated the parent Model.

This is useful when the fact that something occurred during initialization
cannot be reconstructed later from the final Model alone.

## Real Foldkit APIs used in the demo

- `Update.Return`
- `Update.ReturnWithOutMessage`
- `Update.Step`
- `Update.combine`
- `Update.foldChild`
- `Update.withOutMessage`
- `Command.define`
- `defineMessageUnion`
- `Message.match`
- `evo`

The example also uses:

- Effect `Schema`
- `Option`
- `Effect.sleep`
- `Effect.succeed`

## Architecture sequence

So far:

```text
Model
→ Messages
→ Update
```

The next core page is:

```text
View
```

which closes the basic loop:

```text
Model
→ View
→ Message
→ Update
→ Model
```
