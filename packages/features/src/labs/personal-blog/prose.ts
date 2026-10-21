import clsx from "clsx"
import { Match as M, Option, Record } from "effect"
import { inertHtml as ih, type Html } from "foldkit/html"

import * as Markdown from "@foldkit/markdown"

import type { HighlightedCode } from "./content.ts"

// Prose dispatches nothing, so it is built with inertHtml. The builder is the
// proof: a paragraph physically cannot carry an event handler.
const headingView = (
    heading: Markdown.Heading,
    content: Markdown.InlineContent
): Html =>
    M.value(heading.level).pipe(
        M.when(1, () =>
            ih.h1([ih.Class("text-3xl font-bold text-foreground")], content)
        ),
        M.when(2, () =>
            ih.h2(
                [ih.Class("mt-10 text-2xl font-semibold text-foreground")],
                content
            )
        ),
        M.when(3, () =>
            ih.h3(
                [ih.Class("mt-8 text-xl font-semibold text-foreground")],
                content
            )
        ),
        M.when(4, () =>
            ih.h4(
                [ih.Class("mt-6 text-lg font-semibold text-foreground")],
                content
            )
        ),
        M.when(5, () =>
            ih.h5([ih.Class("mt-6 font-semibold text-foreground")], content)
        ),
        M.when(6, () =>
            ih.h6(
                [ih.Class("mt-6 text-sm font-semibold text-foreground")],
                content
            )
        ),
        M.exhaustive
    )

const languageChip = (codeBlock: Markdown.CodeBlock): ReadonlyArray<Html> =>
    Option.match(codeBlock.maybeLanguage, {
        onNone: () => [],
        onSome: (language) => [
            ih.keyed("div")(
                "Language",
                [
                    ih.Class(
                        "border-b-(length:--surface-border-width) border-border px-4 py-1.5 font-mono text-xs text-muted-foreground"
                    ),
                ],
                [language]
            ),
        ],
    })

const plainCodeView = (codeBlock: Markdown.CodeBlock): Html =>
    ih.pre(
        [ih.Class("overflow-x-auto p-4")],
        [
            ih.code(
                [ih.Class("font-mono text-sm text-foreground")],
                [codeBlock.value]
            ),
        ]
    )

// The one place the prose is not built node by node. Shiki already produced a
// pre and a span per token at build time, so re-deriving that tree here would
// buy nothing: the string goes in whole. It is build output, never user input.
const highlightedCodeView = (html: string): Html => ih.div([ih.InnerHTML(html)])

const codeBlockView = (
    highlightedCode: HighlightedCode,
    codeBlock: Markdown.CodeBlock
): Html => {
    const maybeHighlighted = Record.get(highlightedCode, codeBlock.value)

    return ih.div(
        [
            ih.Class(
                clsx(
                    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-surface)]",
                    {
                        // Shiki's own pre carries the theme background, so the
                        // container only supplies one when the fence fell back to
                        // plain text.
                        "bg-muted": Option.isNone(maybeHighlighted),
                    }
                )
            ),
        ],
        [
            ...languageChip(codeBlock),
            Option.match(maybeHighlighted, {
                onNone: () => plainCodeView(codeBlock),
                onSome: highlightedCodeView,
            }),
        ]
    )
}

const listView = (list: Markdown.List, items: ReadonlyArray<Html>): Html => {
    const startAttributes = Option.match(list.maybeStartNumber, {
        onNone: () => [],
        onSome: (startNumber) => [ih.Start(startNumber)],
    })

    if (list.isOrdered) {
        return ih.ol(
            [...startAttributes, ih.Class("list-decimal space-y-1 pl-6")],
            items
        )
    } else {
        return ih.ul([ih.Class("list-disc space-y-1 pl-6")], items)
    }
}

const alignmentClass = (alignment: Markdown.Alignment): string =>
    M.value(alignment).pipe(
        M.when("Right", () => "text-right"),
        M.when("Center", () => "text-center"),
        M.orElse(() => "text-left")
    )

const tableCellView = (
    _tableCell: Markdown.TableCell,
    content: Markdown.InlineContent,
    alignment: Markdown.Alignment,
    isHeader: boolean
): Html => {
    const cellClass = `px-3 py-2 ${alignmentClass(alignment)}`

    if (isHeader) {
        return ih.th(
            [ih.Class(`${cellClass} font-semibold text-foreground`)],
            content
        )
    } else {
        return ih.td([ih.Class(`${cellClass} text-muted-foreground`)], content)
    }
}

// A factory rather than a constant: CodeBlock has to close over the highlight
// map for the document being rendered, and the fold hands its views nothing but
// the node.
export const blogViews = (
    highlightedCode: HighlightedCode
): Markdown.Views => ({
    ...Markdown.defaultViews,

    Heading: headingView,

    Paragraph: (_paragraph, content) =>
        ih.p([ih.Class("leading-relaxed text-muted-foreground")], content),

    Link: (link, content) =>
        ih.a(
            [
                ih.Href(link.url),
                ih.Class(
                    "text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground"
                ),
            ],
            content
        ),

    InlineCode: (inlineCode) =>
        ih.code(
            [
                ih.Class(
                    "rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground"
                ),
            ],
            [inlineCode.value]
        ),

    CodeBlock: (codeBlock) => codeBlockView(highlightedCode, codeBlock),

    List: listView,

    ListItem: (_listItem, blocks) =>
        ih.li([ih.Class("leading-relaxed text-muted-foreground")], blocks),

    Blockquote: (_blockquote, blocks) =>
        ih.blockquote(
            [
                ih.Class(
                    "space-y-4 border-l-4 border-border pl-4 text-muted-foreground italic"
                ),
            ],
            blocks
        ),

    ThematicBreak: () => ih.hr([ih.Class("my-8 border-border")]),

    Table: (_table, headerRow, bodyRows) =>
        ih.div(
            [ih.Class("overflow-x-auto")],
            [
                ih.table(
                    [ih.Class("w-full border-collapse text-sm")],
                    [ih.thead([], [headerRow]), ih.tbody([], bodyRows)]
                ),
            ]
        ),

    TableRow: (_tableRow, cells) =>
        ih.tr(
            [
                ih.Class(
                    "border-b-(length:--surface-border-width) border-border"
                ),
            ],
            cells
        ),

    TableCell: tableCellView,
})

export const proseView = (
    document: Markdown.MarkdownDocument,
    highlightedCode: HighlightedCode,
    islands: Markdown.Islands
): Html =>
    ih.div(
        [ih.Class("space-y-5")],
        Markdown.viewBlocks(document, {
            islands,
            views: blogViews(highlightedCode),
        })
    )
