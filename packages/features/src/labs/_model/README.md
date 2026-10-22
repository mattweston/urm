# Foldkit Model — visual demo

This demo is based on the Foldkit Model guide:

- <https://foldkit.dev/core/model>

## Mental model

In Foldkit, the Model is the application's complete remembered state in one
immutable tree.

```ts
const Model = Schema.Struct({
  ...
})

type Model = typeof Model.Type
```

Every transition receives the current Model and returns the next Model.

This is intentionally different from splitting important application state
across component-local stores, singleton stores, and unrelated reactive cells.

## The miniature app used in the lesson

The source defines a small notes editor:

```ts
const EditorModel = Schema.Struct({
  notes: Schema.Array(Note),
  filter: NoteFilter,
  isSidebarOpen: Schema.Boolean,
  editorMode: EditorMode,
})
```

It is used throughout all four panels.

## 1. One State Tree

The first panel shows the whole editor state as one value:

```ts
{
  notes: [...],
  filter: "All",
  isSidebarOpen: true,
  editorMode: {
    _tag: "Browsing"
  }
}
```

Actions such as:

```text
add note
toggle sidebar
change editor mode
```

produce a new Model.

The state remains explicit and inspectable.

## 2. Runtime Schema

Foldkit Models are defined with Effect Schema:

```ts
const EditorModel = Schema.Struct({
  notes: Schema.Array(Note),
  filter: NoteFilter,
  isSidebarOpen: Schema.Boolean,
  editorMode: EditorMode,
})

type EditorModel =
  typeof EditorModel.Type
```

This gives you both:

```text
runtime Schema
+
TypeScript type
```

from one definition.

That matters because TypeScript types disappear after compilation.

Foldkit uses the Model Schema when encoding / decoding state preserved across
hot updates, and the same runtime Schema can validate unknown state at other
application boundaries.

The visual demo passes three snapshots through:

```ts
Schema.decodeUnknownResult(
  EditorModel
)(snapshot)
```

- valid Model
- missing required `notes`
- invalid tagged-union mode

## 3. State with Variants

Foldkit recommends `defineTaggedUnion` when a Model field has a closed set of
named state shapes.

```ts
const EditorMode =
  defineTaggedUnion({
    Browsing: {},
    Editing: {
      noteId: Schema.String
    },
    Previewing: {
      noteId: Schema.String
    }
  })
```

Construction:

```ts
EditorMode.Browsing()

EditorMode.Editing({
  noteId: "n-1"
})
```

Exhaustive matching:

```ts
EditorMode.match(mode, {
  Browsing: () =>
    "Browsing notes",

  Editing: ({ noteId }) =>
    `Editing ${noteId}`,

  Previewing: ({ noteId }) =>
    `Previewing ${noteId}`
})
```

If a new variant is added, TypeScript finds exhaustive matches that need a new
branch.

### Guards

One variant:

```ts
EditorMode.guards.Editing(mode)
```

Several variants:

```ts
const isWorking =
  EditorMode.isAnyOf([
    "Editing",
    "Previewing"
  ])
```

### Subset schemas

Build another runtime Schema that accepts only named variants:

```ts
const WorkingMode =
  EditorMode.subset([
    "Editing",
    "Previewing"
  ])
```

Foldkit intentionally uses positive subset lists rather than an `omit` API.
That means newly added variants are **not silently accepted** by an old
subset.

## 4. Stored vs Derived State

The editor Model stores:

```text
notes
filter
isSidebarOpen
editorMode
```

The demo deliberately does **not** store:

```text
visibleNotes
visibleCount
modeLabel
isWorking
```

Those values are derived:

```ts
const visibleNotes = (
  model: EditorModel
) =>
  model.filter === "All"
    ? model.notes
    : model.notes.filter(
        note =>
          note.status ===
          model.filter
      )
```

and:

```ts
const modeLabel = (
  mode: EditorMode
) =>
  EditorMode.match(...)
```

This follows the Foldkit guidance:

> Model the application, not the screen.

If a value is needed only to render the current frame and can be computed
deterministically from remembered facts, it usually does not need another
Model field.

That avoids duplicated state such as:

```text
filter = "Draft"
visibleCount = 3
```

becoming inconsistent after one field changes without the other.

## APIs used

The source uses:

### Foldkit

- `defineTaggedUnion`
- union constructors
- `match`
- `guards`
- `isAnyOf`
- `subset`
- `evo`
- `Update.Return`
- Foldkit messages

### Effect

- `Schema.Struct`
- `Schema.Array`
- `Schema.Literals`
- `Schema.decodeUnknownResult`
- `Result`
- `Match`

## Suggested placement

```text
packages/features/src/labs/foldkit/
├── examples/
│   └── model.ts
└── model.view.ts
```

## Next Foldkit core lessons

The natural sequence after Model is:

```text
Model
→ Messages
→ Update
→ View
→ Commands
→ Subscriptions
```

because that follows the actual Foldkit architecture loop.
