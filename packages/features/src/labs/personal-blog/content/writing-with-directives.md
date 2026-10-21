The plugin accepts a fixed vocabulary. Anything outside it stops the build,
which means a page can never render a construct the views do not handle.

## What is in the vocabulary

Headings, paragraphs, emphasis, links, inline code, code blocks, ordered and
unordered lists, blockquotes, thematic breaks, tables, and directives. That is
the whole set.

1. Block directives open with two colons and take attributes in braces
2. Container directives open with three and wrap markdown of their own
3. Both are checked against the schemas passed to the plugin

| Construct           | Syntax            | Renders through    |
| :------------------ | :---------------- | :----------------- |
| Block directive     | `::Name{key=...}` | The islands record |
| Container directive | `:::Name` … `:::` | The islands record |
| Everything else     | Ordinary markdown | The views record   |

## Attributes are decoded, not trusted

Each island declares a Schema for its attributes. The plugin checks every
directive against it during the build, and `islandsFor` decodes them again
before the view runs. A misspelled attribute is a build failure rather than an
`undefined` reaching a template.

::Counter{label="The same counter, in a second slot"}

This is the counter from the other post. The occurrence index gives each
directive its own slot id, but both slots read one Submodel, so the two move
together. Rendering the same state twice is a choice the page makes, not
something the island imposes.

:::Note
A container directive with no attributes still declares an empty Schema. That
is what makes it a member of the vocabulary rather than an unknown name.
:::

---

Everything on this page went through the same fold as the navigation above it.
