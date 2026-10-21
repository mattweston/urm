import { Option, Record } from "effect"
import { inertHtml as h } from "foldkit/html"

import type { Views } from "@foldkit/markdown"

const titleAttributes = (maybeTitle: Option.Option<string>) =>
    Option.match(maybeTitle, {
        onNone: () => [],
        onSome: (title) => [h.Title(title)],
    })

export const documentationMarkdownViews = (
    highlighted_code: Readonly<Record<string, string>>
): Partial<Views> => ({
    Link: ({ url, maybeTitle }, content) =>
        h.a(
            [
                h.Href(url),
                h.Class("font-medium underline underline-offset-2"),
                ...titleAttributes(maybeTitle),
            ],
            content
        ),
    CodeBlock: ({ value }) =>
        Option.match(Record.get(highlighted_code, value), {
            onNone: () =>
                h.pre(
                    [h.Class("documentation-code-block")],
                    [h.code([], [value])]
                ),
            onSome: (html) =>
                h.div([
                    h.Class("documentation-code-block documentation-shiki"),
                    h.InnerHTML(html),
                ]),
        }),
    Table: (_table, headerRow, bodyRows) =>
        h.div(
            [h.Class("documentation-table-wrapper")],
            [h.table([], [h.thead([], [headerRow]), h.tbody([], bodyRows)])]
        ),
})
