# Foldkit View — visual demo

## Mental model

A Foldkit view is a pure function:

```ts
Model
→ Html / Document
```

Given the same Model, it produces the same output.

It does not:

- mutate state
- run Effects
- perform HTTP work
- start timers
- own component-local hook state

The view describes:

1. what the user should see
2. which Messages user/browser interactions can report

Update decides what those Messages mean.

## The basic loop

With Model, Messages, Update, and View together:

```text
Model
  ↓
View
  ↓
Html
  ↓
browser interaction
  ↓
Message
  ↓
Update
  ↓
Model
```

This completes the pure core loop.

## 1. Model in, HTML out

A root view receives:

```ts
(
  model: Model,
  h: HtmlBuilder<Message>
)
```

and returns a `Document`:

```ts
const view = (
  model: Model,
  h: HtmlBuilder<Message>
): Document => ({
  title: `Counter ${model.count}`,

  body: h.main(
    [],
    [
      h.h1(
        [],
        [String(model.count)]
      ),

      h.button(
        [
          h.OnClick(
            Message.ClickedIncrement()
          )
        ],
        ["Increment"]
      )
    ]
  )
})
```

The important part is not the syntax; it is the direction:

```text
Model → description of UI
```

There is no imperative:

```text
setText
setTitle
setVisible
addEventListener
```

inside application view code.

Return what the DOM / document should look like, and the runtime makes the
rendered output match.

## No hook rules

Unlike a React function component, a Foldkit view:

- has no hooks
- has no hook ordering
- has no component-local effect lifecycle
- has no hidden mutable local state

It is just a function from state to markup.

## 2. The Document

A `makeApplication` view returns:

```ts
Document
```

with required:

```ts
title
body
```

and optional document-level state:

```ts
lang
dir
canonical
ogUrl
```

Example from the demo:

```ts
export const applicationView = (
  model: Model,
  h: HtmlBuilder<Message>
): Document => ({
  title:
    model.locale === "English"
      ? `Counter ${model.count}`
      : `العداد ${model.count}`,

  lang:
    languageTag[model.locale],

  dir:
    textDirection[model.locale],

  canonical:
    "https://example.test/counter",

  ogUrl:
    "https://example.test/counter",

  body: ...
})
```

### `title`

The runtime synchronizes:

```ts
document.title
```

to the returned value.

### `lang`

Synchronizes the root `<html lang>`.

If omitted, the current HTML attribute remains unchanged.

### `dir`

One of:

```ts
"Ltr"
"Rtl"
"Auto"
```

The runtime writes the lowercase DOM value.

### `canonical`

Synchronizes:

```html
<link rel="canonical">
```

If omitted, it defaults to the current URL.

### `ogUrl`

Synchronizes:

```html
<meta property="og:url">
```

If omitted, it defaults to `canonical`.

If both are omitted they resolve to the current URL.

### Embedded applications

A `makeElement` view returns `Html` rather than `Document`.

An embedded application does not own:

- document title
- page language
- canonical metadata

so it cannot declare them.

## 3. Typed `HtmlBuilder`

Every live view receives:

```ts
h: HtmlBuilder<Message>
```

The Message type follows the builder.

That means this builder:

```ts
HtmlBuilder<Message>
```

can construct handlers that dispatch exactly that Message universe.

Example:

```ts
h.button(
  [
    h.OnClick(
      Message.ClickedIncrement()
    )
  ],
  ["Increment"]
)
```

A Message from an unrelated union is rejected by TypeScript.

### Elements

Children-taking elements use:

```ts
h.div(
  attributes,
  children
)
```

When there are no children, omit the second argument:

```ts
h.div([
  h.Class("divider")
])
```

not:

```ts
h.div(
  [h.Class("divider")],
  []
)
```

Foldkit's `no-empty-children-array` lint rule catches the redundant form.

Attributes remain required, so:

```ts
h.div([])
```

means an element with no attributes and no children.

### Void elements

Elements such as:

```ts
h.img
h.br
```

accept attributes only.

### textarea

`h.textarea` also accepts attributes only.

Set live content with:

```ts
h.Value(model.text)
```

not children.

## Extracted view helpers

Take the builder as the final argument:

```ts
const countView = (
  count: number,
  h: HtmlBuilder<Message>
): Html =>
  h.div(
    [],
    [String(count)]
  )
```

A helper reusable under any Message universe can be generic:

```ts
const genericNotice =
  <ParentMessage>(
    text: string,
    h: HtmlBuilder<ParentMessage>
  ): Html =>
    h.p([], [text])
```

Application code does not construct `HtmlBuilder` itself.

The live builder enters through the view boundary and is threaded through
helpers.

## `inertHtml`

At module scope there is no live builder.

Use:

```ts
import {
  inertHtml as ih
} from "foldkit/html"
```

It is typed:

```ts
HtmlBuilder<never>
```

so it can build handler-free markup:

```ts
const badge = ih.span(
  [ih.Class("badge")],
  ["Static"]
)
```

but it cannot express Foldkit event handlers.

Its handler-free attributes can be reused under any Message universe.

Inside a live view, use that view's `h`, not `inertHtml`.

"Inert" means inert to Foldkit dispatch — not necessarily inert to the browser.
Raw DOM attributes can still cause native/browser behavior.

## 4. Event handling

Foldkit event attributes report Messages rather than mutating Model directly.

### Click

A simple click accepts the Message itself:

```ts
h.OnClick(
  Message.ClickedIncrement()
)
```

There is no callback such as:

```ts
() => {
  model.count++
}
```

### Input

Input needs browser data, so the attribute accepts a pure translator:

```ts
h.input([
  h.Value(model.search),

  h.OnInput(
    value =>
      Message.UpdatedSearch({
        value
      })
  )
])
```

The function translates event data into a Message.

It still does not perform the consequence.

### Click behavior controls

`OnClick` can also control browser default and propagation:

```ts
h.OnClick(
  Message.ClickedExpandRow(),
  {
    defaultAction: "Prevent",
    propagation: "Stop"
  }
)
```

These are independent controls.

This is useful for a nested control such as an expand button inside a clickable
row.

## Complex event translators

Handlers may contain real pure logic.

Example:

```ts
const searchKeyMessage = (
  key: string
): Option.Option<Message> =>
  Match.value(key).pipe(
    Match.when(
      "Enter",
      () =>
        Option.some(
          Message.PressedSearchKey({
            key
          })
        )
    ),

    Match.when(
      "Escape",
      () =>
        Option.some(
          Message.PressedSearchKey({
            key
          })
        )
    ),

    Match.orElse(
      () => Option.none()
    )
  )
```

Then:

```ts
h.OnKeyDownPreventDefault(
  searchKeyMessage
)
```

For this attribute:

```text
Some(message)
  → preventDefault
  → dispatch Message

None
  → leave browser default alone
  → dispatch nothing
```

This lets a composite widget claim only the keys it owns.

Related APIs include:

```ts
OnKeyDownSelf
OnKeyDownSelfPreventDefault
```

which ignore keydowns bubbling from descendants.

## Focus regions

Use:

```ts
h.OnFocusEnter(...)
h.OnFocusLeave(...)
```

on a common ancestor when multiple descendants share one focus state.

Foldkit dispatches only when focus crosses the ancestor's boundary.

Moving between descendants does not generate leave/re-enter messages.

Example use:

```text
editor
+
formatting toolbar
```

as one focus region.

If focus only affects presentation, prefer CSS:

```css
:focus-within
```

rather than adding Model state.

## Browser-event side effects

Most side effects belong in:

- Commands
- Subscriptions
- Mounts

after the event returns.

Some browser operations must happen synchronously during the originating event,
such as:

- `preventDefault`
- iOS focus needed to open the software keyboard
- reading/writing clipboard payload during paste/copy/cut

Foldkit provides narrow declarative attributes for those browser constraints.

Examples include:

```ts
OnKeyDownPreventDefault
OnPastePreventDefault
OnCopyText
OnCutText
OnBeforeInputPreventDefault
OnCancelPreventDefault
```

and `OnClick` options:

```ts
defaultAction
propagation
focusSelector
```

These are not a general escape hatch for arbitrary effects.

If work can wait until after the event, return a Message and let update return a
Command.

## Trusted/raw HTML warning

The current View docs explicitly call out several trusted sinks:

```ts
h.InnerHTML
h.Srcdoc
h.Attribute(...)
```

and raw content inside:

```html
<script>
<style>
```

These are not sanitization APIs.

Do not pass user input, URL params, or untrusted API data into raw HTML/script
sinks.

Typed URL attributes such as:

```ts
h.Href
h.Src
h.Action
h.Formaction
```

block classic `javascript:` / `vbscript:` scheme injection, but that does not
make arbitrary script/iframe sources trusted.

Prefer structured `h.*` elements for untrusted content.

## 5. Child view boundaries

A child Submodel defines its own view:

```ts
export const childView =
  Submodel.defineView<
    ChildModel,
    ChildMessage
  >((model, h) =>
    h.button(
      [
        h.OnClick(
          ChildMessage.ClickedIncrement()
        )
      ],
      [String(model.count)]
    )
  )
```

That `h` is:

```ts
HtmlBuilder<ChildMessage>
```

The parent embeds it:

```ts
h.submodel({
  slotId: "child-counter",

  model:
    model.child,

  view:
    childView,

  toParentMessage:
    message =>
      Message.GotChildMessage({
        message
      })
})
```

The parent builder is:

```ts
HtmlBuilder<Message>
```

and `toParentMessage` explicitly maps:

```text
ChildMessage
→ Parent Message
```

The child stays decoupled from the parent.

### `slotId`

The slot ID must be unique inside the current parent boundary.

For a list, use a stable Model identifier:

```ts
entry.id
```

not the array index.

If the same child appears in two DOM positions, each placement needs its own
slot ID.

## ViewInputs

`Submodel.defineView` has an optional third type parameter for per-render parent
data:

```ts
Submodel.defineView<
  ChildModel,
  ChildMessage,
  ViewInputs
>(
  (
    model,
    viewInputs,
    h
  ) => ...
)
```

The parent supplies:

```ts
h.submodel({
  ...,
  viewInputs: {
    ...
  }
})
```

Top-level function values in `viewInputs` are automatically scoped to the
parent boundary.

Do not hide function callbacks deeper inside nested `viewInputs` objects;
Foldkit rejects that at view-build time because the dispatch boundary would be
ambiguous.

## Keys

For mapped DOM list items use:

```ts
h.keyed("li")(
  item.id,
  attributes,
  children
)
```

Use a stable Model identifier.

Do not use:

```ts
array index
```

as the key.

Do not key conditional branches. Foldkit gives named view-function output its
own identity; extract branches into separate view helpers when a same-tag branch
switch must reset DOM state.

## Real APIs used in the demo

- `Document`
- `Html`
- `HtmlBuilder`
- `inertHtml`
- `h.OnClick`
- `h.OnInput`
- `h.OnKeyDownPreventDefault`
- `h.Value`
- `h.submodel`
- `Submodel.defineView`
- `defineMessageUnion`
- `Message.match`
- `evo`
- Effect `Option`
- Effect `Match`
- Effect `Schema`

## Core sequence

You now have:

```text
Model
→ Messages
→ Update
→ View
```

That completes the pure application loop.

The next Foldkit core page is:

```text
Commands
```

which is where one-shot Effects leave the pure update loop and run under the
runtime.
