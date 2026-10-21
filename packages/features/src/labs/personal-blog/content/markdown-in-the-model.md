The words you are reading live in a markdown file. At build time a Vite plugin
from `@foldkit/markdown` parses that file, checks it against a Schema, and
emits a typed tree of blocks. The view folds the tree into real Foldkit Html.

## Three things at once

- Writing in plain markdown, with nothing between the author and the words
- Real Foldkit views, so DevTools and time travel keep working
- A build that fails loudly when a file uses syntax the site does not support

The last one is the interesting one. The vocabulary is a contract. Write a
footnote and the build stops with the file and the line, rather than quietly
emitting an empty element.

## The fold

Rendering is one pure function from document to Html. Every node type has an
unstyled semantic default, and this site overrides the ones it wants to dress
up:

```ts
const proseView = (
    document: Markdown.MarkdownDocument,
    islands: Markdown.Islands
): Html =>
    ih.div(
        [ih.Class("space-y-5")],
        Markdown.viewBlocks(document, { islands, views: blogViews })
    )
```

Note the builder: prose is inert, so it is built with `inertHtml` rather than
`h`. Nothing in a paragraph dispatches a Message.

## Proof that it is alive

Markdown is data here, so a post can reserve space for something that lives in
the Model. This counter is a real Submodel nestled between two paragraphs:

::Counter{label="Clicks while reading this post"}

Navigate to the other post and back, and the count survives, because it was
never owned by the page. It is a field on the component Model like any other.

:::Note
Islands can wrap markdown too. This callout is a container directive, and
_this_ emphasis renders through the same fold as everything else.
:::

> A blog post that can hold live components is an application wearing prose.

That is the whole trick.
