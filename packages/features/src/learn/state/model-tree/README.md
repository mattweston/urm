# learn/model-tree

A Foldkit learning demo for URM's Model/Submodel architecture.

## What it shows

The demo presents two file-tree-style diagrams side by side:

1. **Runtime Model tree** — parent Models own feature Models as typed fields.
2. **Sidebar tree** — the navigation hierarchy mirrors the same feature/module boundaries.

It also explains the message flow used by URM:

```text
child Message
    ↓
GotChildMessage
    ↓
Child.update(childModel, childMessage)
    ↓
replace parent.child
    ↓
Command.mapMessages(...)
```

and the matching view boundary:

```ts
h.submodel({
    slotId: "labs-mail-inbox",
    model: model.mailroom,
    view: Mailroom.view,
    toParentMessage: (message) =>
        GotMailroomMessage({ message }),
})
```

## Why the sidebar is described as a "mirror"

This is deliberately phrased as a conceptual mirror rather than claiming the sidebar is generated directly from the Model schema.

URM's navigation settings currently encode the same module hierarchy with explicit presentation rules, including:

- `Pages` is displayed as **Web**
- `Documents` is nested inside **Content**
- `Blog` is nested inside **Web**
- sidebar order, hidden modules, and enabled modules are separate navigation state

That makes the relationship:

```text
Model tree                  Sidebar projection

content                     Content
├─ documents                └─ Documents
└─ blog                     Web
                            └─ Blog

mail                        Mail
settings                    Settings
```

The left side is **runtime state ownership**.
The right side is **user-facing navigation**.

They should remain conceptually aligned even though labels and nesting can differ.

## Source references used

This demo was based on the current repository versions of:

- `packages/features/src/labs/file-tree/file-tree.ts`
- `packages/features/src/labs/file-tree/view.ts`
- `packages/features/src/labs/submodel.ts`
- `packages/features/src/settings/navigation/index.ts`

In particular, `labs/submodel.ts` demonstrates the real URM parent/child pattern with `GotLandingMessage`, `GotMailroomMessage`, `Command.mapMessages`, and `h.submodel`.

## Suggested destination

Copy this folder to:

```text
packages/features/src/learn/model-tree/
```

The view imports the existing tree component with:

```ts
../../labs/file-tree/file-tree.ts
```

## Parent integration

The feature is intentionally self-contained. Add it to whichever Learn parent owns the route:

```ts
import * as ModelTree from "./model-tree/index.ts"
```

Parent model:

```ts
model_tree: ModelTree.Model
```

Parent message:

```ts
ModelTree.Message
```

Init:

```ts
model_tree: ModelTree.init
```

Update:

```ts
if (S.is(ModelTree.Message)(message)) {
    const [model_tree, commands] =
        ModelTree.update(model.model_tree, message)

    return [
        evo(model, { model_tree: () => model_tree }),
        commands,
    ]
}
```

Or, if the Learn parent wraps child Messages explicitly, map it in the same style as `labs/submodel.ts`.

## Notes

This folder does not modify the repository. It is designed for Foldkit `0.148.2` / Effect `4.0.0-rc.112`, matching the current URM workspace versions observed while preparing the demo.
